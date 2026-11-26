// Reads live data from the repository cache: opt out of React Compiler memoisation so updates show.
'use no memo';

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { PostCard } from '@/components/post-card';
import { Text } from '@/components/text';
import {
  addComment,
  type CommentRow,
  deleteComment,
  getComments,
  getPost,
  getReplies,
  isPostLoaded,
  loadMoreComments,
  loadMoreReplies,
  refreshPostDetail,
} from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { timeAgo } from '@/lib/format';
import { deletePost, updateMyProfile } from '@/data/manage';
import { confirm, notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

type C = CommentRow;

/** Post + comments with one level of replies (SCHEMA_PHASE1 section 4.6). */
export default function PostDetail() {
  useStoreVersion();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, requireLogin } = useSession();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<C | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [refreshing, setRefreshing] = useState(false);
  // PRD §7: comments refresh when the post opens and on pull-to-refresh (no live stream)
  useEffect(() => {
    refreshPostDetail(id);
  }, [id]);
  const pullToRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshPostDetail(id);
    } finally {
      setRefreshing(false);
    }
  };
  const post = getPost(id);
  if (!post && !isPostLoaded(id)) return <View style={{ flex: 1, backgroundColor: c.background }} />;
  if (!post) return <EmptyState ios="lock" android="lock" title="Post not available" body="It may be for club members only, or still in review." />;
  const { comments, hasMore } = getComments(id);
  const isMod = !!user?.platformRoles.some((r) => r === 'moderator' || r === 'basky_admin' || r === 'super_admin');

  const startReply = (cm: C) =>
    requireLogin(() => {
      setReplyTo(cm);
      setText(cm.userId !== user!.userId && cm.user ? `@${cm.user.name} ` : '');
      input.current?.focus();
    });

  const send = () =>
    requireLogin(() => {
      if (!text.trim()) return;
      const content = text.trim();
      const target = replyTo;
      setText('');
      setReplyTo(null);
      addComment(id, user!.userId, content, target ?? undefined)
        .then(() => target && setOpen((o) => ({ ...o, [target.parentId ?? target.id]: true })))
        .catch((e) => {
          setText(content);
          notify("Couldn't post the comment", errorMessage(e));
        });
    });

  const remove = (cm: C) =>
    confirm('Delete comment?', 'Replies stay, and it will show as “Comment removed”.', 'Delete', () => deleteComment(id, cm).catch((e) => notify("Couldn't delete", errorMessage(e))));

  const moreLink = (label: string, onPress: () => void, indent: number) => (
    <Pressable onPress={() => onPress()} style={{ paddingLeft: indent, paddingVertical: space.sm }}>
      <Text variant="caption" color="accentText" style={{ fontFamily: fonts.bodyBold }}>{label}</Text>
    </Pressable>
  );

  /** Replies load the first time a thread is opened. */
  const replies = (cm: C) => {
    const r = getReplies(id, cm.id);
    if (!r.loaded && r.replies.length === 0) {
      return <Text variant="caption" color="textMuted" style={{ paddingLeft: space.lg + 46, paddingVertical: 4 }}>Loading replies…</Text>;
    }
    return (
      <>
        {r.replies.map((x) => row(x, true))}
        {r.hasMore && moreLink('View more replies', () => loadMoreReplies(id, cm.id), space.lg + 46)}
      </>
    );
  };

  const row = (cm: C, reply: boolean) => (
    <View key={cm.id} style={{ flexDirection: 'row', gap: space.md, paddingLeft: reply ? space.lg + 46 : space.lg, paddingRight: space.lg, paddingVertical: space.sm }}>
      <Avatar name={cm.deletedAt ? '?' : cm.user?.name ?? '?'} size={reply ? 28 : 34} />
      <View style={{ flex: 1 }}>
        {cm.deletedAt ? (
          <Text variant="caption" color="textMuted" style={{ fontStyle: 'italic', paddingTop: 6 }}>Comment removed</Text>
        ) : (
          <>
            <Text variant="caption">
              <Text variant="caption" style={{ fontFamily: fonts.bodyBold }}>{cm.user?.name}</Text>
              <Text variant="caption" color="textMuted">  {timeAgo(cm.createdAt)}</Text>
            </Text>
            <Text>{cm.content}</Text>
            <View style={{ flexDirection: 'row', gap: space.lg, marginTop: 4 }}>
              <Text variant="caption" color="textMuted" style={{ fontFamily: fonts.bodyBold }} onPress={() => startReply(cm)}>Reply</Text>
              {(user?.userId === cm.userId || user?.userId === post.authorId || isMod) && <Text variant="caption" color="textMuted" style={{ fontFamily: fonts.bodyBold }} onPress={() => remove(cm)}>Delete</Text>}
              {!!user && user.userId !== cm.userId && <Text variant="caption" color="textMuted" style={{ fontFamily: fonts.bodyBold }} onPress={() => router.push({ pathname: '/report', params: { type: 'comment', id: cm.id } })}>Report</Text>}
            </View>
          </>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xl }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={c.accent} colors={[c.accent]} />}
      >
        <PostCard post={post} />
        {!!user && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.sm }}>
            {post.authorId === user.userId && post.moderationStatus === 'published' && post.visibility !== 'members' && (
              <Text variant="caption" color="accentText" style={{ fontFamily: fonts.bodyBold }} onPress={() => updateMyProfile(user.userId, { pinnedPostId: user.pinnedPostId === post.postId ? null : post.postId }).then(() => notify(user.pinnedPostId === post.postId ? 'Unpinned' : 'Pinned to your profile')).catch((e) => notify('Error', errorMessage(e)))}>
                {user.pinnedPostId === post.postId ? 'Unpin from profile' : 'Pin to profile'}
              </Text>
            )}
            {(post.authorId === user.userId || isMod) && (
              <Text variant="caption" style={{ fontFamily: fonts.bodyBold, color: c.live }} onPress={() => confirm('Delete this post?', 'It disappears for everyone.', 'Delete', () => deletePost(post.postId).then(() => (router.canGoBack() ? router.back() : router.replace('/'))).catch((e) => notify('Error', errorMessage(e))))}>
                Delete post
              </Text>
            )}
            {post.authorId !== user.userId && (
              <Text variant="caption" color="textMuted" style={{ fontFamily: fonts.bodyBold }} onPress={() => router.push({ pathname: '/report', params: { type: 'post', id: post.postId } })}>Report</Text>
            )}
          </View>
        )}
        <Text variant="subheading" style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>
          {post.commentCount ? `${post.commentCount} comments` : 'No comments yet'}
        </Text>
        {comments.map((cm) => (
          <View key={cm.id}>
            {row(cm, false)}
            {cm.replyCount > 0 && !open[cm.id] && (
              <Pressable onPress={() => setOpen((o) => ({ ...o, [cm.id]: true }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: space.lg + 46, paddingVertical: 4 }}>
                <View style={{ width: 24, height: 1, backgroundColor: c.textMuted }} />
                <Text variant="caption" color="textMuted" style={{ fontFamily: fonts.bodyBold }}>View {cm.replyCount} {cm.replyCount === 1 ? 'reply' : 'replies'}</Text>
              </Pressable>
            )}
            {open[cm.id] && replies(cm)}
          </View>
        ))}
        {hasMore && moreLink('Load more comments', () => loadMoreComments(id), space.lg)}
      </ScrollView>
      <View style={{ backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom + space.sm }}>
        {replyTo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.sm }}>
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>Replying to {replyTo.user?.name}</Text>
            <Pressable hitSlop={8} onPress={() => { setReplyTo(null); setText(''); }}>
              <Icon ios="xmark" android="close" size={12} color={c.textMuted} weight="bold" />
            </Pressable>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, paddingTop: space.sm }}>
          <Avatar name={user?.name ?? 'Guest'} size={32} />
          <TextInput
            ref={input}
            value={text}
            onChangeText={setText}
            onFocus={() => !user && requireLogin(() => {})}
            placeholder={user ? 'Add a comment…' : 'Log in to comment'}
            placeholderTextColor={c.textMuted}
            selectionColor={c.accent}
            style={{ flex: 1, height: 40, paddingHorizontal: space.md, borderRadius: radius.full, backgroundColor: c.fill, color: c.text, fontFamily: fonts.body, fontSize: 15 }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send comment" onPress={send} hitSlop={8} disabled={!text.trim()}>
            <Icon ios="arrow.up.circle.fill" android="send" size={30} color={text.trim() ? c.accent : c.textMuted} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

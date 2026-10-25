import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { PostCard } from '@/components/post-card';
import { Text } from '@/components/text';
import { addComment, deleteComment, getComments, getPost } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { PostComment, User } from '@/types/models';
import { fonts, radius, space, useTheme } from '@/theme';

type C = PostComment & { user?: User };

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
  const post = getPost(id);
  if (!post) return <EmptyState ios="lock" android="lock" title="Post not available" body="It may be for club members only, or still in review." />;
  const comments = getComments(id);

  const startReply = (cm: C) =>
    requireLogin(() => {
      setReplyTo(cm);
      setText(cm.userId !== user!.userId && cm.user ? `@${cm.user.name} ` : '');
      input.current?.focus();
    });

  const send = () =>
    requireLogin(() => {
      if (!text.trim()) return;
      addComment(id, user!.userId, text.trim(), replyTo ?? undefined);
      if (replyTo) setOpen((o) => ({ ...o, [replyTo.parentId ?? replyTo.id]: true }));
      setText('');
      setReplyTo(null);
    });

  const remove = (cm: C) =>
    Alert.alert('Delete comment?', 'Replies stay, and it will show as “Comment removed”.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteComment(cm.id) },
    ]);

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
              {user?.userId === cm.userId && <Text variant="caption" color="textMuted" style={{ fontFamily: fonts.bodyBold }} onPress={() => remove(cm)}>Delete</Text>}
            </View>
          </>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        <PostCard post={post} />
        <Text variant="subheading" style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>
          {post.commentCount ? `${post.commentCount} comments` : 'No comments yet'}
        </Text>
        {comments.map((cm) => (
          <View key={cm.id}>
            {row(cm, false)}
            {cm.replies.length > 0 && !open[cm.id] && (
              <Pressable onPress={() => setOpen((o) => ({ ...o, [cm.id]: true }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: space.lg + 46, paddingVertical: 4 }}>
                <View style={{ width: 24, height: 1, backgroundColor: c.textMuted }} />
                <Text variant="caption" color="textMuted" style={{ fontFamily: fonts.bodyBold }}>View {cm.replies.length} {cm.replies.length === 1 ? 'reply' : 'replies'}</Text>
              </Pressable>
            )}
            {open[cm.id] && cm.replies.map((r) => row(r, true))}
          </View>
        ))}
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
          <Pressable onPress={send} hitSlop={8} disabled={!text.trim()}>
            <Icon ios="arrow.up.circle.fill" android="send" size={30} color={text.trim() ? c.accent : c.textMuted} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

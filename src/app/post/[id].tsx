import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { PostCard } from '@/components/post-card';
import { Text } from '@/components/text';
import { addComment, getComments, getPost } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

export default function PostDetail() {
  useStoreVersion();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, requireLogin } = useSession();
  const [text, setText] = useState('');
  const post = getPost(id);
  if (!post) return <EmptyState ios="questionmark" android="help" title="Post not found" />;
  const comments = getComments(id);

  const send = () =>
    requireLogin(() => {
      if (!text.trim()) return;
      addComment(id, user!.userId, text.trim());
      setText('');
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <PostCard post={post} />
        <Text variant="subheading" style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>
          {comments.length ? `${comments.length} comments` : 'No comments yet'}
        </Text>
        {comments.map((cm) => (
          <View key={cm.id} style={{ flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
            <Avatar name={cm.user?.name ?? '?'} size={34} />
            <View style={{ flex: 1 }}>
              <Text variant="caption"><Text variant="caption" style={{ fontFamily: fonts.bodyBold }}>{cm.user?.name}</Text>  <Text variant="caption" color="textMuted">{timeAgo(cm.createdAt)}</Text></Text>
              <Text>{cm.content}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, paddingBottom: insets.bottom + space.sm, backgroundColor: c.card, borderTopWidth: 0.5, borderTopColor: c.line }}>
        <Avatar name={user?.name ?? 'Guest'} size={32} />
        <TextInput
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
    </KeyboardAvoidingView>
  );
}

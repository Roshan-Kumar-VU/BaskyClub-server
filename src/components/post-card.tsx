import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import type { PostView } from '@/data/repo';
import { compact, timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { OfficialBadge, Tag } from './badge';
import { ClubBadge } from './club-badges';
import { Icon } from './icon';
import { Photo } from './photo';
import { Text } from './text';

/**
 * Feed post. Double-tap the photo to like (big heart), tap the bubble to open
 * comments. Visitors get the login prompt for member actions.
 */
export function PostCard({ post }: { post: PostView }) {
  const { c } = useTheme();
  const { requireLogin } = useSession();
  const [liked, setLiked] = useState(false);
  const pop = useSharedValue(1);
  const big = useSharedValue(0);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const bigHeart = useAnimatedStyle(() => ({ opacity: big.value, transform: [{ scale: 0.6 + big.value * 0.6 }] }));

  const official = post.type === 'official';
  const name = official ? post.organization?.name ?? 'Association' : post.author?.name ?? 'Member';
  const sub = official ? 'Official update' : post.club?.clubName ?? 'Personal post';
  const media = post.media[0];

  const like = (force?: boolean) =>
    requireLogin(() => {
      if (force && liked) return;
      Haptics.impactAsync(liked && !force ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      pop.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 500 }), withSpring(1, { damping: 10 }));
      setLiked((v) => (force ? true : !v));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      big.value = withSequence(withSpring(1, { damping: 8 }), withDelay(400, withTiming(0, { duration: 200 })));
      runOnJS(like)(true);
    });

  const openAuthor = () => {
    if (official && post.organization) router.push({ pathname: '/association/[id]', params: { id: post.organization.id } });
    else if (post.author) router.push({ pathname: '/user/[id]', params: { id: post.author.userId } });
  };
  const openPost = () => router.push({ pathname: '/post/[id]', params: { id: post.postId } });

  return (
    <View style={{ backgroundColor: c.card, marginBottom: space.sm }}>
      <Pressable onPress={openAuthor} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.lg }}>
        <Avatar name={official ? post.organization?.shortName ?? name : name} size={40} square={official} />
        <View style={{ flex: 1 }}>
          <Text variant="subheading" numberOfLines={1}>{name}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {sub} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        {official && post.isPinned && <OfficialBadge />}
        {!official && post.club && <ClubBadge category={post.club.category} verified={post.club.isVerified} small />}
      </Pressable>

      {post.status === 'pending_review' && (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, flexDirection: 'row' }}>
          <Tag label="In review by the BaskyCLub team" />
        </View>
      )}

      {!!post.content && (
        <Pressable onPress={openPost}>
          <Text style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: media ? space.md : 0 }}>{post.content}</Text>
        </Pressable>
      )}

      {media && (
        <GestureDetector gesture={doubleTap}>
          <View>
            <Photo uri={media.url} seed={post.club?.clubId ?? post.postId} aspectRatio={media.aspectRatio} />
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }, bigHeart]}>
              <Icon ios="heart.fill" android="favorite" size={96} color="#fff" />
            </Animated.View>
          </View>
        </GestureDetector>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, paddingVertical: space.xs }}>
        <Pressable onPress={() => like()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: space.sm }}>
          <Animated.View style={heart}>
            <Icon ios={liked ? 'heart.fill' : 'heart'} android={liked ? 'favorite' : 'favorite_border'} color={liked ? c.accent : c.text} />
          </Animated.View>
          <Text variant="caption" tabular color="textSecondary">{compact(post.likeCount + (liked ? 1 : 0))}</Text>
        </Pressable>
        <Pressable onPress={openPost} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: space.sm }}>
          <Icon ios="bubble.right" android="chat_bubble_outline" color={c.text} />
          <Text variant="caption" tabular color="textSecondary">{compact(post.commentCount)}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable hitSlop={8} style={{ padding: space.sm }} onPress={() => Share.share({ message: `${name} on BaskyCLub: ${post.content ?? ''}` })}>
          <Icon ios="paperplane" android="send" color={c.text} />
        </Pressable>
      </View>
    </View>
  );
}

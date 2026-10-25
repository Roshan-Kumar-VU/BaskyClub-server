import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, Share, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { type PostView, togglePostLike } from '@/data/repo';
import { compact, timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { fonts, space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { Tag } from './badge';
import { CreatorBadge } from './club-badges';
import { Icon } from './icon';
import { MediaCarousel } from './media-carousel';
import { Text } from './text';
import { YouTubeCard } from './youtube-card';

const visibilityLabel = { members: 'Members only', club_page: 'Club page only', public: undefined } as const;

/**
 * Feed post, edge to edge with a court line under it. Posts linked from an
 * association announcement get the paint-blue Official band (#75).
 * Double-tap a photo to like; likes are one per person (counted on the post).
 */
export function PostCard({ post }: { post: PostView }) {
  const { c } = useTheme();
  const { user, requireLogin } = useSession();
  const pop = useSharedValue(1);
  const big = useSharedValue(0);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const bigHeart = useAnimatedStyle(() => ({ opacity: big.value, transform: [{ scale: 0.6 + big.value * 0.6 }] }));

  const byOrg = !!post.organization;
  const name = byOrg ? post.organization!.name : post.author?.name ?? 'Member';
  const sub = byOrg ? `Posted by ${post.author?.name ?? 'the association'}` : post.club?.name ?? 'Personal post';
  const images = post.media.filter((m) => m.mediaType === 'image');
  const video = post.media.find((m) => m.mediaType === 'youtube');
  const vis = visibilityLabel[post.visibility];

  const like = (onlyAdd?: boolean) =>
    requireLogin(() => {
      if (onlyAdd && post.liked) return;
      Haptics.impactAsync(post.liked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      pop.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 500 }), withSpring(1, { damping: 10 }));
      togglePostLike(post.postId, user!.userId);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      big.value = withSequence(withSpring(1, { damping: 8 }), withDelay(400, withTiming(0, { duration: 200 })));
      runOnJS(like)(true);
    });

  const openAuthor = () => {
    if (byOrg) router.push({ pathname: '/association/[id]', params: { id: post.organization!.id } });
    else if (post.author) router.push({ pathname: '/user/[id]', params: { id: post.author.userId } });
  };
  const openPost = () => router.push({ pathname: '/post/[id]', params: { id: post.postId } });

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: space.xs }}>
      {post.official && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg, paddingVertical: 6, backgroundColor: c.official }}>
          <Icon ios="pin.fill" android="push_pin" size={11} color="#fff" />
          <Text variant="micro" style={{ color: '#fff' }}>Official announcement</Text>
        </View>
      )}
      <Pressable onPress={openAuthor} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.lg }}>
        <Avatar name={byOrg ? post.organization!.shortName ?? name : name} size={38} square={byOrg} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Text>
            {!byOrg && post.authorIsCreator && <CreatorBadge />}
          </View>
          <Text variant="caption" color="textMuted" numberOfLines={1}>{sub}</Text>
        </View>
        <Text variant="caption" color="textMuted">{timeAgo(post.createdAt)}</Text>
      </Pressable>

      {(post.moderationStatus === 'in_review' || vis) && (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, flexDirection: 'row', gap: space.sm }}>
          {post.moderationStatus === 'in_review' && <Tag label="In review by the BaskyCLub team" />}
          {vis && <Tag label={vis} />}
        </View>
      )}

      {!!post.content && (
        <Pressable onPress={openPost}>
          <Text style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: images.length || video ? space.md : space.sm }}>{post.content}</Text>
        </Pressable>
      )}

      {images.length > 0 && (
        <GestureDetector gesture={doubleTap}>
          <View>
            <MediaCarousel media={images} seed={post.club?.clubId ?? post.postId} />
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }, bigHeart]}>
              <Icon ios="heart.fill" android="favorite" size={96} color="#fff" />
            </Animated.View>
          </View>
        </GestureDetector>
      )}
      {video?.url && <YouTubeCard url={video.url} />}

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, paddingTop: space.xs }}>
        <Pressable onPress={() => like()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: space.sm }}>
          <Animated.View style={heart}>
            <Icon ios={post.liked ? 'heart.fill' : 'heart'} android={post.liked ? 'favorite' : 'favorite_border'} size={24} color={post.liked ? c.accent : c.text} />
          </Animated.View>
          <Text tabular style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.text }}>{compact(post.likeCount)}</Text>
        </Pressable>
        <Pressable onPress={openPost} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: space.sm }}>
          <Icon ios="bubble.right" android="chat_bubble_outline" size={23} color={c.text} />
          <Text tabular style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.text }}>{compact(post.commentCount)}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {post.visibility === 'public' && (
          <Pressable hitSlop={8} style={{ padding: space.sm }} onPress={() => Share.share({ message: `${name} on BaskyCLub: ${post.content ?? ''}` })}>
            <Icon ios="paperplane" android="send" size={23} color={c.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

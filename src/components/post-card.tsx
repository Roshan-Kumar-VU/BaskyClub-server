import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import type { PostView } from '@/data/repositories';
import { compact, timeAgo } from '@/lib/format';
import { space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { OfficialBadge, VerifiedMark } from './badge';
import { CourtArt } from './court-art';
import { Icon } from './icon';
import { Text } from './text';

/** A feed post. Official federation posts get a blue accent and a pin. */
export function PostCard({ post }: { post: PostView }) {
  const { c } = useTheme();
  const [liked, setLiked] = useState(false);
  const pop = useSharedValue(1);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const official = post.type === 'official';
  const displayName = official ? post.organization?.name ?? 'Association' : post.author?.name ?? 'Member';
  const subtitle = official ? 'Official update' : post.club?.clubName;
  const media = post.media[0];

  const toggleLike = () => {
    Haptics.impactAsync(liked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    pop.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 500 }), withSpring(1, { damping: 10 }));
    setLiked((v) => !v);
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.lg }}>
      <Avatar name={official ? post.organization?.shortName ?? displayName : displayName} size={40} square={official} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>
            {displayName}
          </Text>
          {post.club?.isVerified && !official && <VerifiedMark size={13} />}
        </View>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {subtitle} · {timeAgo(post.createdAt)}
        </Text>
      </View>
      {official && post.isPinned && <OfficialBadge />}
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: c.card,
        marginBottom: space.sm,
        borderLeftWidth: official ? 3 : 0,
        borderLeftColor: c.official,
      }}>
      {post.author ? (
        <Link href={{ pathname: '/player/[id]', params: { id: post.author.userId } }} asChild>
          <Pressable>{header}</Pressable>
        </Link>
      ) : (
        header
      )}

      {!!post.content && (
        <Text style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: media ? space.md : 0 }}>{post.content}</Text>
      )}

      {media && <CourtArt seed={post.club?.clubId ?? post.postId} aspectRatio={media.aspectRatio} />}

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, paddingVertical: space.xs }}>
        <Pressable onPress={toggleLike} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: space.sm }}>
          <Animated.View style={heart}>
            <Icon ios={liked ? 'heart.fill' : 'heart'} android={liked ? 'favorite' : 'favorite_border'} color={liked ? c.accent : c.text} />
          </Animated.View>
          <Text variant="caption" tabular color="textSecondary">{compact(post.likeCount + (liked ? 1 : 0))}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: space.sm }}>
          <Icon ios="bubble.right" android="chat_bubble_outline" color={c.text} />
          <Text variant="caption" tabular color="textSecondary">{compact(post.commentCount)}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          hitSlop={8}
          style={{ padding: space.sm }}
          onPress={() => Share.share({ message: `${displayName} on BaskyClub: ${post.content ?? ''}` })}>
          <Icon ios="square.and.arrow.up" android="share" color={c.text} />
        </Pressable>
      </View>
    </View>
  );
}

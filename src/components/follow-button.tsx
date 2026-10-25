import * as Haptics from 'expo-haptics';

import { isFollowing, toggleFollow } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useSession } from '@/lib/session';
import type { Follow } from '@/types/models';

import { Button } from './button';

/** One-way follow for clubs, associations and people (#73). Visitors get the login prompt. */
export function FollowButton({ type, id, compact }: { type: Follow['targetType']; id: string; compact?: boolean }) {
  useStoreVersion();
  const { user, requireLogin } = useSession();
  const on = isFollowing(user?.userId, type, id);
  return (
    <Button
      compact={compact}
      kind={on ? 'secondary' : 'primary'}
      label={on ? 'Following' : 'Follow'}
      onPress={() =>
        requireLogin(() => {
          Haptics.selectionAsync();
          toggleFollow(user!.userId, type, id);
        })
      }
    />
  );
}

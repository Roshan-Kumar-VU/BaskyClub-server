'use no memo';

import { router } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { Card, Page, Row } from '@/components/form';
import { getBadges, getCases, getCreatorRequests, getPendingClubs, getPendingCourts } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { useSession } from '@/lib/session';

/** BaskyCLub team dashboard (#12, #43, #61). Super admins also manage roles. */
export default function Admin() {
  useStoreVersion();
  const { user } = useSession();
  const roles = user?.platformRoles ?? [];
  const team = roles.includes('basky_admin') || roles.includes('super_admin');
  if (!team) return <EmptyState ios="lock.fill" android="lock" title="BaskyCLub team only" />;
  const clubs = getPendingClubs().length;
  const courts = getPendingCourts().length;
  const cases = getCases('open').length;
  getBadges();

  return (
    <Page>
      <Card title="Waiting for you">
        <Row first label="Clubs to approve" value={String(clubs)} onPress={() => router.push('/admin/clubs')} />
        <Row label="Courts to approve" value={String(courts)} onPress={() => router.push('/admin/courts')} />
        <Row label="Review queue" value={String(cases)} onPress={() => router.push('/admin/moderation')} />
        <Row label="Creator requests" value={String(getCreatorRequests().length)} onPress={() => router.push('/admin/creators')} />
      </Card>
      <Card title="Manage">
        <Row first label="Associations" sub={roles.includes('super_admin') ? 'Create, publish, hand over, districts covered' : 'Publish, hand over, districts covered'} onPress={() => router.push('/admin/associations')} />
        <Row label="Badges" sub="Verified clubs and Creators" onPress={() => router.push('/admin/badges')} />
        <Row label="Users" sub="Find accounts; limit, suspend, restore or delete" onPress={() => router.push('/admin/users')} />
        {roles.includes('super_admin') && <Row label="BaskyCLub roles" sub="Super admins, Basky team, moderators" onPress={() => router.push('/admin/roles')} />}
        <Row label="Send an alert to everyone" onPress={() => router.push({ pathname: '/announce', params: { as: 'basky' } })} />
        {roles.includes('super_admin') && <Row label="Change history" onPress={() => router.push('/admin/history')} />}
      </Card>
    </Page>
  );
}

/**
 * Staff and admin actions: club management, association tools, moderation and
 * the super-admin dashboard. Reads are cached like repo.ts; every change refreshes
 * the data it touches. Rules live on the server (API_REFERENCE.md) — screens only
 * show what the server says this person can do.
 */
import { del, get, patch, post } from './api';
import { invalidate, read } from './cache';

const q = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

// ── Profile (#72) ─────────────────────────────────────────────────────────
export type ProfileEdit = Partial<{ name: string; bio: string | null; instagram: string | null; youtube: string | null; photoUrl: string | null; coverPhotoUrl: string | null; gender: 'male' | 'female' | 'other' | null; homeDistrictCode: string; pinnedPostId: string | null }>;

export async function updateMyProfile(me: string, edit: ProfileEdit) {
  await patch('/api/auth/me', edit);
  invalidate('me', `profile:${me}`, 'userposts:');
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await post('/api/auth/change-password', { currentPassword, newPassword });
}

export async function recover(phone: string, dateOfBirth: string) {
  return post<{ resetToken: string; name: string; expiresInMinutes: number }>('/api/auth/recover', { phone, dateOfBirth });
}

export async function resetPassword(token: string, newPassword: string) {
  await post('/api/auth/reset-password', { token, newPassword });
}

// ── Posts: delete, report, pin ────────────────────────────────────────────
export async function deletePost(postId: string) {
  await del(`/api/posts/${postId}`);
  invalidate('feed:', 'userposts:', 'club:posts:', 'org:posts:', 'profile:', `post:${postId}`);
}

export async function report(targetType: 'post' | 'comment' | 'user', targetId: string, reason: string) {
  await post('/api/reports', { targetType, targetId, reason });
}

// ── Moderation (#25, #41) ─────────────────────────────────────────────────
export type ModCase = {
  id: string; targetType: 'post' | 'comment' | 'user'; targetId: string; source: 'ai' | 'report' | 'no_club_review'; reason: string | null; createdAt: string;
  reportedBy: { id: string; name: string } | null;
  target: any;
};

export const getCases = (status: 'open' | 'approved' | 'removed' = 'open') =>
  read(`mod:cases:${status}`, async () => (await get<{ cases: ModCase[] }>(`/api/moderation/cases${q({ status })}`)).cases, [] as ModCase[]);

export async function decideCase(id: string, decision: 'approve' | 'remove', note?: string) {
  await post(`/api/moderation/cases/${id}/decide`, { decision, note });
  invalidate('mod:', 'feed:', 'userposts:', 'club:posts:', 'comments:');
}

// ── Clubs: register and manage ────────────────────────────────────────────
export async function registerClub(input: { name: string; kind: string; districtCode: string; description?: string; motto?: string; iPlay: boolean; primaryPosition?: string }) {
  const r = await post<{ id: string; status: string }>('/api/clubs', input);
  invalidate('profile:', 'me');
  return r;
}

export async function updateClub(clubId: string, edit: Record<string, unknown>) {
  await patch(`/api/clubs/${clubId}`, edit);
  invalidate(`club:detail:${clubId}`, 'clubs:');
}

export async function setMemberDetails(membershipId: string, clubId: string, edit: { isPlayer?: boolean; primaryPosition?: string | null; isCoach?: boolean; isReferee?: boolean }) {
  await patch(`/api/memberships/${membershipId}`, edit);
  invalidate(`club:members:${clubId}`, 'profile:');
}

export async function removeMember(membershipId: string, clubId: string) {
  await del(`/api/memberships/${membershipId}`);
  invalidate(`club:members:${clubId}`, `club:detail:${clubId}`);
}

export async function grantClubRole(clubId: string, userId: string, role: 'admin' | 'captain') {
  await post(`/api/clubs/${clubId}/roles`, { userId, role });
  invalidate(`club:detail:${clubId}`, `club:members:${clubId}`);
}

export async function endClubRole(roleId: string, clubId: string) {
  await del(`/api/club-roles/${roleId}`);
  invalidate(`club:detail:${clubId}`, `club:members:${clubId}`, 'me', 'profile:');
}

export async function transferClub(clubId: string, newOwnerUserId: string, keepAsAdmin: boolean) {
  await post(`/api/clubs/${clubId}/transfer-ownership`, { newOwnerUserId, keepAsAdmin });
  invalidate(`club:detail:${clubId}`, `club:members:${clubId}`, 'me', 'profile:');
}

export async function leaveClub(clubId: string) {
  await post(`/api/clubs/${clubId}/leave`);
  invalidate(`club:detail:${clubId}`, `club:members:${clubId}`, 'me', 'profile:', 'clubs:');
}

export type Timing = { dayOfWeek: number; isFullDay: boolean; morningStart?: string | null; morningEnd?: string | null; eveningStart?: string | null; eveningEnd?: string | null };

export async function setTimings(clubId: string, timings: Timing[]) {
  await (await import('./api')).api('PUT', `/api/clubs/${clubId}/timings`, { timings });
  invalidate(`club:detail:${clubId}`);
}

export const getClubTimings = (clubId: string) =>
  read(`club:timings:${clubId}`, async () => (await get<{ timings: Timing[] }>(`/api/clubs/${clubId}`)).timings, [] as Timing[]);

export type AffiliationRow = {
  id: string; status: 'pending' | 'active' | 'rejected' | 'ended'; startedBy: 'club' | 'association'; tnbaNumber: string | null; validFrom: string | null; validUntil: string | null; createdAt: string;
  club: { id: string; name: string; districtCode: string }; organization: { id: string; name: string; shortName: string | null; level: string }; requestedBy: { id: string; name: string } | null;
};

export const getClubAffiliations = (clubId: string) =>
  read(`club:affiliations:${clubId}`, async () => (await get<{ affiliations: AffiliationRow[] }>(`/api/clubs/${clubId}/affiliations`)).affiliations, [] as AffiliationRow[]);

export async function requestAffiliation(clubId: string, organizationId: string, tnbaNumber?: string) {
  await post(`/api/clubs/${clubId}/affiliations`, { organizationId, tnbaNumber: tnbaNumber || undefined });
  invalidate(`club:affiliations:${clubId}`);
}

export async function decideAffiliation(id: string, decision: 'approve' | 'reject', extra: { validUntil?: string; tnbaNumber?: string } = {}) {
  await post(`/api/affiliations/${id}/decide`, { decision, ...extra });
  invalidate('club:', 'org:', 'clubs:');
}

export async function endAffiliation(id: string) {
  await post(`/api/affiliations/${id}/end`);
  invalidate('club:', 'org:', 'clubs:');
}

// ── Associations (#59–#66) ────────────────────────────────────────────────
export async function updateOrg(orgId: string, edit: Record<string, unknown>) {
  await patch(`/api/associations/${orgId}`, edit);
  invalidate(`org:detail:${orgId}`, 'orgs', 'admin:orgs');
}

export type OrgMemberRow = { id: string; accessLevel: 'owner' | 'admin' | 'member'; fromAt: string; user: { id: string; name: string; photoUrl: string | null } };
export const getOrgMembers = (orgId: string) =>
  read(`org:members:${orgId}`, async () => (await get<{ members: OrgMemberRow[] }>(`/api/associations/${orgId}/members`)).members, [] as OrgMemberRow[]);

export async function grantOrgMember(orgId: string, userId: string, accessLevel: 'owner' | 'admin' | 'member') {
  await post(`/api/associations/${orgId}/members`, { userId, accessLevel });
  invalidate(`org:members:${orgId}`, `org:detail:${orgId}`);
}

export async function endOrgMember(rowId: string, orgId: string) {
  await del(`/api/organization-members/${rowId}`);
  invalidate(`org:members:${orgId}`, `org:detail:${orgId}`, 'me');
}

export type BearerRow = { id: string; name: string; designation: string; photoUrl: string | null; termFrom: string; termTo: string | null; userId: string | null; sortOrder: number; isCurrent: boolean };
export const getBearers = (orgId: string) =>
  read(`org:bearers:${orgId}`, async () => (await get<{ officeBearers: BearerRow[] }>(`/api/associations/${orgId}/office-bearers?past=1`)).officeBearers, [] as BearerRow[]);

export async function addBearer(orgId: string, b: { name: string; designation: string; termFrom: string; termTo?: string | null; userId?: string | null; sortOrder?: number }) {
  await post(`/api/associations/${orgId}/office-bearers`, b);
  invalidate(`org:bearers:${orgId}`, `org:detail:${orgId}`);
}

export async function updateBearer(id: string, orgId: string, edit: Record<string, unknown>) {
  await patch(`/api/office-bearers/${id}`, edit);
  invalidate(`org:bearers:${orgId}`, `org:detail:${orgId}`);
}

export async function deleteBearer(id: string, orgId: string) {
  await del(`/api/office-bearers/${id}`);
  invalidate(`org:bearers:${orgId}`, `org:detail:${orgId}`);
}

export async function addLegacy(orgId: string, r: { recordType: string; title: string; year?: number | null; body?: string | null; winner?: string | null; runnerUp?: string | null; media?: { mediaType: 'image' | 'youtube'; url: string }[] }) {
  await post(`/api/associations/${orgId}/legacy`, r);
  invalidate(`org:legacy:${orgId}`, `org:detail:${orgId}`);
}

export async function deleteLegacy(id: string, orgId: string) {
  await del(`/api/legacy/${id}`);
  invalidate(`org:legacy:${orgId}`, `org:detail:${orgId}`);
}

export const getOrgAffiliations = (orgId: string) =>
  read(`org:affiliations:${orgId}`, async () => (await get<{ affiliations: AffiliationRow[] }>(`/api/associations/${orgId}/affiliations`)).affiliations, [] as AffiliationRow[]);

export async function inviteClub(orgId: string, clubId: string) {
  await post(`/api/associations/${orgId}/affiliations`, { clubId });
  invalidate(`org:affiliations:${orgId}`);
}

export async function officialPost(orgId: string, content: string, youtubeUrl?: string) {
  await post('/api/posts', { organizationId: orgId, content, youtubeUrl: youtubeUrl || undefined });
  invalidate(`org:posts:${orgId}`, 'feed:');
}

// ── Announcements (#65, #75) ──────────────────────────────────────────────
export async function sendAnnouncement(input: { senderOrgId?: string; senderClubId?: string; audience: string; districtCode?: string; title: string; body: string; showInFeed: boolean }) {
  const r = await post<{ id: string; pushed: number }>('/api/announcements', input);
  invalidate('alerts', 'alerts:sent', 'feed:');
  return r;
}

export const getSentAlerts = () =>
  read('alerts:sent', async () => (await get<{ alerts: any[] }>('/api/alerts?box=sent')).alerts, [] as any[]);

// ── Super-admin dashboard (#12, #35, #43, #61) ────────────────────────────
export const getPendingClubs = () => read('admin:clubs', async () => (await get<{ clubs: any[] }>('/api/admin/clubs?status=pending')).clubs, [] as any[]);
export const getSuspendedClubs = () => read('admin:clubs:suspended', async () => (await get<{ clubs: any[] }>('/api/admin/clubs?status=suspended')).clubs, [] as any[]);

export async function reviewClub(clubId: string, decision: 'approve' | 'suspend' | 'reinstate') {
  await post(`/api/clubs/${clubId}/review`, { decision });
  invalidate('admin:', 'clubs:', `club:detail:${clubId}`);
}

export const getPendingCourts = () => read('admin:courts', async () => (await get<{ courts: any[] }>('/api/admin/courts')).courts, [] as any[]);

export async function reviewCourt(courtId: string, decision: 'approve' | 'reject') {
  await post(`/api/courts/${courtId}/review`, { decision });
  invalidate('admin:courts', 'map:');
}

export const getBadges = () => read('admin:badges', async () => (await get<{ badges: any[] }>('/api/admin/badges')).badges, [] as any[]);

export async function giveBadge(input: { badge: 'basky_verified' | 'creator'; clubId?: string; userId?: string }) {
  await post('/api/admin/badges', input);
  invalidate('admin:badges', 'clubs:', 'club:', 'profile:', 'feed:');
}

// ── Creator badge requests ────────────────────────────────────────────────
export async function requestCreatorBadge() {
  await post('/api/badges/creator', {});
  invalidate('me', 'admin:creator-requests');
}

export async function withdrawCreatorRequest() {
  await del('/api/badges/creator');
  invalidate('me', 'admin:creator-requests');
}

export type CreatorRequest = {
  id: string;
  requestedAt: string;
  person: { id: string; name: string; photoUrl: string | null; bio: string | null; instagram: string | null; youtube: string | null; homeDistrictCode: string | null; createdAt: string; posts: number; followers: number };
};
export const getCreatorRequests = () =>
  read('admin:creator-requests', async () => (await get<{ requests: CreatorRequest[] }>('/api/admin/badges/requests')).requests, [] as CreatorRequest[]);

export async function decideCreatorRequest(id: string, decision: 'approve' | 'decline', note?: string) {
  await post(`/api/admin/badges/requests/${id}/decide`, { decision, ...(note ? { note } : {}) });
  invalidate('admin:creator-requests', 'admin:badges', 'profile:', 'feed:');
}

export async function revokeBadge(id: string) {
  await del(`/api/admin/badges/${id}`);
  invalidate('admin:badges', 'clubs:', 'club:', 'profile:', 'feed:');
}

export const searchUsers = (term: string, status?: string) =>
  read(`admin:users:${term}:${status ?? ''}`, async () => (await get<{ users: any[] }>(`/api/admin/users${q({ q: term, status, limit: 30 })}`)).users, [] as any[]);

export async function setUserStatus(userId: string, status: 'active' | 'suspended', reason: string) {
  await post(`/api/admin/users/${userId}/status`, { status, reason });
  invalidate('admin:users', 'feed:');
}

export const getPlatformRoles = () => read('admin:roles', async () => (await get<{ roles: any[] }>('/api/admin/roles')).roles, [] as any[]);

export async function grantPlatformRole(userId: string, role: 'super_admin' | 'basky_admin' | 'moderator') {
  await post('/api/admin/roles', { userId, role });
  invalidate('admin:roles');
}

export async function endPlatformRole(id: string) {
  await del(`/api/admin/roles/${id}`);
  invalidate('admin:roles');
}

export const getAllOrgs = () => read('admin:orgs', async () => (await get<{ associations: any[] }>('/api/associations?limit=50')).associations, [] as any[]);

export async function createOrg(input: { name: string; shortName?: string; level: string; parentId?: string; stateCode?: string; districtCodes: string[] }) {
  const r = await post<{ id: string }>('/api/associations', input);
  invalidate('admin:orgs', 'orgs');
  return r;
}

export const getChangeLog = () => read('admin:log', async () => (await get<{ changes: any[] }>('/api/admin/change-log?limit=40')).changes, [] as any[]);

// ── Map ───────────────────────────────────────────────────────────────────
export type MapPin = { id: string; name: string; latitude: number; longitude: number; districtCode: string; distanceKm: number | null; kind?: string; indoor?: boolean; address?: string | null };

export const getMap = (params: { districtCode?: string | null; lat?: number; lng?: number; radiusKm?: number }) => {
  const query = params.lat !== undefined ? q({ lat: params.lat, lng: params.lng, radiusKm: params.radiusKm ?? 50 }) : q({ districtCode: params.districtCode ?? 'TN-VELLORE' });
  return read(`map:${query}`, async () => get<{ clubs: MapPin[]; courts: MapPin[] }>(`/api/map${query}`), { clubs: [], courts: [] } as { clubs: MapPin[]; courts: MapPin[] });
};

export async function suggestCourt(input: { name: string; districtCode: string; latitude: number; longitude: number; address?: string; indoor: boolean; surface?: string }) {
  await post('/api/courts', input);
  invalidate('map:', 'admin:courts');
}

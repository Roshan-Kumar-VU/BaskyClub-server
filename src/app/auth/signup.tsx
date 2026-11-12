// Reads live data from the repository cache: opt out of React Compiler memoisation so updates show.
'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { useScope } from '@/lib/scope';
import { notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

/** DD/MM/YYYY (spaces optional) → age in years, or undefined while incomplete. */
function ageFromText(t: string): number | undefined {
  const m = t.replace(/\s/g, '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

/** DD/MM/YYYY → YYYY-MM-DD for the API. */
function isoFromText(t: string): string | undefined {
  const m = t.replace(/\s/g, '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined;
}

/**
 * Sign-up matching the users table (shared API). Under-18: a parent confirms by
 * email and the account stays limited until then (#67).
 */
export default function Signup() {
  const { c } = useTheme();
  const { signup } = useSession();
  const { districtName, districtCode } = useScope();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState({ name: '', email: '', phone: '', dob: '', password: '' });
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const age = ageFromText(f.dob);
  const minor = age !== undefined && age < 18;
  const [parentEmail, setParentEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const ready = Object.values(f).every(Boolean) && (!minor || (/\S+@\S+\.\S+/.test(parentEmail) && parentName.trim().length > 1));

  const create = async () => {
    const dateOfBirth = isoFromText(f.dob);
    if (!dateOfBirth) return setError('Enter your date of birth as DD/MM/YYYY.');
    setLoading(true);
    setError('');
    try {
      const r = await signup({
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone,
        dateOfBirth,
        password: f.password,
        gender,
        homeDistrictCode: districtCode ?? undefined,
        ...(minor ? { parentName: parentName.trim(), parentEmail: parentEmail.trim() } : {}),
      });
      if (router.canGoBack()) router.back();
      else router.replace('/');
      if (r.awaitingParent) {
        notify('Almost there', `We emailed your parent at ${parentEmail}. You can look around now; posting, comments and clubs open once they confirm.`);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="One profile for every club, match and tournament.">
      <Field label="Full name" value={f.name} onChangeText={set('name')} placeholder="As on your ID card" autoComplete="name" />
      <Field label="Email" value={f.email} onChangeText={set('email')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
      <Field label="Mobile number" value={f.phone} onChangeText={set('phone')} placeholder="98765 43210" keyboardType="phone-pad" hint="Friends add you to match rooms with this number." />
      <Field label="Date of birth" value={f.dob} onChangeText={set('dob')} placeholder="DD / MM / YYYY" keyboardType="number-pad" hint="Decides age categories like U-16 and U-18." />
      {minor && (
        <View style={{ gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: c.officialSoft }}>
          <Text variant="caption" style={{ color: c.official, fontFamily: fonts.bodyBold }}>Under 18? A parent needs to confirm.</Text>
          <Text variant="caption" color="textSecondary">We'll email your parent a link. Until they confirm, you can look around but not post, comment or join clubs.</Text>
          <Field label="Parent's name" value={parentName} onChangeText={setParentName} placeholder="Parent or guardian" autoComplete="name" />
          <Field label="Parent's email" value={parentEmail} onChangeText={setParentEmail} placeholder="parent@example.com" keyboardType="email-address" autoCapitalize="none" />
        </View>
      )}
      <View style={{ gap: 6 }}>
        <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodySemi }}>Plays in</Text>
        <Segmented value={gender} onChange={setGender} options={[{ value: 'male', label: "Men's" }, { value: 'female', label: "Women's" }]} />
      </View>
      <View style={{ gap: 6 }}>
        <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodySemi }}>Home district</Text>
        <Pressable onPress={() => router.push('/district-picker')} style={{ height: 52, paddingHorizontal: space.lg, borderRadius: radius.md + 2, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1 }} color={districtName ? 'text' : 'textMuted'}>{districtName ?? 'Choose district'}</Text>
          <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} />
        </Pressable>
      </View>
      <Field label="Password" value={f.password} onChangeText={set('password')} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" />
      {!!error && <Text variant="caption" style={{ color: c.live }}>{error}</Text>}
      <Button label="Create account" disabled={!ready || loading} loading={loading} onPress={create} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs, marginTop: space.sm }}>
        <Text color="textSecondary">Already have an account?</Text>
        <Text color="accentText" style={{ fontFamily: fonts.bodyBold }} onPress={() => router.replace('/auth/login')}>Log in</Text>
      </View>
    </AuthShell>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { space } from '@/theme';

/** UI only. Fields follow the users table: name, email, phone, date of birth, gender. */
export default function SignupScreen() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', dob: '', password: '' });
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const ready = Object.values(form).every(Boolean);

  return (
    <AuthShell title="Create your account" subtitle="Your profile follows you across clubs, matches and tournaments.">
      <Field label="Full name" value={form.name} onChangeText={set('name')} placeholder="As on your ID card" autoComplete="name" textContentType="name" />
      <Field label="Email" value={form.email} onChangeText={set('email')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Mobile number" value={form.phone} onChangeText={set('phone')} placeholder="98765 43210" keyboardType="phone-pad" autoComplete="tel" hint="Teammates can add you to matches with this number." />
      <Field label="Date of birth" value={form.dob} onChangeText={set('dob')} placeholder="DD / MM / YYYY" keyboardType="number-pad" hint="Used for age categories like U-16 and U-18." />
      <View style={{ gap: 6 }}>
        <Text variant="caption" color="textSecondary" style={{ fontFamily: 'Manrope_600SemiBold' }}>Plays in</Text>
        <Segmented value={gender} onChange={setGender} options={[{ value: 'male', label: "Men's" }, { value: 'female', label: "Women's" }]} />
      </View>
      <Field label="Password" value={form.password} onChangeText={set('password')} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Button label="Create account" disabled={!ready} onPress={() => Alert.alert('Preview only', 'Sign up connects to the server in a later step.')} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs, marginTop: space.sm }}>
        <Text color="textSecondary">Already have an account?</Text>
        <Text color="accentText" style={{ fontFamily: 'Manrope_700Bold' }} onPress={() => router.replace('/login')}>Log in</Text>
      </View>
    </AuthShell>
  );
}

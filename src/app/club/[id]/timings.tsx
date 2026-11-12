'use no memo';

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Page, Toggle } from '@/components/form';
import { Text } from '@/components/text';
import { getClubTimings, setTimings, type Timing } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
type Day = { on: boolean; full: boolean; ms: string; me: string; es: string; ee: string };

/** Weekly practice hours (24-hour times, e.g. 06:00). Empty day = no practice. */
export default function Timings() {
  useStoreVersion();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const current = getClubTimings(id);
  const [rows, setRows] = useState<Day[]>(days.map(() => ({ on: false, full: false, ms: '', me: '', es: '', ee: '' })));
  const [init, setInit] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!init && current.length) {
      setRows(days.map((_, i) => {
        const t = current.find((x) => x.dayOfWeek === i + 1);
        return t ? { on: true, full: t.isFullDay, ms: t.morningStart ?? '', me: t.morningEnd ?? '', es: t.eveningStart ?? '', ee: t.eveningEnd ?? '' } : { on: false, full: false, ms: '', me: '', es: '', ee: '' };
      }));
      setInit(true);
    }
  }, [current, init]);

  const edit = (i: number, k: keyof Day, v: string | boolean) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const time = (i: number, k: 'ms' | 'me' | 'es' | 'ee', label: string) => (
    <TextInput accessibilityLabel={`${days[i]} ${label}`} value={rows[i][k]} onChangeText={(v) => edit(i, k, v)} placeholder={label} placeholderTextColor={c.textMuted} style={{ flex: 1, height: 40, paddingHorizontal: space.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: c.line, color: c.text, fontFamily: fonts.bodyMedium, backgroundColor: c.card }} />
  );

  const save = async () => {
    setBusy(true);
    const timings: Timing[] = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.on)
      .map(({ r, i }) => ({ dayOfWeek: i + 1, isFullDay: r.full, morningStart: r.ms || null, morningEnd: r.me || null, eveningStart: r.es || null, eveningEnd: r.ee || null }));
    try {
      await setTimings(id, timings);
      notify('Practice hours saved');
    } catch (e) {
      notify("Couldn't save", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page gap={space.md}>
      {days.map((d, i) => (
        <Card key={d}>
          <View style={{ padding: space.md, gap: space.sm }}>
            <Toggle label={d} value={rows[i].on} onChange={(v) => edit(i, 'on', v)} />
            {rows[i].on && (
              <>
                <Toggle label="Open all day" value={rows[i].full} onChange={(v) => edit(i, 'full', v)} />
                {!rows[i].full && (
                  <>
                    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}><Text variant="caption" style={{ width: 70 }}>Morning</Text>{time(i, 'ms', 'from')}{time(i, 'me', 'to')}</View>
                    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}><Text variant="caption" style={{ width: 70 }}>Evening</Text>{time(i, 'es', 'from')}{time(i, 'ee', 'to')}</View>
                  </>
                )}
              </>
            )}
          </View>
        </Card>
      ))}
      <Button label="Save practice hours" loading={busy} onPress={save} />
    </Page>
  );
}

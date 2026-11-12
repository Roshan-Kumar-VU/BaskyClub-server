'use no memo';

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Area, Card, Choice, Page } from '@/components/form';
import { Text } from '@/components/text';
import { getAssociationDetail } from '@/data/repo';
import { addLegacy, deleteLegacy } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

/** Media / Legacy (#66): district history, tournament records and achievements with photos and YouTube links. */
export default function Legacy() {
  useStoreVersion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = getAssociationDetail(id);
  const [type, setType] = useState<'tournament_record' | 'history' | 'achievement'>('tournament_record');
  const [title, setTitle] = useState('');
  const [yr, setYr] = useState(String(new Date().getFullYear()));
  const [body, setBody] = useState('');
  const [winner, setWinner] = useState('');
  const [runner, setRunner] = useState('');
  const [photo, setPhoto] = useState('');
  const [video, setVideo] = useState('');
  const [busy, setBusy] = useState(false);
  const run = (p: Promise<unknown>) => p.catch((e) => notify("Couldn't save", errorMessage(e)));

  const add = async () => {
    setBusy(true);
    try {
      await addLegacy(id, {
        recordType: type,
        title: title.trim(),
        year: yr ? Number(yr) : null,
        body: body.trim() || null,
        winner: winner.trim() || null,
        runnerUp: runner.trim() || null,
        media: [...(photo.trim() ? [{ mediaType: 'image' as const, url: photo.trim() }] : []), ...(video.trim() ? [{ mediaType: 'youtube' as const, url: video.trim() }] : [])],
      });
      setTitle('');
      setBody('');
      setWinner('');
      setRunner('');
      setPhoto('');
      setVideo('');
      notify('Added to Media');
    } catch (e) {
      notify("Couldn't add", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      {(d?.legacy ?? []).map((r) => (
        <Card key={r.id}>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Text variant="subheading">{r.year} · {r.title}</Text>
            {!!r.body && <Text variant="caption" color="textSecondary">{r.body}</Text>}
            <Text variant="caption" color="textMuted">{r.media.length} photo/video</Text>
            <Button compact kind="ghost" label="Delete" onPress={() => confirm(`Delete “${r.title}”?`, 'This removes it from the Media section.', 'Delete', () => run(deleteLegacy(r.id, id)))} />
          </View>
        </Card>
      ))}
      <Card title="Add a record">
        <View style={{ padding: space.lg, gap: space.md }}>
          <Choice value={type} onChange={setType} options={[{ value: 'tournament_record', label: 'Tournament' }, { value: 'history', label: 'History' }, { value: 'achievement', label: 'Achievement' }]} />
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="District Championship — men" />
          <Field label="Year" value={yr} onChangeText={setYr} keyboardType="number-pad" />
          {type === 'tournament_record' && <Field label="Winner" value={winner} onChangeText={setWinner} />}
          {type === 'tournament_record' && <Field label="Runner-up" value={runner} onChangeText={setRunner} />}
          <Area label="Story (optional)" value={body} onChangeText={setBody} />
          <Field label="Photo link (optional)" value={photo} onChangeText={setPhoto} placeholder="https://" autoCapitalize="none" />
          <Field label="YouTube link (optional)" value={video} onChangeText={setVideo} placeholder="https://youtu.be/…" autoCapitalize="none" />
          <Button label="Add record" loading={busy} disabled={title.trim().length < 2} onPress={add} />
        </View>
      </Card>
    </Page>
  );
}

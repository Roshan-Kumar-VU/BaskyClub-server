'use no memo';

import { fits, LIMITS } from '@baskyclub/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Card, Page, PersonPicker } from '@/components/form';
import { Text } from '@/components/text';
import { addBearer, deleteBearer, getBearers, updateBearer } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

const today = () => new Date().toISOString().slice(0, 10);
const year = (d: string) => new Date(d).getFullYear();

/** Office bearers with terms (#16, #45, #62). Ending a term keeps it as history. */
export default function Bearers() {
  useStoreVersion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rows = getBearers(id);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState(today());
  const [userId, setUserId] = useState<string | null>(null);
  const run = (p: Promise<unknown>, ok?: string) => p.then(() => ok && notify(ok)).catch((e) => notify("Couldn't save", errorMessage(e)));

  const add = () =>
    run(
      addBearer(id, { name: name.trim(), designation: title.trim(), termFrom: from, userId, sortOrder: rows.filter((r) => r.isCurrent).length + 1 }).then(() => {
        setName('');
        setTitle('');
        setUserId(null);
      }),
      'Added',
    );

  return (
    <Page>
      {rows.map((b) => (
        <Card key={b.id}>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text variant="subheading" style={{ flex: 1 }}>{b.name}</Text>
              <Tag label={b.isCurrent ? 'Current' : 'Past'} />
            </View>
            <Text variant="caption" color="textMuted">{b.designation} · {year(b.termFrom)}–{b.termTo ? year(b.termTo) : 'now'}{b.userId ? ' · has an account' : ''}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {b.isCurrent && <Button compact kind="secondary" label="End term today" onPress={() => run(updateBearer(b.id, id, { termTo: today() }), 'Term ended')} />}
              <Button compact kind="ghost" label="Delete (mistake)" onPress={() => confirm(`Delete ${b.name}?`, 'Use this only for wrong entries. To keep history, end the term instead.', 'Delete', () => run(deleteBearer(b.id, id)))} />
            </View>
          </View>
        </Card>
      ))}
      <Card title="Add an office bearer">
        <View style={{ padding: space.lg, gap: space.md }}>
          <Field label="Name as it should appear" value={name} onChangeText={setName} placeholder="Mr. S. Rajendran" maxLength={LIMITS.officeBearerName.max} />
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="President, Secretary, Treasurer…" maxLength={LIMITS.officeBearerDesignation.max} />
          <Field label="Term starts (YYYY-MM-DD)" value={from} onChangeText={setFrom} />
          <PersonPicker label="Link to their BaskyCLub account (optional)" onPick={(p) => { setUserId(p.id); if (!name) setName(p.name); }} />
          {userId && <Text variant="caption" color="accentText">Linked to an account ✓</Text>}
          <Button label="Add" disabled={!fits(name, LIMITS.officeBearerName) || !fits(title, LIMITS.officeBearerDesignation) || !/^\d{4}-\d{2}-\d{2}$/.test(from)} onPress={add} />
        </View>
      </Card>
    </Page>
  );
}

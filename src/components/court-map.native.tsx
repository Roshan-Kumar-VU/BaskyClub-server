import { router } from 'expo-router';
import MapView, { Callout, Marker } from 'react-native-maps';

import type { MapPin } from '@/data/manage';
import { palette } from '@/theme';

import { Text } from './text';

/** Map with club pins (orange) and court pins (blue). iPhone uses Apple Maps; Android needs a Google Maps key (app.json). */
export function CourtMap({ clubs, courts, center }: { clubs: MapPin[]; courts: MapPin[]; center: { latitude: number; longitude: number } }) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{ ...center, latitudeDelta: 0.25, longitudeDelta: 0.25 }}
      showsUserLocation={false}>
      {clubs.map((c) => (
        <Marker key={`c-${c.id}`} coordinate={{ latitude: c.latitude, longitude: c.longitude }} pinColor={palette.ball} title={c.name} description={c.kind}>
          <Callout onPress={() => router.push({ pathname: '/club/[id]', params: { id: c.id } })}>
            <Text variant="bodyStrong">{c.name}</Text>
            <Text variant="caption">Open club page</Text>
          </Callout>
        </Marker>
      ))}
      {courts.map((c) => (
        <Marker key={`k-${c.id}`} coordinate={{ latitude: c.latitude, longitude: c.longitude }} pinColor={palette.paint} title={c.name} description={[c.indoor ? 'Indoor' : 'Outdoor', c.address].filter(Boolean).join(' · ')} />
      ))}
    </MapView>
  );
}

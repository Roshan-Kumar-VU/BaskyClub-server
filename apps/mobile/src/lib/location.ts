/**
 * Location → district code. Foreground permission only, reverse geocoding on
 * the device, and only the district code is kept — never raw GPS.
 */
import * as Location from 'expo-location';

import { matchDistrict } from '@/data/repo';

export type LocateResult =
  | { ok: true; districtCode: string; districtName: string }
  | { ok: false; reason: 'denied' | 'no_match' | 'error' };

export async function locateDistrict(): Promise<LocateResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const places = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    for (const p of places) {
      const d = matchDistrict([p.subregion, p.district, p.city, p.region]);
      if (d) return { ok: true, districtCode: d.code, districtName: d.name };
    }
    return { ok: false, reason: 'no_match' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

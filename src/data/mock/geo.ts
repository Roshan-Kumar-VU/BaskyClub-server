/**
 * Mock places and associations. The real app loads the approved seed
 * (36 states, 786 districts, zones) from the database. District codes follow
 * SCHEMA_PHASE1 format: TN-VELLORE.
 */
import type { District, Organization, State } from '@/types/models';

type Row = [name: string, alt?: string[]];

const TN: Row[] = [
  ['Ariyalur'], ['Chengalpattu'], ['Chennai', ['Madras']], ['Coimbatore', ['Kovai']], ['Cuddalore'], ['Dharmapuri'],
  ['Dindigul'], ['Erode'], ['Kallakurichi'], ['Kancheepuram', ['Kanchipuram']], ['Kanniyakumari', ['Kanyakumari']],
  ['Karur'], ['Krishnagiri'], ['Madurai'], ['Mayiladuthurai'], ['Nagapattinam'], ['Namakkal'], ['Nilgiris', ['The Nilgiris', 'Ooty']],
  ['Perambalur'], ['Pudukkottai'], ['Ramanathapuram'], ['Ranipet'], ['Salem'], ['Sivaganga'], ['Tenkasi'], ['Thanjavur'],
  ['Theni'], ['Thoothukudi', ['Tuticorin']], ['Tiruchirappalli', ['Trichy', 'Tiruchi']], ['Tirunelveli'], ['Tirupathur', ['Tirupattur']],
  ['Tiruppur', ['Tirupur']], ['Tiruvallur', ['Thiruvallur']], ['Tiruvannamalai', ['Thiruvannamalai']], ['Tiruvarur', ['Thiruvarur']],
  ['Vellore'], ['Viluppuram', ['Villupuram']], ['Virudhunagar'],
];

const code = (name: string) => `TN-${name.toUpperCase().replace(/[^A-Z]/g, '')}`;

/**
 * TNBA has 35 district associations for 38 districts (#61). PROVISIONAL mock:
 * these three newer districts point to their parent's association until the
 * latest TNBA list is entered from the super-admin screens.
 */
const COVERED_BY_PARENT: Record<string, string> = { Mayiladuthurai: 'Nagapattinam', Kallakurichi: 'Viluppuram', Tirupathur: 'Vellore' };

/** Page status per association in the demo (#59): Vellore claimed, Chennai published, rest draft. */
const STATUS: Record<string, Organization['pageStatus']> = { Vellore: 'claimed', Chennai: 'published' };

export const states: State[] = [
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'KL', name: 'Kerala' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'PY', name: 'Puducherry' },
];

export const organizations: Organization[] = [
  { id: 'org-bfi', name: 'Basketball Federation of India', shortName: 'BFI', level: 'national', pageStatus: 'published' },
  { id: 'org-tnba', name: 'Tamil Nadu Basketball Association', shortName: 'TNBA', level: 'state', parentId: 'org-bfi', stateCode: 'TN', pageStatus: 'published' },
  ...TN.filter(([name]) => !COVERED_BY_PARENT[name]).map(([name]): Organization => ({
    id: `org-${code(name)}`,
    name: `${name} District Basketball Association`,
    shortName: `${name} DBA`,
    level: 'district',
    parentId: 'org-tnba',
    stateCode: 'TN',
    pageStatus: STATUS[name] ?? 'draft',
    about: name === 'Vellore' ? 'Runs district championships, school leagues and coaching camps across Vellore district.' : undefined,
  })),
];

export const districts: District[] = [
  ...TN.map(([name, alt]): District => ({
    code: code(name),
    name,
    altNames: alt,
    stateCode: 'TN',
    associationId: `org-${code(COVERED_BY_PARENT[name] ?? name)}`,
  })),
  { code: 'KL-ERNAKULAM', name: 'Ernakulam', altNames: ['Kochi', 'Cochin'], stateCode: 'KL' },
  { code: 'KA-BENGALURUURBAN', name: 'Bengaluru Urban', altNames: ['Bangalore', 'Bengaluru'], stateCode: 'KA' },
  { code: 'PY-PUDUCHERRY', name: 'Puducherry', altNames: ['Pondicherry'], stateCode: 'PY' },
];

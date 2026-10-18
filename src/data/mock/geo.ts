/**
 * Mock geography. The real app loads the approved 786-district seed
 * (districts_india.csv); this keeps all 38 Tamil Nadu districts plus a few
 * from other states so the picker and scope toggle can be tested.
 */
import type { District, Organization } from '@/types/models';

type Row = [code: string, name: string, alt?: string[]];

const TN: Row[] = [
  ['ARI', 'Ariyalur'], ['CGL', 'Chengalpattu'], ['CHN', 'Chennai', ['Madras']], ['CBE', 'Coimbatore', ['Kovai']],
  ['CUD', 'Cuddalore'], ['DPI', 'Dharmapuri'], ['DGL', 'Dindigul'], ['ERD', 'Erode'], ['KKR', 'Kallakurichi'],
  ['KPM', 'Kancheepuram', ['Kanchipuram']], ['KKM', 'Kanniyakumari', ['Kanyakumari']], ['KRR', 'Karur'],
  ['KGI', 'Krishnagiri'], ['MDU', 'Madurai'], ['MYD', 'Mayiladuthurai'], ['NGP', 'Nagapattinam'], ['NMK', 'Namakkal'],
  ['NLG', 'Nilgiris', ['The Nilgiris', 'Ooty']], ['PBL', 'Perambalur'], ['PDK', 'Pudukkottai'], ['RMD', 'Ramanathapuram'],
  ['RPT', 'Ranipet'], ['SLM', 'Salem'], ['SVG', 'Sivaganga'], ['TKS', 'Tenkasi'], ['TNJ', 'Thanjavur'], ['THN', 'Theni'],
  ['TUT', 'Thoothukudi', ['Tuticorin']], ['TRY', 'Tiruchirappalli', ['Trichy', 'Tiruchi']], ['TNV', 'Tirunelveli'],
  ['TPT', 'Tirupathur', ['Tirupattur']], ['TUP', 'Tiruppur', ['Tirupur']], ['TVL', 'Tiruvallur', ['Thiruvallur']],
  ['TVM', 'Tiruvannamalai', ['Thiruvannamalai']], ['TVR', 'Tiruvarur', ['Thiruvarur']], ['VLR', 'Vellore'],
  ['VPM', 'Viluppuram', ['Villupuram']], ['VNR', 'Virudhunagar'],
];

/** The 6 newer districts point to their parent's association until confirmed (APP_NAV 7.3). */
const NEWER_PARENT: Record<string, string> = {
  CGL: 'KPM', KKR: 'VPM', RPT: 'VLR', TKS: 'TNV', TPT: 'VLR', MYD: 'NGP',
};

/** Associations that have claimed their page in the demo data. */
const CLAIMED = new Set(['CHN', 'CBE']);

export const organizations: Organization[] = [
  { id: 'org-bfi', name: 'Basketball Federation of India', shortName: 'BFI', level: 'national', isPartner: false, isPlaceholder: true },
  { id: 'org-tnba', name: 'Tamil Nadu Basketball Association', shortName: 'TNBA', level: 'state', parentId: 'org-bfi', stateCode: 'TN', isPartner: false, isPlaceholder: true },
  ...TN.filter(([code]) => !NEWER_PARENT[code]).map(([code, name]): Organization => ({
    id: `org-TN-${code}`,
    name: `${name} District Basketball Association`,
    shortName: `${name} DBA`,
    level: 'district',
    parentId: 'org-tnba',
    stateCode: 'TN',
    districtCode: `TN-${code}`,
    isPartner: code === 'CHN',
    isPlaceholder: !CLAIMED.has(code),
  })),
];

const other: District[] = [
  { code: 'KL-EKM', name: 'Ernakulam', altNames: ['Kochi', 'Cochin'], stateCode: 'KL', stateName: 'Kerala' },
  { code: 'KL-TVM', name: 'Thiruvananthapuram', altNames: ['Trivandrum'], stateCode: 'KL', stateName: 'Kerala' },
  { code: 'KA-BLR', name: 'Bengaluru Urban', altNames: ['Bangalore', 'Bengaluru'], stateCode: 'KA', stateName: 'Karnataka' },
  { code: 'KA-MYS', name: 'Mysuru', altNames: ['Mysore'], stateCode: 'KA', stateName: 'Karnataka' },
  { code: 'MH-MUM', name: 'Mumbai', altNames: ['Mumbai City', 'Bombay'], stateCode: 'MH', stateName: 'Maharashtra' },
  { code: 'MH-PNE', name: 'Pune', stateCode: 'MH', stateName: 'Maharashtra' },
  { code: 'TG-HYD', name: 'Hyderabad', stateCode: 'TG', stateName: 'Telangana' },
  { code: 'DL-NDL', name: 'New Delhi', altNames: ['Delhi'], stateCode: 'DL', stateName: 'Delhi' },
  { code: 'PY-PDY', name: 'Puducherry', altNames: ['Pondicherry'], stateCode: 'PY', stateName: 'Puducherry' },
];

export const districts: District[] = [
  ...TN.map(([code, name, alt]): District => ({
    code: `TN-${code}`,
    name,
    altNames: alt,
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    basketballAssociationId: `org-TN-${NEWER_PARENT[code] ?? code}`,
  })),
  ...other,
];

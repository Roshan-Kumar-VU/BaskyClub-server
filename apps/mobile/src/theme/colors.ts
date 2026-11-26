/**
 * "Courtside" palette. Brand orange and fonts come from the website
 * (Local_site-main/src/app/globals.css); paint blue is the painted key and
 * marks official content and scoreboards.
 */
export const palette = {
  ball: '#FF6B00', // brand, main actions
  leather: '#A04100', // orange text on light
  paint: '#123A63', // official content, scoreboards
  live: '#D7261E',
} as const;

const light = {
  background: '#F9F9F9', // website surface
  card: '#FFFFFF',
  cardMuted: '#F1F2F3',
  fill: '#ECEDEE',
  line: '#E3E4E6', // court line
  text: '#16181B', // ink
  textSecondary: '#4A4F55',
  textMuted: '#80868D',
  accent: palette.ball,
  accentText: palette.leather,
  accentSoft: '#FFE6D5',
  onAccent: '#FFFFFF',
  official: palette.paint,
  officialSoft: '#E1E9F2',
  scoreboard: palette.paint,
  live: palette.live,
  success: '#1F8A4C',
};

export type ThemeColors = { [K in keyof typeof light]: string };

const dark: ThemeColors = {
  background: '#0D1117', // night court
  card: '#161B22',
  cardMuted: '#1C222B',
  fill: '#232A33',
  line: '#2A313B',
  text: '#F2F4F6',
  textSecondary: '#B7BEC6',
  textMuted: '#7D858F',
  accent: palette.ball,
  accentText: '#FF9A55', // floodlight orange
  accentSoft: '#3A1F0C',
  onAccent: '#FFFFFF',
  official: '#7FB0E3',
  officialSoft: '#14273D',
  scoreboard: '#123A63',
  live: '#FF5449',
  success: '#4ADE80',
};

export const colors = { light, dark };

/**
 * Colour tokens carried over from the website (Local_site-main/src/app/globals.css).
 * Light values match the site's Material-style tokens; dark values follow the
 * site's zinc-950 dark shell.
 */
export const palette = {
  orange: '#FF6B00', // --color-primary-container: brand orange (logo, actions)
  leather: '#A04100', // --color-primary: deeper orange for text on light
  orangeSoft: '#FFDBCC', // --color-primary-fixed
  official: '#0062A1', // --color-tertiary: federation / official content
  officialSoft: '#D0E4FF',
  live: '#BA1A1A', // --color-error: live badge
  success: '#1F8A4C',
} as const;

const light = {
  background: '#F9F9F9', // --color-surface
  card: '#FFFFFF', // --color-surface-container-lowest
  cardMuted: '#F3F3F3', // --color-surface-container-low
  fill: '#EEEEEE', // --color-surface-container
  line: '#E2E2E2', // --color-surface-variant
  text: '#1A1C1C', // --color-on-surface
  textSecondary: '#5A4136', // --color-on-surface-variant (warm)
  textMuted: '#8E7164', // --color-outline
  accent: palette.orange,
  accentText: palette.leather,
  accentSoft: palette.orangeSoft,
  onAccent: '#FFFFFF',
  official: palette.official,
  officialSoft: palette.officialSoft,
  live: palette.live,
  success: palette.success,
};

export type ThemeColors = { [K in keyof typeof light]: string };

const dark: ThemeColors = {
  background: '#09090B',
  card: '#18181B',
  cardMuted: '#1F1F23',
  fill: '#27272A',
  line: '#2E2E33',
  text: '#F4F4F5',
  textSecondary: '#C9B8AF',
  textMuted: '#8A8A93',
  accent: palette.orange,
  accentText: '#FFB693', // --color-inverse-primary
  accentSoft: '#3A1D0A',
  onAccent: '#FFFFFF',
  official: '#9CCAFF',
  officialSoft: '#0D2A44',
  live: '#FF5449',
  success: '#4ADE80',
};

export const colors = { light, dark };

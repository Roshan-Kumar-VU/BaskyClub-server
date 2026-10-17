/**
 * Space Grotesk = headlines, scores, numbers (the website's --font-headline).
 * Manrope = everything you read (the website's --font-body).
 */
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyHeavy: 'Manrope_800ExtraBold',
} as const;

export const type = {
  score: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.5 },
  stat: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, letterSpacing: -0.3 },
  subheading: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 17 },
  micro: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
} as const;

export type TypeVariant = keyof typeof type;

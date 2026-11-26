/**
 * Switches for Phase 1 features that are built but not open yet.
 *
 * affiliationRequests — PRD §5: "Club-to-association link requests are not built until after app
 * testing." The screens and API exist; the entry points stay hidden until this is turned on.
 * Clubs still show their affiliation (badge / status), which the Basky team sets up for now.
 */
export const FEATURES = {
  affiliationRequests: false,
} as const;

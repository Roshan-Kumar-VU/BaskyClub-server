import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import { webUrl } from "./_lib/config";
import "./globals.css";

// Same fonts as the app (apps/mobile/src/theme/typography.ts); next/font serves them from this site.
const body = Manrope({ subsets: ["latin"], variable: "--nf-body" });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--nf-display" });

export const metadata: Metadata = {
  metadataBase: new URL(webUrl),
  title: { default: "BaskyCLub", template: "%s · BaskyCLub" },
  description: "The basketball community: clubs, associations and players across India.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9F9F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1117" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

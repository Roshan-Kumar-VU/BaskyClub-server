import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { env } from "@/server/env";
import "./globals.css";

// Same fonts as the app (apps/mobile/src/theme/typography.ts); next/font serves them from this site.
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
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
      <body>
        <header className="site-header">
          <a href="/" className="wordmark">
            Basky<span>CLub</span>
          </a>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}

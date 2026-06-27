import type { Metadata } from "next";
import { Passion_One, Oswald } from "next/font/google";
import "./globals.css";

// Display face (logo / headings) — kept under the legacy `--font-orbitron`
// variable name so existing `var(--font-orbitron)` usages pick it up.
const displayFont = Passion_One({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-orbitron",
});
// Body face — condensed, board-label feel — under the legacy `--font-rajdhani`.
const bodyFont = Oswald({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

export const metadata: Metadata = {
  title: "Ponomoly",
  description: "Buy, build, and bankrupt your friends. A real-time multiplayer property game.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}

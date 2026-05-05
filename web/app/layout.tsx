import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const fontDisplay = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fontBody = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Newli — Find your coach",
  description:
    "Match with coaches for swimming, triathlon, mountain biking, and more. Built for athletes chasing big goals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col text-[var(--text-primary)]">
        <SiteHeader />
        <main className="relative z-[1] flex-1">{children}</main>
        <footer className="relative z-[1] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-10 text-center text-xs leading-relaxed text-[var(--text-muted)]">
          Coaches share what they love. Athletes chase what matters. This is just the trailhead.
        </footer>
      </body>
    </html>
  );
}

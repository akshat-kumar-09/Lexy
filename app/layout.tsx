import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { DM_Sans, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { LexiconCloudSync } from "@/components/LexiconCloudSync";
import { RegisterSW } from "@/components/RegisterSW";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const libre = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Lexy — your wardrobe for words",
  description:
    "Language is the dress of thought — Lexy is your wardrobe. Metaphors, deep dives, morning scribbles, and a lexicon that learns your taste — one day’s thread at a time.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Lexy",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1C1917",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${libre.variable} h-full overflow-x-clip antialiased`}>
      <body className="min-h-dvh touch-manipulation font-sans">
        <Providers>
          <RegisterSW />
          <AppShell>{children}</AppShell>
          <LexiconCloudSync />
        </Providers>
      </body>
    </html>
  );
}

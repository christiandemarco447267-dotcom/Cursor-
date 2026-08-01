import type { Metadata, Viewport } from "next";
import { Dancing_Script, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dancingScript = Dancing_Script({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ecf8f3",
};

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sentia — Invest with process",
  description:
    "A stable, professional paper-trading coach: real buy/sell simulation, goals, investment theses, lessons, and mood check-ins — with local-first, validated data.",
  applicationName: "Sentia",
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} ${dancingScript.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

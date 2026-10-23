import type { Metadata, Viewport } from "next";
import { Dancing_Script, DM_Sans, Fraunces } from "next/font/google";
import { assetPath } from "@/lib/asset";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, siteUrl } from "@/lib/site";
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
  themeColor: "#070a1c",
  colorScheme: "dark",
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

// Static 1200x630 share image (regenerate with `npm run og:image`).
const OG_IMAGE = { url: siteUrl("/og-image.png"), width: 1200, height: 630, alt: SITE_TITLE, type: "image/png" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["paper trading", "investing practice", "portfolio tracker", "investment thesis", "stock simulator"],
  authors: [{ name: "Christian DeMarco" }],
  icons: { icon: assetPath("/icon.png"), apple: assetPath("/icon.png") },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// Base-path aware background photo (CSS url()s are not prefixed on GitHub Pages).
const BG_STYLE = {
  "--app-bg": `url("${assetPath("/sentia-bg.webp")}")`,
  "--app-bg-jpg": `url("${assetPath("/sentia-bg.jpg")}")`,
} as React.CSSProperties;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} ${dancingScript.variable}`} style={BG_STYLE}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

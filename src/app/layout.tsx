import type { Metadata, Viewport } from "next";
import { Dancing_Script, DM_Sans, Fraunces } from "next/font/google";
import { NativeBridge } from "@/components/native-bridge";
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
  // Pinch-zoom stays allowed (accessibility). Inputs use 16px text on touch screens so iOS
  // doesn't auto-zoom on focus (globals.css), and the keyboard resizes the visual viewport only.
  interactiveWidget: "resizes-visual",
};

// iOS "Add to Home Screen" launch images: [device width, height in CSS px, pixel ratio, file WxH].
const APPLE_SPLASH: Array<[number, number, number, string]> = [
  [440, 956, 3, "1320x2868"],
  [430, 932, 3, "1290x2796"],
  [402, 874, 3, "1206x2622"],
  [393, 852, 3, "1179x2556"],
  [428, 926, 3, "1284x2778"],
  [390, 844, 3, "1170x2532"],
  [375, 812, 3, "1125x2436"],
  [414, 896, 3, "1242x2688"],
  [414, 896, 2, "828x1792"],
  [414, 736, 3, "1242x2208"],
  [375, 667, 2, "750x1334"],
  [1024, 1366, 2, "2048x2732"],
  [834, 1194, 2, "1668x2388"],
  [820, 1180, 2, "1640x2360"],
  [744, 1133, 2, "1488x2266"],
];

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
  icons: {
    icon: [
      { url: assetPath("/favicon.ico"), sizes: "48x48 32x32 16x16" },
      { url: assetPath("/icon.png"), sizes: "256x256", type: "image/png" },
      { url: assetPath("/icons/icon-48.png"), sizes: "48x48", type: "image/png" },
      { url: assetPath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: assetPath("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
    startupImage: APPLE_SPLASH.map(([w, h, r, file]) => ({
      url: assetPath(`/splash/apple-splash-${file}.png`),
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: false, email: false, address: false },
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
      <body className="antialiased">
        {children}
        <NativeBridge />
      </body>
    </html>
  );
}

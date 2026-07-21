import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AInvestPro",
  description:
    "AInvestPro helps you track portfolio progress, document investment theses, and build better investing habits.",
  applicationName: "AInvestPro",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "AInvestPro",
    capable: true,
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${manrope.variable} ${newsreader.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

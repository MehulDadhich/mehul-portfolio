import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Mona_Sans } from "next/font/google";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { Nav } from "@/components/shared/nav";
import { CommandPalette } from "@/components/shared/command-palette";
import { EasterEgg } from "@/components/shared/easter-egg";
import { DetectionCursor } from "@/components/shared/detection-cursor";
import { siteDescription, siteTitle, siteUrl } from "@/lib/site";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const mona = Mona_Sans({ variable: "--font-mona", subsets: ["latin"], axes: ["wdth"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: "%s | Mehul Dadhich" },
  description: siteDescription,
  applicationName: "Mehul Dadhich",
  authors: [{ name: "Mehul Dadhich", url: "https://github.com/MehulDadhich" }],
  keywords: [
    "Mehul Dadhich", "AI engineer", "ML engineer", "computer vision", "YOLO", "LLM agents", "LangGraph",
    "FastAPI", "real-time video analytics", "VIT-AP",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: "Mehul Dadhich",
    title: siteTitle,
    description: siteDescription,
    firstName: "Mehul",
    lastName: "Dadhich",
  },
  twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0b10",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${mona.variable} antialiased`}>
      <body className="min-h-svh bg-ink text-fg">
        <noscript>
          <style>{`.boot-hide{visibility:visible!important}`}</style>
        </noscript>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-fg focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <SmoothScroll />
        <Nav />
        {children}
        <CommandPalette />
        <EasterEgg />
        <DetectionCursor />
      </body>
    </html>
  );
}

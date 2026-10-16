import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono, Newsreader } from "next/font/google";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { MotionProvider } from "@/components/providers/motion-config";
import { Nav } from "@/components/shared/nav";
import { EasterEgg } from "@/components/shared/easter-egg";
import { Assistant } from "@/components/assistant/assistant";
import { siteDescription, siteTitle, siteUrl } from "@/lib/site";
import "./globals.css";

const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], display: "swap" });
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: "%s | Mehul Dadhich" },
  description: siteDescription,
  applicationName: "Mehul Dadhich",
  authors: [{ name: "Mehul Dadhich", url: "https://github.com/MehulDadhich" }],
  keywords: [
    "Mehul Dadhich", "AI engineer", "ML engineer", "computer vision", "YOLO", "vision-language models", "LLM agents",
    "agentic AI", "LangGraph", "RAG", "QLoRA", "model evaluation", "inference optimization",
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
  themeColor: "#0c0c0b",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${newsreader.variable} ${interTight.variable} ${jetbrains.variable} antialiased`}>
      <body className="grain isolate min-h-svh bg-ink text-fg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-fg focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <MotionProvider>
          <SmoothScroll />
          <Nav />
          {children}
          <EasterEgg />
          <Assistant />
        </MotionProvider>
      </body>
    </html>
  );
}

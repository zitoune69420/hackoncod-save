import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/app/components/theme-provider";
import { I18nProvider } from "@/app/components/i18n-provider";
import { ThemeInitScript } from "@/app/theme-init-script";
import { Toaster } from "@/components/ui/sonner";
import { PageViewTracker } from "@/app/components/analytics/page-view-tracker";
import { NotificationSoundUnlock } from "@/app/components/notification-sound-unlock";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hackoncod.com"),

  title: {
    default: "Hack on COD",
    template: "%s | Dashboard",
  },

  description:
    "Call of Duty platform with organized access to tools, resources, updates, and support across supported titles.",

  keywords: [
    /* Core franchise */
    "call of duty",
    "cod",
    "cod game",
    "call of duty hacks",
    "call of duty cheats",
    "cod cheat",
    "cod hacks",

    /* Cheat types */
    "cod aimbot",
    "cod silent aimbot",
    "cod legit aimbot",
    "cod rage aimbot",
    "cod triggerbot",
    "cod wallhack",
    "cod esp",
    "cod radar hack",
    "cod no recoil hack",
    "cod no spread hack",
    "cod unlock tool",
    "cod unlock all",
    "cod unlock all tool",
    "cod camo unlock tool",
    "cod unlock all skins",
    "cod unlock all weapons",
    "cod unlock all camos",
    "cod unlock operator skins",

    /* Cheat safety / detection queries */
    "undetected cod cheats",
    "cod undetected cheat",
    "cod safe cheat",
    "cod private cheat",
    "cod external cheat",
    "cod internal cheat",
    "cod bypass anti cheat",
    "cod cheat spoofer",
    "cod hwid spoofer",

    /* Downloads / intent */
    "download cod cheats",
    "cod cheat download",
    "free cod cheats",
    "free cod hack",
    "cod hacks free download",
    "cod mod menu download",
    "cod cheat injector",
    "cod cheat loader",
    "cod cheat tool",

    /* Warzone */
    "warzone cheats",
    "warzone hacks",
    "warzone aimbot",
    "warzone esp",
    "warzone wallhack",
    "warzone unlock tool",
    "free warzone hacks",
    "undetected warzone cheats",

    /* Multiplayer / modes */
    "cod multiplayer hacks",
    "cod zombies hacks",
    "cod campaign mods",
    "cod mod menu multiplayer",
    "cod zombie mod menu",

    /* Games — historical */
    "cod bo1",
    "cod bo2",
    "cod bo3",
    "cod bo4",
    "cod bo5",
    "cod bo6",
    "cod bocw",
    "black ops 1 hacks",
    "black ops 2 hacks",
    "black ops 3 hacks",
    "black ops 4 hacks",
    "black ops cold war hacks",

    /* Modern titles */
    "modern warfare hacks",
    "modern warfare 2 hacks",
    "modern warfare 3 hacks",
    "mw2 cheats",
    "mw3 cheats",

    /* Latest titles */
    "black ops 6 hacks",
    "black ops 6 cheats",
    "bo6 cheat",
    "bo6 unlock tool",
    "bo6 aimbot",
    "bo6 esp",

    "black ops 7 hacks",
    "black ops 7 cheats",
    "bo7 cheat",
    "bo7 unlock tool",
    "bo7 aimbot",
    "bo7 esp",

    /* Formatting variants (SEO capture) */
    "blackops6 hacks",
    "blackops7 hacks",
    "blackops coldwar cheats",

    /* Feature keywords */
    "cod mod menu",
    "cod game mods",
    "cod modding tools",
    "cod cheat forum",
    "cod cheat community",
    "cod private cheat forum",

    /* Cheat features */
    "silent aim cod",
    "magic bullet cod",
    "cod zoomhack",
    "cod radar cheat",
    "cod esp box",
    "cod player esp",
    "cod item esp",
    "cod bone esp",

    /* Platform queries */
    "cod cheats pc",
    "cod cheats windows",
    "cod hacks steam",
    "cod hacks battlenet",

    /* Temporal queries */
    "cod cheats 2025",
    "cod cheats 2026",
    "cod unlock all 2025",
    "cod unlock all 2026",
  ],

  applicationName: "Hack on COD",
  category: "Gaming",
  creator: "Hack on COD",
  authors: [{ name: "Hack on COD", url: "https://hackoncod.com" }],

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    type: "website",
    url: "https://hackoncod.com",
    siteName: "Hack on COD",
    title: "Hack on COD | Call of Duty Tools Platform",
    description:
      "Access tools, resources, updates, and support for Call of Duty titles through one organized platform.",
    locale: "en_US",
    images: [
      {
        url: "https://i.imgur.com/Uf4wFTq.png",
        width: 1200,
        height: 630,
        alt: "Hack on COD",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Hack on COD | Call of Duty Tools Platform",
    description:
      "Organized access to Call of Duty tools, resources, updates, and support.",
    images: ["https://i.imgur.com/Uf4wFTq.png"],
    creator: "@hackoncod",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#262626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("font-sans dark", inter.variable)}
      data-theme="purple"
      data-background="darker"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeInitScript />
        <ThemeProvider>
          <I18nProvider>
            <TooltipProvider>
              <NotificationSoundUnlock />
              <Suspense fallback={null}>
                <PageViewTracker />
              </Suspense>
              {children}
              <Toaster />
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

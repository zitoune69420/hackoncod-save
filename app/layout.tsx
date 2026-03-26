import type { Metadata } from "next";
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
  title: "Hack on COD — Call of Duty tools in one place",
  description:
    "Access cheats, tools, and resources for Call of Duty through a clean platform. Start free and upgrade anytime.",
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

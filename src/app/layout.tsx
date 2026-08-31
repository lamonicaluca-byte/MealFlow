import type { Metadata, Viewport } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppDataProvider } from "@/components/providers/app-data-provider";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegistration } from "@/components/providers/service-worker-registration";

export const metadata: Metadata = {
  title: "MealFlow — Meno decisioni, più tempo insieme.",
  description:
    "MealFlow organizza il menu settimanale della famiglia, la lista della spesa e la dispensa, riducendo il carico mentale legato ai pasti.",
  applicationName: "MealFlow",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MealFlow",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#171310" },
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppDataProvider>
            {children}
            <Toaster />
            <ServiceWorkerRegistration />
          </AppDataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

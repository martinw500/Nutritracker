import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { DetailLevelProvider } from "@/components/detail-level";

export const metadata: Metadata = {
  title: "NutriTracker",
  description:
    "A nutrition tracker that treats micronutrients, phytonutrients and glycemic load as first-class data.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfc" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b1a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DetailLevelProvider>
          <AppShell>{children}</AppShell>
        </DetailLevelProvider>
      </body>
    </html>
  );
}

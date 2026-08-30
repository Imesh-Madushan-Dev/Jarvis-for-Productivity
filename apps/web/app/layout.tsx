import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { OfflineIndicator } from "@/components/offline-indicator";

const figtreeHeading = Figtree({subsets:['latin'],variable:'--font-heading'});

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
  title: { default: "Moly", template: "%s · Moly" },
  description:
    "Agentic daily planner: tasks, calendar, and an assistant that runs them.",
  applicationName: "Moly",
  appleWebApp: {
    capable: true,
    title: "Moly",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  // Draw under the notch/home indicator; layouts opt back in with p-safe-*.
  viewportFit: "cover",
  // Keeps the composer above the mobile keyboard instead of behind it.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("dark", "h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable, figtreeHeading.variable)}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <OfflineIndicator />
      </body>
    </html>
  );
}

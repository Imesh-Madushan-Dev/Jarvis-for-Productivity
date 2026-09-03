import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { OfflineIndicator } from "@/components/offline-indicator";
import { ThemeProvider } from "@/components/theme/theme-provider";

const figtreeHeading = Figtree({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
  // Draw under the notch/home indicator; layouts opt back in with p-safe-*.
  viewportFit: "cover",
  // Keeps the composer above the mobile keyboard instead of behind it.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
        figtreeHeading.variable,
      )}
    >
      {/* overflow-x-clip, not hidden: clipping keeps the page from
            scrolling sideways when a child overruns, without turning the body
            into a scroll container (which would break the fixed dock). */}
      <body className="flex min-h-full flex-col overflow-x-clip">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <OfflineIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}

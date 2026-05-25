import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LaunchPad — The PostgREST-Powered SaaS Boilerplate",
  description:
    "Ship your SaaS in days, not months. The only Next.js boilerplate with PostgREST — zero API routes to write or maintain. Your database IS your API.",
  keywords: [
    "SaaS boilerplate",
    "PostgREST",
    "Next.js",
    "TypeScript",
    "Tailwind CSS",
    "shadcn/ui",
    "Row Level Security",
    "PostgreSQL",
    "starter kit",
  ],
  openGraph: {
    title: "LaunchPad — The PostgREST-Powered SaaS Boilerplate",
    description:
      "Zero API code. Your database IS your API. Ship 10x faster with PostgREST + Next.js.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

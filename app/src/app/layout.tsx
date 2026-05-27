import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/query-provider";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { CookieBanner } from "@/components/compliance/CookieBanner";
import { DNAReadyBadge } from "@/components/profile/DNAReadyBadge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Founder Fate — Rehearse the Future Before You Fund It",
  description:
    "Founder Fate simulates the long-term consequences of your hiring, fundraising, and strategy decisions. See what your choices cost before you pay the price.",
  keywords: [
    "founder simulator",
    "decision simulator",
    "startup decision support",
    "fundraising simulator",
    "pre-mortem",
    "Decision DNA",
  ],
  openGraph: {
    title: "Founder Fate — Rehearse the Future Before You Fund It",
    description:
      "Run your hiring plan, fundraise size, or pivot through a 10-year multi-agent simulation before you commit real capital.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ReactQueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <UpgradeDialog />
              <DNAReadyBadge />
              <CookieBanner />
              <Toaster />
            </ThemeProvider>
          </ReactQueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

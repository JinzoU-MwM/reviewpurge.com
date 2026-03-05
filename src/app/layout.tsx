import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { MainNav } from "@/components/main-nav";

const sansFont = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://reviewpurge.com"),
  title: {
    default: "ReviewPurge",
    template: "%s | ReviewPurge",
  },
  description:
    "Product discovery platform for Indonesia and global tools with reviews, comparisons, and affiliate recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sansFont.variable} ${monoFont.variable} ${displayFont.variable} antialiased`}
      >
        <a href="#main-content" className="skip-nav">
          Skip to content
        </a>
        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 md:px-6">
          <MainNav />
          <main id="main-content" className="flex-1 py-10">
            {children}
          </main>
          <footer className="mt-10 border-t border-slate-300/60 py-6 text-sm text-slate-600">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p>(c) {new Date().getFullYear()} ReviewPurge. All rights reserved.</p>
              <p className="font-mono text-xs uppercase tracking-wide text-slate-500">
                Affiliate Intelligence Layer
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}



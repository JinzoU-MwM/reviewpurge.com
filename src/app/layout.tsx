import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MainNav } from "@/components/main-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 md:px-6">
          <MainNav />
          <main className="flex-1 py-10">{children}</main>
          <footer className="border-t border-slate-200 py-6 text-sm text-slate-600">
            <p>© {new Date().getFullYear()} ReviewPurge. All rights reserved.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}

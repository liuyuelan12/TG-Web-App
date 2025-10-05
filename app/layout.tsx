import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import Link from 'next/link'
import ClientSideNav from '@/components/nav'
import type { Metadata } from 'next'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Telegram Bot Web App",
  description: "一个强大的 Telegram 机器人管理系统，支持自动水群、消息抓取、Session 管理等功能。多用户并发支持，安全可靠。",
  keywords: ["Telegram", "Bot", "自动水群", "消息抓取", "Session管理", "多用户"],
  authors: [{ name: "TG Bot Team" }],
  icons: {
    icon: "/tg-logo.png",
    shortcut: "/tg-logo.png",
    apple: "/tg-logo.png",
  },
  openGraph: {
    title: "Telegram Bot Web App",
    description: "强大的 Telegram 机器人管理系统",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <div className="min-h-screen bg-gray-100">
          <header className="bg-white shadow-md">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/" className="flex items-center gap-2">
                    <img src="/tg-logo.png" alt="TG Bot Logo" className="h-8 w-8" />
                    <span className="text-xl font-bold text-gray-900">Telegram Bot</span>
                  </Link>
                </div>
                <div className="flex items-center">
                  <ClientSideNav />
                </div>
              </div>
            </nav>
          </header>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}

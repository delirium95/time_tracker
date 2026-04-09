import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Time Tracker",
  description: "Track your time across projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-indigo-600 text-lg">TimeTracker</span>
          <Link href="/" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
            Timer
          </Link>
          <Link href="/projects" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
            Projects
          </Link>
          <Link href="/reports" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
            Reports
          </Link>
          <span className="ml-auto text-xs text-gray-400 hidden sm:block">
            Space — start/stop · Esc — cancel
          </span>
        </nav>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpoonMate - 자산 관리 시스템",
  description: "사내 소프트웨어 자산 관리 및 만료 알림 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}
      >
        {/* 상단 헤더 - 로고 */}
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3 px-6 py-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/spoonmate.png"
                alt="SpoonMate Logo"
                width={100}
                height={0}
                className="object-contain"
              />
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                SpoonMate
              </span>
            </Link>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main>{children}</main>
      </body>
    </html>
  );
}

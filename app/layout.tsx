import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import InAppBrowserHandler from "./components/InAppBrowserHandler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 프로젝트 성격에 맞춰 메타데이터를 미리 수정해두면 SEO와 공유 시 유리합니다.
export const metadata: Metadata = {
  title: "캠풀링 (Campooling)",
  description: "군장병을 위한 스마트한 카풀 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 카카오톡 인앱 브라우저 탈출 로직:
          body 최상단에 배치하여 페이지 콘텐츠가 보이기 전/후 즉시 실행되도록 합니다.
        */}
        <InAppBrowserHandler />
        
        {children}
      </body>
    </html>
  );
}
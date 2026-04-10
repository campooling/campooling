import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import InAppBrowserHandler from "./components/InAppBrowserHandler";
import InstallPrompt from "./components/InstallPrompt";

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
  manifest: "/manifest.json",
  applicationName: "캠풀링",
  appleWebApp: {
    capable: true,
    title: "캠풀링",
    statusBarStyle: "default",
  },
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/taxi-192.png", sizes: "192x192", type: "image/png" },
    ],
    icon: [
      { url: "/icons/taxi-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/taxi-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
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
        <InstallPrompt />
        
        {children}
      </body>
    </html>
  );
}
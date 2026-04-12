import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import InAppBrowserHandler from "./components/InAppBrowserHandler";
import InstallPrompt from "./components/InstallPrompt";
import { UnreadProvider } from "./components/UnreadContext";

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
  title: "Campooling",
  description: "군장병을 위한 스마트한 카풀 서비스",
  manifest: "/manifest.json",
  applicationName: "Campooling",
  appleWebApp: {
    capable: true,
    title: "Campooling",
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
        <Script
          id="pwa-prompt-capture"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.__pwaPromptEvent=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaPromptEvent=e;});`,
          }}
        />
        <InAppBrowserHandler />
        <InstallPrompt />
        <UnreadProvider>
          {children}
        </UnreadProvider>
      </body>
    </html>
  );
}
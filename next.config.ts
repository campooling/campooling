import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // 개발 모드 우하단 Next.js "N" 표시 비활성화 (로그인 화면 등 UI 가림 방지)
  devIndicators: false,
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  skipWaiting: true,
  clientsClaim: true,
  dynamicStartUrl: false,
  cacheOnFrontEndNav: false,
  reloadOnOnline: true,
})(nextConfig);

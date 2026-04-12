"use client";

import { useEffect, useState } from "react";

const IN_APP_PATTERNS = [
  "kakaotalk",
  "instagram",
  "fbav",        // Facebook App
  "fban",        // Facebook App (alternate)
  "fb_iab",      // Facebook In-App Browser
  "line/",       // Line
  "naver",       // Naver App
  "band/",       // Band App
];

type MobilePlatform = "android" | "ios" | null;

function detectMobile(): MobilePlatform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return null;
}

function detectInApp(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  for (const pattern of IN_APP_PATTERNS) {
    if (ua.includes(pattern)) return pattern;
  }
  return null;
}

function getAppName(pattern: string): string {
  if (pattern === "kakaotalk") return "KakaoTalk";
  if (pattern === "instagram") return "Instagram";
  if (pattern.startsWith("fb")) return "Facebook";
  if (pattern.startsWith("line")) return "Line";
  if (pattern === "naver") return "Naver";
  if (pattern.startsWith("band")) return "Band";
  return "App";
}

function openInChrome() {
  const url = window.location.href;
  const raw = url.replace(/https?:\/\//, "");
  const intentUrl = `intent://${raw}#Intent;scheme=https;package=com.android.chrome;end`;
  window.location.href = intentUrl;
}

export default function InAppBrowserHandler() {
  const [showFallback, setShowFallback] = useState<"android" | "ios" | null>(null);
  const [appName, setAppName] = useState("App");

  useEffect(() => {
    const mobile = detectMobile();
    if (!mobile) return;

    const inApp = detectInApp();
    if (!inApp) return;

    const name = getAppName(inApp);
    setAppName(name);
    console.log(`[InApp] Detected: ${name} on ${mobile}`);

    if (mobile === "android") {
      openInChrome();
      // intent 실행이 실패하면 1.5초 후 안내 UI 노출
      const timer = setTimeout(() => setShowFallback("android"), 1500);
      return () => clearTimeout(timer);
    }

    // iOS: 강제 실행 불가 → 즉시 가이드 오버레이
    setShowFallback("ios");
  }, []);

  if (!showFallback) return null;

  if (showFallback === "android") {
    return <AndroidFallback appName={appName} />;
  }

  return <IosOverlay appName={appName} />;
}

/* ─── Android: Chrome 실행 실패 시 안내 페이지 ─── */
function AndroidFallback({ appName }: { appName: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm text-center">
        {/* icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900">
          외부 브라우저에서 열어주세요
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          <strong>{appName}</strong> 내장 브라우저에서는 일부 기능이 제한됩니다.
          <br />
          Chrome으로 열어야 정상적으로 이용할 수 있습니다.
        </p>

        <button
          type="button"
          onClick={openInChrome}
          className="mt-8 w-full rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white shadow-sm transition active:scale-[0.98] hover:bg-blue-700"
        >
          Chrome으로 열기
        </button>

        <p className="mt-4 text-xs text-gray-400">
          버튼이 작동하지 않으면 URL을 복사하여
          <br />
          Chrome 주소창에 직접 붙여넣기 해주세요.
        </p>
      </div>
    </div>
  );
}

/* ─── iOS: Safari 안내 오버레이 ─── */
function IosOverlay({ appName }: { appName: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* 상단 브랜드 영역 */}
      <div className="flex flex-1 flex-col items-center justify-center px-8">
        {/* logo / icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-4xl shadow-lg">
          🚕
        </div>

        <h1 className="text-xl font-bold text-gray-900">Campooling</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">
          <strong>{appName}</strong> 내장 브라우저에서는
          <br />
          일부 기능이 제한됩니다.
        </p>

        {/* 안내 카드 */}
        <div className="mt-8 w-full max-w-xs rounded-2xl border border-blue-100 bg-blue-50 px-5 py-5">
          <p className="text-center text-[15px] font-semibold leading-snug text-blue-900">
            아래 순서대로 진행해주세요
          </p>
          <ol className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                1
              </span>
              <span>
                우측 하단의 <strong>⋯</strong> 또는 <strong>나침반 아이콘</strong>을 눌러주세요
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                2
              </span>
              <span>
                메뉴에서 <strong>&quot;Safari로 열기&quot;</strong>를 선택해주세요
              </span>
            </li>
          </ol>
        </div>
      </div>

      {/* 하단 화살표 안내 */}
      <div className="pb-10 pt-4 text-center">
        <div className="inline-flex animate-bounce items-center gap-1 text-blue-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className="text-sm font-semibold">여기를 확인하세요</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </div>
  );
}

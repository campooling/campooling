"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const SIGNUP_COMPLETED_KEY = "signup_completed";
const USER_TYPE_KEY = "user_type";
const DISMISS_UNTIL_KEY = "installPromptDismissUntil";
const DISMISS_TTL_MS = 60 * 1000; // 1분
const PWA_INSTALLED_KEY = "pwaInstalled";

type PromptLocale = "ko" | "en";
type BrowserKind = "ios-safari" | "ios-chrome" | "android-chrome" | "android-samsung" | "android-other" | "desktop";

function detectBrowser(): BrowserKind {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  if (isIos) {
    // iOS에서 Chrome, Firefox, Edge 등은 WebKit 기반이지만 "CriOS", "FxiOS", "EdgiOS" 포함
    if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) return "ios-chrome";
    return "ios-safari";
  }
  const isAndroid = /android/i.test(ua);
  if (isAndroid) {
    if (/SamsungBrowser/i.test(ua)) return "android-samsung";
    if (/Chrome/i.test(ua) && !/OPR|Edge/i.test(ua)) return "android-chrome";
    return "android-other";
  }
  return "desktop";
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isDismissedWithinTtl() {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_UNTIL_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
}

function shouldBlockPath(pathname: string) {
  return pathname === "/" || pathname === "/signup" || pathname.startsWith("/auth");
}

function canShowPrompt(pathname: string) {
  if (typeof window === "undefined") return false;
  const isSignupCompleted = localStorage.getItem(SIGNUP_COMPLETED_KEY) === "true";
  const isPwaInstalled = localStorage.getItem(PWA_INSTALLED_KEY) === "true";
  const dismissed = isDismissedWithinTtl();
  const isStandalone = isInStandaloneMode();
  return isSignupCompleted && !isPwaInstalled && !dismissed && !shouldBlockPath(pathname) && !isStandalone;
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [locale, setLocale] = useState<PromptLocale>("en");
  const [browser, setBrowser] = useState<BrowserKind>("desktop");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const detectedBrowser = detectBrowser();
    setBrowser(detectedBrowser);

    const userType = localStorage.getItem(USER_TYPE_KEY);
    const isKatusa = userType === "KATUSA";
    setLocale(isKatusa ? "ko" : "en");

    const show = canShowPrompt(pathname);
    console.log("PWA: 초기 노출 조건", { browser: detectedBrowser, show, pathname });
    setShowPrompt(show);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      console.log("PWA: beforeinstallprompt 이벤트 저장됨");
      if (canShowPrompt(pathname) && !isInStandaloneMode()) {
        setShowPrompt(true);
      }
    };

    const onAuthReady = () => {
      console.log("PWA: campooling:authReady 이벤트 수신");
      if (canShowPrompt(pathname)) {
        setShowPrompt(true);
      }
    };

    const onAppInstalled = () => {
      console.log("PWA: appinstalled 이벤트 감지됨");
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      setInstallSuccess(true);
      setIsInstalling(false);
      setTimeout(() => setShowPrompt(false), 4000);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (mediaQuery.matches || isInStandaloneMode()) {
        setShowPrompt(false);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && isInStandaloneMode()) {
        setShowPrompt(false);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt, true);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("campooling:authReady", onAuthReady);
    mediaQuery.addEventListener("change", onDisplayModeChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt, true);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("campooling:authReady", onAuthReady);
      mediaQuery.removeEventListener("change", onDisplayModeChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  const closePrompt = () => {
    localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_TTL_MS));
    setShowPrompt(false);
    setInstallSuccess(false);
  };

  const [showManualFallback, setShowManualFallback] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPromptRef.current) {
      setIsInstalling(true);
      try {
        await deferredPromptRef.current.prompt();
        const result = await deferredPromptRef.current.userChoice;
        if (result.outcome === "accepted") {
          localStorage.setItem(PWA_INSTALLED_KEY, "true");
          setInstallSuccess(true);
          setTimeout(() => setShowPrompt(false), 4000);
        }
      } finally {
        setIsInstalling(false);
        deferredPromptRef.current = null;
      }
      return;
    }
    // deferredPrompt가 없는 경우 → 수동 안내 표시
    setShowManualFallback(true);
  };

  if (!showPrompt) return null;

  const isIos = browser === "ios-safari" || browser === "ios-chrome";

  const titleText =
    locale === "ko"
      ? "더 빠르고 편리한 캠풀링 앱을 만나보세요."
      : "Experience Campooling App for a faster & better ride.";
  const installButtonText = isInstalling
    ? locale === "ko" ? "설치 중..." : "Installing..."
    : locale === "ko" ? "지금 설치하기" : "Install Now";

  const renderManualGuide = () => {
    if (installSuccess) return null;

    if (browser === "ios-safari") {
      return (
        <p className="mt-3 text-xs leading-relaxed text-gray-600">
          {locale === "ko"
            ? <>하단 공유 버튼(□↑)을 누른 뒤 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요.</>
            : <>Tap Share (□↑) at the bottom, then choose <strong>&quot;Add to Home Screen&quot;</strong>.</>}
        </p>
      );
    }
    if (browser === "ios-chrome") {
      return (
        <p className="mt-3 text-xs leading-relaxed text-gray-600">
          {locale === "ko"
            ? <>Safari에서 열어야 홈 화면에 추가할 수 있습니다. <strong>Safari</strong>로 이 페이지를 열어주세요.</>
            : <>Open this page in <strong>Safari</strong> to add it to your home screen.</>}
        </p>
      );
    }
    if (browser === "android-samsung") {
      return (
        <p className="mt-3 text-xs leading-relaxed text-gray-600">
          {locale === "ko"
            ? <>메뉴(≡) → <strong>&quot;현재 페이지 추가&quot;</strong> → <strong>&quot;홈 화면&quot;</strong>을 선택하세요.</>
            : <>Tap Menu (≡) → <strong>&quot;Add page to&quot;</strong> → <strong>&quot;Home screen&quot;</strong>.</>}
        </p>
      );
    }
    // Android Chrome에서 deferredPrompt가 아직 없을 때 버튼 클릭 → 수동 안내
    if (showManualFallback && (browser === "android-chrome" || browser === "android-other")) {
      return (
        <p className="mt-3 text-xs leading-relaxed text-gray-600">
          {locale === "ko"
            ? <>우측 상단 메뉴(⋮) → <strong>&quot;앱 설치&quot;</strong> 또는 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요.</>
            : <>Tap Menu (⋮) at the top right → <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</>}
        </p>
      );
    }
    return null;
  };

  return (
    <div
      className="fixed left-0 right-0 z-[130] px-4"
      style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}
    >
      <div className="relative mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
        <button
          type="button"
          aria-label="설치 안내 닫기"
          onClick={closePrompt}
          className="absolute right-4 top-4 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          ✕
        </button>
        <div className="flex items-center gap-4 pr-8">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            🚕
          </div>
          <p className="text-sm font-semibold leading-snug text-gray-900">
            {titleText}
          </p>
        </div>
        {renderManualGuide()}
        {installSuccess ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <span>✅</span>
            <span>
              {locale === "ko"
                ? "설치가 완료되었습니다. 바탕화면으로 꺼내 주세요."
                : "Installation complete. Open it from your home screen!"}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {installButtonText}
          </button>
        )}
      </div>
    </div>
  );
}

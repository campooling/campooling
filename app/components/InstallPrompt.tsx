"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "installPromptDismissed";
const SIGNUP_COMPLETED_KEY = "signup_completed";
const USER_TYPE_KEY = "user_type";

type PromptLocale = "ko" | "en";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstalledToast, setShowInstalledToast] = useState(false);
  const installedToastTimerRef = useRef<number | null>(null);
  const [locale, setLocale] = useState<PromptLocale>("en");
  const [isIos] = useState(() => {
    if (typeof window === "undefined") return false;
    return isIosDevice();
  });
  const [showPrompt, setShowPrompt] = useState(() => {
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userType = localStorage.getItem(USER_TYPE_KEY);
    const isKatusa = userType === "KATUSA";
    setLocale(isKatusa ? "ko" : "en");

    const isSignupCompleted = localStorage.getItem(SIGNUP_COMPLETED_KEY) === "true";
    const dismissed = localStorage.getItem(DISMISS_KEY) === "true";
    const shouldBlockByPath = pathname === "/" || pathname === "/signup";
    const isStandalone = isInStandaloneMode();
    const canShow = isSignupCompleted && !dismissed && !shouldBlockByPath && !isStandalone;

    setShowPrompt(canShow);
    if (isStandalone) {
      setShowInstalledToast(false);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      if (isInStandaloneMode()) {
        setShowPrompt(false);
        return;
      }
      const dismissedNow = localStorage.getItem(DISMISS_KEY) === "true";
      const signupCompletedNow = localStorage.getItem(SIGNUP_COMPLETED_KEY) === "true";
      const blockedNow = pathname === "/" || pathname === "/signup";
      if (dismissedNow || !signupCompletedNow || blockedNow) {
        return;
      }
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const onAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsInstalling(false);
      setShowInstalledToast(true);
      if (installedToastTimerRef.current) {
        window.clearTimeout(installedToastTimerRef.current);
      }
      installedToastTimerRef.current = window.setTimeout(() => {
        setShowInstalledToast(false);
      }, 4500);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (mediaQuery.matches || isInStandaloneMode()) {
        setShowPrompt(false);
        setShowInstalledToast(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && isInStandaloneMode()) {
        setShowPrompt(false);
        setShowInstalledToast(false);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    mediaQuery.addEventListener("change", onDisplayModeChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mediaQuery.removeEventListener("change", onDisplayModeChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (installedToastTimerRef.current) {
        window.clearTimeout(installedToastTimerRef.current);
      }
    };
  }, [pathname]);

  const closePrompt = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setShowPrompt(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setShowPrompt(false);
      }
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt && !showInstalledToast) return null;

  const titleText =
    locale === "ko"
      ? "더 빠르게, 더 편하게. 앱으로 만나보세요."
      : "Faster & Simpler. Get the App.";
  const installButtonText = isInstalling
    ? locale === "ko"
      ? "설치 중..."
      : "Installing..."
    : locale === "ko"
      ? "지금 설치"
      : "Install Now";
  const completionText =
    locale === "ko"
      ? "설치가 완료되었습니다! 앱 목록에서 캠풀링을 찾아 홈 화면으로 꺼내주세요."
      : "Done! Find Campooling in your app list and add it to your home screen.";

  return (
    <>
      {showPrompt ? (
        <div
          className="fixed left-0 right-0 z-[120] px-4"
          style={{
            bottom: "calc(84px + env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto w-full max-w-xl rounded-2xl border border-blue-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 leading-snug">{titleText}</p>
                {isIos ? (
                  <p className="mt-1 text-xs leading-relaxed text-gray-600 break-words">
                    iOS: 하단 공유 버튼(□↑)을 누른 뒤 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요.
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-gray-600 break-words">
                    홈 화면에 추가하면 앱처럼 바로 실행할 수 있습니다.
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="설치 안내 닫기"
                onClick={closePrompt}
                className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            {!isIos && deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="mt-3 w-full rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {installButtonText}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {showInstalledToast ? (
        <div
          className="fixed left-1/2 z-[130] w-[min(92vw,560px)] -translate-x-1/2 px-2"
          style={{
            bottom: "calc(84px + env(safe-area-inset-bottom))",
          }}
        >
          <div className="rounded-2xl bg-slate-900 p-4 shadow-2xl">
            <p className="text-sm font-semibold leading-relaxed text-white">{completionText}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

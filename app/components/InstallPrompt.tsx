"use client";

import { useEffect, useState } from "react";
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

function isDismissedWithinTtl() {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_UNTIL_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [locale, setLocale] = useState<PromptLocale>("en");
  const [isIos, setIsIos] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const detectedIsIos = isIosDevice();
    setIsIos(detectedIsIos);

    const userType = localStorage.getItem(USER_TYPE_KEY);
    const isKatusa = userType === "KATUSA";
    setLocale(isKatusa ? "ko" : "en");
    console.log("PWA: user_type 감지", { userType });

    const isSignupCompleted = localStorage.getItem(SIGNUP_COMPLETED_KEY) === "true";
    const isPwaInstalled = localStorage.getItem(PWA_INSTALLED_KEY) === "true";
    const dismissed = isDismissedWithinTtl();
    const shouldBlockByPath =
      pathname === "/" ||
      pathname === "/signup" ||
      pathname.startsWith("/auth");
    const isStandalone = isInStandaloneMode();
    const hasUserContext = isSignupCompleted;
    const canShow =
      hasUserContext && !isPwaInstalled && !dismissed && !shouldBlockByPath && !isStandalone;

    console.log("PWA: 초기 노출 조건", {
      isSignupCompleted,
      isPwaInstalled,
      dismissed,
      shouldBlockByPath,
      isStandalone,
      isIos: detectedIsIos,
      canShow,
    });

    // iOS: 조건 충족 시 즉시 표시
    // Android: beforeinstallprompt 이벤트에서만 표시 (이미 설치된 경우 이벤트 미발생 → 팝업 안 뜸)
    if (detectedIsIos) {
      setShowPrompt(canShow);
    } else {
      if (!canShow) setShowPrompt(false);
    }

    if (detectedIsIos && canShow) {
      console.log("PWA: iOS 모드 활성화");
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isInStandaloneMode()) {
        console.log("PWA: beforeinstallprompt 수신했지만 standalone이라 숨김");
        setShowPrompt(false);
        return;
      }
      const signupCompletedNow = localStorage.getItem(SIGNUP_COMPLETED_KEY) === "true";
      const isPwaInstalledNow = localStorage.getItem(PWA_INSTALLED_KEY) === "true";
      const dismissedNow = isDismissedWithinTtl();
      const blockedNow =
        pathname === "/" ||
        pathname === "/signup" ||
        pathname.startsWith("/auth");
      if (!signupCompletedNow || isPwaInstalledNow || dismissedNow || blockedNow) {
        console.log("PWA: 이벤트 감지됐지만 노출 조건 불충족", {
          signupCompletedNow,
          isPwaInstalledNow,
          dismissedNow,
          blockedNow,
        });
        return;
      }
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowPrompt(true);
      console.log("PWA: 이벤트 감지됨 (beforeinstallprompt)");
    };

    const onAppInstalled = () => {
      console.log("PWA: appinstalled 이벤트 감지됨");
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      setInstallSuccess(true);
      setDeferredPrompt(null);
      setIsInstalling(false);
      // 성공 메시지를 4초간 보여준 뒤 닫기
      setTimeout(() => setShowPrompt(false), 4000);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (mediaQuery.matches || isInStandaloneMode()) {
        console.log("PWA: Standalone 모드 감지로 인해 숨김");
        setShowPrompt(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && isInStandaloneMode()) {
        console.log("PWA: Standalone 모드 감지로 인해 숨김");
        setShowPrompt(false);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt, true);
    window.addEventListener("appinstalled", onAppInstalled);
    mediaQuery.addEventListener("change", onDisplayModeChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt, true);
      window.removeEventListener("appinstalled", onAppInstalled);
      mediaQuery.removeEventListener("change", onDisplayModeChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  const closePrompt = () => {
    localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_TTL_MS));
    console.log("PWA: 사용자가 팝업 닫음 (1분 후 재노출 가능)");
    setShowPrompt(false);
    setInstallSuccess(false);
  };

  const handleInstallClick = async () => {
    if (isIos) {
      setInstallSuccess(true);
      return;
    }
    if (!deferredPrompt) {
      console.log("PWA: deferredPrompt가 없어 원본 설치 모달을 열 수 없음");
      return;
    }

    setIsInstalling(true);
    console.log("PWA: 설치 요청 시작");
    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      console.log("PWA: 설치 선택 결과", result);
      if (result.outcome === "accepted") {
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
        setInstallSuccess(true);
        setTimeout(() => setShowPrompt(false), 4000);
      }
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;
  // Android에서 beforeinstallprompt 미발생 = 이미 설치됨
  if (!isIos && !deferredPrompt && !installSuccess) return null;

  const titleText =
    locale === "ko"
      ? "더 빠르고 편리한 캠풀링 앱을 만나보세요."
      : "Experience Campooling App for a faster & better ride.";
  const installButtonText = isInstalling
    ? locale === "ko"
      ? "설치 중..."
      : "Installing..."
    : locale === "ko"
      ? "지금 설치하기"
      : "Install Now";

  return (
    <div
      className="fixed left-0 right-0 z-[130] px-4"
      style={{
        bottom: "calc(84px + env(safe-area-inset-bottom))",
      }}
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
        {isIos && !installSuccess ? (
          <p className="mt-3 text-xs leading-relaxed text-gray-600">
            {locale === "ko"
              ? <>사파리 공유 버튼(□↑)을 누른 뒤 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요.</>
              : <>Tap Share (□↑) in Safari, then choose <strong>&quot;Add to Home Screen&quot;</strong>.</>}
          </p>
        ) : null}
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
            disabled={isInstalling || (!isIos && !deferredPrompt)}
            className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {installButtonText}
          </button>
        )}
      </div>
    </div>
  );
}

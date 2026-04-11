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
  const [locale, setLocale] = useState<PromptLocale>("en");
  const [isIos, setIsIos] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // SSR 하이드레이션 문제를 피하기 위해 useEffect 내에서 iOS 감지
    const detectedIsIos = isIosDevice();
    setIsIos(detectedIsIos);

    const userType = localStorage.getItem(USER_TYPE_KEY);
    const isKatusa = userType === "KATUSA";
    setLocale(isKatusa ? "ko" : "en");
    console.log("PWA: user_type 감지", { userType });

    const isSignupCompleted = localStorage.getItem(SIGNUP_COMPLETED_KEY) === "true";
    // auth 플로우 전체 경로와 회원가입 전 단계를 모두 차단
    const shouldBlockByPath =
      pathname === "/" ||
      pathname === "/signup" ||
      pathname.startsWith("/auth");
    const isStandalone = isInStandaloneMode();
    // signup_completed만 체크: user_type은 중간 단계에서도 설정될 수 있어 제외
    const hasUserContext = isSignupCompleted;
    const canShow = hasUserContext && !shouldBlockByPath && !isStandalone;

    console.log("PWA: 초기 노출 조건", {
      isSignupCompleted,
      shouldBlockByPath,
      isStandalone,
      isIos: detectedIsIos,
      hasUserContext,
      canShow,
    });

    setShowPrompt(canShow);
    if (detectedIsIos && canShow) {
      console.log("PWA: iOS 모드 활성화");
    }

    const onBeforeInstallPrompt = (event: Event) => {
      // 브라우저 상단 자동 인포바를 막고, 우리가 만든 하단 UI에서만 트리거한다.
      event.preventDefault();
      if (isInStandaloneMode()) {
        console.log("PWA: beforeinstallprompt 수신했지만 standalone이라 숨김");
        setShowPrompt(false);
        return;
      }
      const signupCompletedNow = localStorage.getItem(SIGNUP_COMPLETED_KEY) === "true";
      const hasUserContextNow = signupCompletedNow;
      const blockedNow =
        pathname === "/" ||
        pathname === "/signup" ||
        pathname.startsWith("/auth");
      if (!hasUserContextNow || blockedNow) {
        console.log("PWA: 이벤트 감지됐지만 노출 조건 불충족", {
          signupCompletedNow,
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
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsInstalling(false);
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

    // beforeinstallprompt 이벤트 누락 방지를 위해 캡처 단계에서도 리스닝
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
    console.log("PWA: 사용자가 팝업 닫음 (다음 방문 시 재노출)");
    setShowPrompt(false);
  };

  const handleInstallClick = async () => {
    if (isIos) {
      alert(
        locale === "ko"
          ? 'Safari 공유 버튼(□↑) > "홈 화면에 추가"를 선택해주세요.'
          : 'Tap Share (□↑) in Safari, then choose "Add to Home Screen".'
      );
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
        setShowPrompt(false);
      }
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

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
        {isIos ? (
          <p className="mt-3 text-xs leading-relaxed text-gray-600">
            {locale === "ko"
              ? <>사파리 공유 버튼(□↑)을 누른 뒤 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요.</>
              : <>Tap Share (□↑) in Safari, then choose <strong>&quot;Add to Home Screen&quot;</strong>.</>}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalling || (!isIos && !deferredPrompt)}
          className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {installButtonText}
        </button>
      </div>
    </div>
  );
}

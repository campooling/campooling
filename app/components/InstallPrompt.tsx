"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

// ╔═══════════════════════════════════════════════════════════════╗
// ║  FORCE_TEST_MODE — true면 localStorage 닫기 기록을 무시합니다  ║
// ╚═══════════════════════════════════════════════════════════════╝
const FORCE_TEST_MODE = false;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const SIGNUP_COMPLETED_KEY = "signup_completed";
const USER_TYPE_KEY = "user_type";
const DISMISS_KEY = "installPromptDismissUntil";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
const PWA_INSTALLED_KEY = "pwaInstalled";

type Platform = "android" | "ios" | "desktop";
type Locale = "ko" | "en";

const COPY = {
  ko: {
    title: "캠풀링 앱 설치",
    subtitle: "더 빠르고 쾌적하게 이용하세요",
    install: "지금 설치",
    installing: "설치 중...",
    done: "설치가 완료되었습니다. 홈 화면에서 열어주세요!",
    iosGuide:
      '하단 공유 버튼(□↑)을 누른 뒤 "홈 화면에 추가"를 선택하세요.',
    iosChromeGuide:
      "Safari에서 열어야 홈 화면에 추가할 수 있습니다. Safari로 이 페이지를 열어주세요.",
  },
  en: {
    title: "Get Campooling App",
    subtitle: "Install for a better experience",
    install: "Install Now",
    installing: "Installing...",
    done: "Installation complete. Open it from your home screen!",
    iosGuide:
      'Tap Share (□↑) at the bottom, then choose "Add to Home Screen".',
    iosChromeGuide:
      "Open this page in Safari to add it to your home screen.",
  },
} as const;

function log(message: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[PWA] ${message}`, data);
  } else {
    console.log(`[PWA] ${message}`);
  }
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isNonSafari = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return isIos && !isNonSafari;
}

function isDismissed(): boolean {
  if (FORCE_TEST_MODE) return false;
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && Date.now() < until;
}

function canShow(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalone()) {
    log("Standalone mode detected — prompt suppressed");
    return false;
  }
  if (localStorage.getItem(PWA_INSTALLED_KEY) === "true") {
    log("Already installed flag found — prompt suppressed");
    return false;
  }
  if (isDismissed()) {
    log("User dismissed recently — prompt suppressed");
    return false;
  }
  const isSignedUp = localStorage.getItem(SIGNUP_COMPLETED_KEY) === "true";
  if (!isSignedUp) {
    log("Signup not completed — prompt suppressed");
    return false;
  }
  const blocked = pathname === "/" || pathname === "/signup" || pathname.startsWith("/auth");
  if (blocked) {
    log(`Blocked route (${pathname}) — prompt suppressed`);
    return false;
  }
  return true;
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [locale, setLocale] = useState<Locale>("en");
  const [installing, setInstalling] = useState(false);
  const [success, setSuccess] = useState(false);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_TTL_MS));
    setVisible(false);
    setSuccess(false);
    log("User dismissed the prompt");
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredRef.current;
    if (!prompt) return;
    setInstalling(true);
    log("Triggering native install prompt");
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      log("User choice", outcome);
      if (outcome === "accepted") {
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
        setSuccess(true);
        setTimeout(() => setVisible(false), 4000);
      }
    } finally {
      setInstalling(false);
      deferredRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const detected = detectPlatform();
    setPlatform(detected);
    log(`Platform detected: ${detected}`);

    const userType = localStorage.getItem(USER_TYPE_KEY);
    const lang: Locale = userType === "KATUSA" ? "ko" : "en";
    setLocale(lang);
    log(`Locale set to: ${lang} (user_type=${userType})`);

    if (isStandalone()) {
      log("Already running as installed PWA — no prompt");
      return;
    }

    const eligible = canShow(pathname);

    if (detected === "ios") {
      log(isIosSafari() ? "iOS Safari detected" : "iOS non-Safari detected");
      if (eligible) {
        setVisible(true);
        log("Showing iOS manual guide");
      }
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      log("Install event captured (beforeinstallprompt)");
      if (canShow(pathname)) {
        setVisible(true);
        log("Showing install button (Android/Desktop)");
      }
    };

    const onAppInstalled = () => {
      log("App installed event fired");
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      setSuccess(true);
      setInstalling(false);
      setTimeout(() => setVisible(false), 4000);
    };

    const onAuthReady = () => {
      if (!canShow(pathname)) return;
      if (detected === "ios") {
        setVisible(true);
      } else if (deferredRef.current) {
        setVisible(true);
      }
      log("authReady event — rechecked visibility");
    };

    const mq = window.matchMedia("(display-mode: standalone)");
    const onMqChange = () => {
      if (mq.matches || isStandalone()) {
        log("Display-mode changed to standalone — hiding prompt");
        setVisible(false);
      }
    };
    const onVisChange = () => {
      if (document.visibilityState === "visible" && isStandalone()) {
        setVisible(false);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("campooling:authReady", onAuthReady);
    mq.addEventListener("change", onMqChange);
    document.addEventListener("visibilitychange", onVisChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("campooling:authReady", onAuthReady);
      mq.removeEventListener("change", onMqChange);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [pathname]);

  // ── SW update: detect new deployments and apply immediately ──
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener("updatefound", () => {
        const newSw = reg.installing;
        if (!newSw) return;
        log("New service worker installing…");

        newSw.addEventListener("statechange", () => {
          if (newSw.state === "installed" && navigator.serviceWorker.controller) {
            log("New SW installed — sending SKIP_WAITING");
            newSw.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      log("Controller changed — reloading page for new version");
      window.location.reload();
    });
  }, []);

  if (!visible) return null;

  const t = COPY[locale];
  const isIos = platform === "ios";
  const safari = isIosSafari();

  return (
    <div
      className="fixed left-0 right-0 z-[130] px-4"
      style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}
    >
      <div className="relative mx-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
        {/* close */}
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {/* header */}
        <div className="flex items-center gap-4 pr-8">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            🚕
          </div>
          <div>
            <p className="text-[15px] font-bold leading-snug text-gray-900">
              {t.title}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">{t.subtitle}</p>
          </div>
        </div>

        {/* success */}
        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <span>✅</span>
            <span>{t.done}</span>
          </div>
        )}

        {/* iOS guide */}
        {!success && isIos && (
          <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
            {safari ? (
              <>
                {locale === "ko" ? (
                  <>하단 공유 버튼(□↑)을 누른 뒤 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요.</>
                ) : (
                  <>Tap <strong>Share (□↑)</strong> at the bottom, then choose <strong>&quot;Add to Home Screen&quot;</strong>.</>
                )}
              </>
            ) : (
              <>
                {locale === "ko" ? (
                  <>Safari에서 열어야 홈 화면에 추가할 수 있습니다. <strong>Safari</strong>로 이 페이지를 열어주세요.</>
                ) : (
                  <>Open this page in <strong>Safari</strong> to add it to your home screen.</>
                )}
              </>
            )}
          </p>
        )}

        {/* Android / Desktop install button */}
        {!success && !isIos && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing || !deferredRef.current}
            className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {installing ? t.installing : t.install}
          </button>
        )}
      </div>
    </div>
  );
}

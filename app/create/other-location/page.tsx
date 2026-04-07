"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function getLocationValidationError(input: string): string | null {
  const value = input.trim();
  if (!value) return "please write right location.";

  const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value);
  if (hasKorean) return "please write with English.";

  // 영어 비속어(공백/특수문자 섞어쓰기 우회 포함)
  const profanityRegex =
    /f[^a-zA-Z0-9]*u[^a-zA-Z0-9]*c[^a-zA-Z0-9]*k|s[^a-zA-Z0-9]*e[^a-zA-Z0-9]*x|b[^a-zA-Z0-9]*i[^a-zA-Z0-9]*t[^a-zA-Z0-9]*c[^a-zA-Z0-9]*h|s[^a-zA-Z0-9]*h[^a-zA-Z0-9]*i[^a-zA-Z0-9]*t|a[^a-zA-Z0-9]*s[^a-zA-Z0-9]*s/i;
  if (profanityRegex.test(value)) return "please write right location.";

  // 연속 특수문자 금지
  if (/[^a-zA-Z0-9\s]{2,}/.test(value)) return "please write right location.";

  // 의미 없는 반복 문자열(예: aaaa) 금지
  if (/([a-zA-Z])\1{3,}/.test(value)) return "please write right location.";

  // 위치명으로 보기 어려운 과도한 기호/숫자 비율 방지
  const cleaned = value.replace(/\s+/g, "");
  const alphaCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
  if (alphaCount < Math.ceil(cleaned.length * 0.5)) return "please write right location.";

  return null;
}

function OtherLocationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") ?? "").toLowerCase();

  const storageKey = useMemo(() => {
    if (type === "origin") return "customLocationOrigin";
    if (type === "destination") return "customLocationDestination";
    return "customLocation";
  }, [type]);

  const [value, setValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const validateValue = (nextValue: string) => {
    const error = getLocationValidationError(nextValue);
    setErrorMessage(error ?? "");
    return !error;
  };

  return (
    <div className="flex h-dvh flex-col bg-white font-sans antialiased">
      <header className="flex items-center gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-600 hover:text-indigo-600"
        >
          Back
        </button>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Other</h1>
      </header>

      <main className="flex-1 px-6 py-6">
        <label className="block text-sm font-semibold text-gray-700 pl-1">
          Enter location
        </label>
        <input
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            if (errorMessage) validateValue(next);
          }}
          onBlur={(e) => {
            validateValue(e.target.value);
          }}
          placeholder="Type here..."
          className={`mt-3 w-full rounded-2xl border bg-white px-5 py-4 text-base font-semibold text-gray-900 shadow-sm outline-none focus:border-indigo-500 ${errorMessage ? "border-red-400" : "border-gray-200"}`}
          autoFocus
        />
        {errorMessage ? (
          <p className="mt-2 pl-1 text-xs font-semibold text-red-500">{errorMessage}</p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-base font-bold text-gray-700 shadow-sm hover:border-purple-200 hover:bg-purple-50 active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => {
              const v = value.trim();
              if (!v) return;
              const isValid = validateValue(v);
              if (!isValid) {
                alert("Invalid location text.");
                return;
              }
              sessionStorage.setItem(storageKey, v);
              router.push("/create");
            }}
            className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-base font-extrabold text-white shadow-lg transition-all hover:from-purple-600 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
          >
            Save
          </button>
        </div>
      </main>
    </div>
  );
}

export default function OtherLocationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-white text-sm font-semibold text-gray-500">
          Loading…
        </div>
      }
    >
      <OtherLocationInner />
    </Suspense>
  );
}

"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type here..."
          className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-base font-semibold text-gray-900 shadow-sm outline-none focus:border-indigo-500"
          autoFocus
        />

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

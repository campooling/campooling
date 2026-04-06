"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { type UserRole } from "../../lib/userProfile";

export default function SignupPage() {
  const router = useRouter();
  const [supabase] = useState(() => (typeof window === 'undefined' ? null : createClient()));
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<UserRole>("KATUSA");
  const [loading, setLoading] = useState(true);

  const hasChecked = React.useRef(false);

  useEffect(() => {
    const checkUser = async () => {
      if (hasChecked.current) return;
      hasChecked.current = true;
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile?.nickname) {
        router.replace("/feed");
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const trimmed = nickname.trim();
    if (!trimmed) {
      alert("Please enter a nickname.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      nickname: trimmed,
      role: role,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert("Error saving profile: " + error.message);
      return;
    }

    router.push("/feed");
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white px-6 font-sans antialiased pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="shrink-0 border-b bg-white py-4">
        <h1 className="text-center text-xl font-bold tracking-tight text-gray-900">
          Set up your profile
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 py-8"
      >
        <div>
          <label
            htmlFor="nickname"
            className="block pl-1 text-sm font-semibold text-gray-700"
          >
            Nickname
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="How should we call you?"
            maxLength={32}
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-base font-semibold text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            autoComplete="nickname"
            autoFocus
          />
        </div>

        <div>
          <p className="mb-3 pl-1 text-sm font-semibold text-gray-700">
            I am
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setRole("USA_ARMY")}
              className={`rounded-2xl border-2 px-5 py-4 text-left transition active:scale-[0.99] ${
                role === "USA_ARMY"
                  ? "border-indigo-600 bg-indigo-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50"
              }`}
            >
              <span className="block text-base font-extrabold text-gray-900">
                U.S. Army
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRole("KATUSA")}
              className={`rounded-2xl border-2 px-5 py-4 text-left transition active:scale-[0.99] ${
                role === "KATUSA"
                  ? "border-indigo-600 bg-indigo-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50"
              }`}
            >
              <span className="block text-base font-extrabold text-gray-900">
                KATUSA
              </span>
            </button>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 text-lg font-extrabold tracking-wide text-white shadow-lg transition hover:from-purple-600 hover:to-indigo-600 active:scale-[0.99]"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}

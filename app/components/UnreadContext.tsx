"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UnreadContextType = {
  totalUnread: number;
  podUnreads: Map<string, number>;
  refreshUnread: () => void;
};

const UnreadContext = createContext<UnreadContextType>({
  totalUnread: 0,
  podUnreads: new Map(),
  refreshUnread: () => {},
});

export function useUnread() {
  return useContext(UnreadContext);
}

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() =>
    typeof window === "undefined" ? null : createClient()
  );
  const [podUnreads, setPodUnreads] = useState<Map<string, number>>(new Map());
  const podIdsRef = useRef<string[]>([]);

  const refreshUnread = useCallback(async () => {
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from("pod_members")
      .select("pod_id, pods!inner(status, departure_time)")
      .eq("user_id", user.id)
      .eq("pods.status", "active");

    if (!memberships) return;

    type MemberRow = {
      pod_id: string;
      pods: { status: string; departure_time: string } | null;
    };

    const now = Date.now();
    const activePodIds = (memberships as MemberRow[])
      .filter((m) => {
        if (!m.pods) return false;
        const ms = new Date(m.pods.departure_time).getTime();
        return Number.isFinite(ms) && ms + 6 * 60 * 60 * 1000 > now;
      })
      .map((m) => m.pod_id);

    podIdsRef.current = activePodIds;

    const unreads = new Map<string, number>();
    await Promise.all(
      activePodIds.map(async (podId) => {
        const lastRead = localStorage.getItem(`chat_read_${podId}`);
        let query = supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("pod_id", podId);
        if (lastRead) {
          query = query.gt("created_at", lastRead);
        }
        const { count } = await query;
        unreads.set(podId, count ?? 0);
      })
    );

    setPodUnreads(new Map(unreads));
  }, [supabase]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  // Realtime: new messages bump the count
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("global_unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: { pod_id?: string } }) => {
          const podId = payload.new.pod_id;
          if (podId && podIdsRef.current.includes(podId)) {
            setPodUnreads((prev) => {
              const next = new Map(prev);
              next.set(podId, (next.get(podId) ?? 0) + 1);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Re-check when user returns to the tab (e.g. after reading a chat)
  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === "visible") {
        refreshUnread();
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [refreshUnread]);

  const totalUnread = Array.from(podUnreads.values()).reduce(
    (sum, n) => sum + n,
    0
  );

  return (
    <UnreadContext.Provider value={{ totalUnread, podUnreads, refreshUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}

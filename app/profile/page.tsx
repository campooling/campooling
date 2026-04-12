"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronRight, CarTaxiFront } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { createClient } from '@/lib/supabase/client';

type MyPod = {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  capacity: number;
  member_count: number;
  unread_count: number;
};

type MembershipRow = {
  pod: (Omit<MyPod, 'member_count'> & { member_count?: Array<{ count?: number }> }) | null;
};

function hasPod(
  pod: MembershipRow['pod']
): pod is NonNullable<MembershipRow['pod']> {
  return pod !== null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [supabase] = useState(() => (typeof window === 'undefined' ? null : createClient()));
  const [myPods, setMyPods] = useState<MyPod[]>([]);
  const [displayName, setDisplayName] = useState('Guest');
  const [displayRole, setDisplayRole] = useState('—');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }

      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setDisplayName(profile.nickname || 'User');
        setDisplayRole(profile.role === 'USA_ARMY' ? 'U.S. Army' : 'KATUSA');
      }

      // 2. Fetch My Active Pods (Joined pods that are active)
      const { data: memberships } = await supabase
        .from('pod_members')
        .select(`
          pod:pods!inner (
            *,
            member_count:pod_members(count)
          )
        `)
        .eq('user_id', user.id)
        .eq('pod.status', 'active');

      if (memberships) {
        const now = Date.now();
        const activePods = (memberships as MembershipRow[])
          .map((m) => m.pod)
          .filter(hasPod)
          .map((p) => ({
            ...p,
            member_count: p.member_count?.[0]?.count || 0
          }))
          .filter((p) => {
            const ms = new Date(p.departure_time).getTime();
            return Number.isFinite(ms) && ms + 6 * 60 * 60 * 1000 > now;
          })
          .sort((a, b) => 
            new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
          );

        const podsWithUnread = await Promise.all(
          activePods.map(async (p) => {
            const lastRead = localStorage.getItem(`chat_read_${p.id}`);
            if (!lastRead) {
              const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('pod_id', p.id);
              return { ...p, unread_count: count ?? 0 };
            }
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('pod_id', p.id)
              .gt('created_at', lastRead);
            return { ...p, unread_count: count ?? 0 };
          })
        );
        setMyPods(podsWithUnread as MyPod[]);
      }
      setLoading(false);
    };

    fetchData();
  }, [router, supabase]);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-gray-50 font-sans antialiased pb-24">
      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
        
        {/* 1. 유저 정보 카드 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-2xl">
              🧑‍🚀
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <p className="text-sm font-medium text-gray-500">
                {displayRole} • Camp Humphreys
              </p>
            </div>
          </div>
        </div>

        {/* 2. 현재 참여 중인 방 (기획 요소 반영) */}
        <div>
          {myPods.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm font-semibold text-gray-500">
              No active rooms.
            </div>
          ) : (
            <div className="space-y-3">
              {myPods.map((r) => {
                const timeStr = new Date(r.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                const dateStr = new Date(r.departure_time).toLocaleDateString('en-US', { day: '2-digit', month: 'long' });

                return (
                  <div
                    key={r.id}
                    onClick={() => router.push(`/chat/${r.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm transition-all hover:border-indigo-300 active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative rounded-full bg-indigo-600 p-2.5 text-white">
                        <CarTaxiFront className="h-6 w-6" />
                        {r.unread_count > 0 && (
                          <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-sm">
                            {r.unread_count > 99 ? '99+' : r.unread_count}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-indigo-600">
                          {r.member_count}/{r.capacity} Members
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {r.origin} → {r.destination}
                        </p>
                        <p className="text-xs font-semibold text-gray-500">
                          {dateStr}, {timeStr}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-indigo-400" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. 로그아웃 버튼 */}
        <button 
          onClick={handleLogout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-4 font-bold text-red-600 transition-colors hover:bg-red-100 active:scale-95"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>

      </main>

      <BottomNav />
    </div>
  );
}
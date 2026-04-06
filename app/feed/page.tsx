
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '../components/BottomNav';
import { createClient } from '@/lib/supabase/client';

type Pod = {
  id: string;
  creator_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  capacity: number;
  status: string;
  created_at: string;
  member_count?: number;
};

function formatHeader(dateIso: string) {
  const d = new Date(dateIso);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
}

export default function FeedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [pods, setPods] = useState<Pod[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPods = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    // Fetch active pods with member counts
    const { data: podsData, error: podsError } = await supabase
      .from('pods')
      .select(`
        *,
        member_count:pod_members(count)
      `)
      .eq('status', 'active')
      .order('departure_time', { ascending: true });

    if (podsData) {
      // Supabase count returns an array of objects like { count: 5 }
      const formattedPods = podsData.map((p: any) => ({
        ...p,
        member_count: p.member_count[0]?.count || 0
      }));
      setPods(formattedPods);
    }

    if (user) {
      // Fetch pods joined by the user
      const { data: joinedData } = await supabase
        .from('pod_members')
        .select('pod_id')
        .eq('user_id', user.id);
      
      if (joinedData) {
        setJoinedIds(new Set(joinedData.map((j: any) => j.pod_id)));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPods();

    // Set up real-time subscription for pod updates
    const channel = supabase
      .channel('pod_feed_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pods' }, fetchPods)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pod_members' }, fetchPods)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const podsByDate = useMemo(() => {
    const map = new Map<string, Pod[]>();
    for (const p of pods) {
      const dateKey = p.departure_time.split('T')[0];
      const arr = map.get(dateKey) ?? [];
      arr.push(p);
      map.set(dateKey, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [pods]);

  const handleJoin = async (podId: string) => {
    if (!userId) {
      router.push('/');
      return;
    }

    const { error } = await supabase
      .from('pod_members')
      .insert({
        pod_id: podId,
        user_id: userId
      });

    if (error) {
      alert('Failed to join: ' + error.message);
    } else {
      fetchPods();
    }
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
      <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm antialiased">
        <h1 className="flex items-center text-2xl font-extrabold tracking-tight">
          <span className="text-black">Ca</span>
          <span className="inline-block origin-left scale-x-[1.25] text-black">
            r
          </span>
          <span className="inline bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-500 bg-clip-text text-transparent">
            npooling
          </span>
        </h1>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6 antialiased">
        {podsByDate.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed bg-white px-6 py-10 text-center text-sm font-semibold text-gray-500">
            No upcoming rooms.
          </div>
        ) : (
          podsByDate.map(([date, list], idx) => (
            <div key={date} className={idx === 0 ? '' : 'mt-1'}>
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium text-gray-500">{formatHeader(date)}</p>
              </div>

              {list.map((pod) => {
                const currentPeople = pod.member_count || 0;
                const isFull = currentPeople >= pod.capacity;
                const isJoined = joinedIds.has(pod.id);
                const isOwner = pod.creator_id === userId;
                const joinDisabled = isFull || isJoined || isOwner;
                const timeStr = new Date(pod.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                return (
                  <div
                    key={pod.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      router.push(`/chat/${pod.id}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        router.push(`/chat/${pod.id}`);
                      }
                    }}
                    className="mt-5 rounded-2xl border bg-white px-5 py-4 shadow-sm antialiased hover:border-purple-300 active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="text-lg font-bold text-gray-900">{timeStr}</p>
                        <p className="text-sm font-medium text-gray-700">
                          {pod.origin} → {pod.destination}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 antialiased">
                        <span className={`text-xl font-bold ${isFull ? 'text-gray-400' : 'text-indigo-600'}`}>
                          {currentPeople}/{pod.capacity}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">Seats</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoin(pod.id);
                        }}
                        className={`rounded-xl px-5 py-2 text-sm font-bold shadow-sm transition-all antialiased active:scale-95 ${
                          joinDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-purple-600'
                        }`}
                        disabled={joinDisabled}
                      >
                        {isOwner ? 'My Pod' : isJoined ? 'Joined' : isFull ? 'Full' : 'Join'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
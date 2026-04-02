
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import BottomNav from '../components/BottomNav';

type Room = {
  id: string;
  createdAt: number;
  creatorId?: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  origin: string;
  destination: string;
  currentPeople: number;
  maxPeople: number;
};

const ROOMS_KEY = 'campoolingRooms';
const JOINED_KEY = 'campoolingJoinedRooms';

function toDateTimeMs(room: Pick<Room, 'date' | 'time'>) {
  const d = new Date(`${room.date}T${room.time}:00`);
  return d.getTime();
}

function formatHeader(dateIso: string) {
  const d = new Date(`${dateIso}T00:00:00`);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
}

export default function FeedPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROOMS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Room[]) : [];
      setRooms(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRooms([]);
    }

    try {
      const raw = localStorage.getItem(JOINED_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setJoinedIds(new Set(Array.isArray(parsed) ? parsed : []));
    } catch {
      setJoinedIds(new Set());
    }
  }, []);

  // "실시간" 제거: 분 단위로 현재시각 갱신해서 지난 방이 자동으로 사라지게 함
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const upcomingRooms = useMemo(() => {
    const filtered = rooms.filter((r) => {
      const ms = toDateTimeMs(r);
      return Number.isFinite(ms) && ms > now;
    });

    // 저장소도 같이 정리(지나간 방은 제거)
    if (filtered.length !== rooms.length) {
      try {
        localStorage.setItem(ROOMS_KEY, JSON.stringify(filtered));
      } catch {
        // ignore
      }
    }

    return filtered.sort((a, b) => toDateTimeMs(a) - toDateTimeMs(b));
  }, [rooms, now]);

  const roomsByDate = useMemo(() => {
    const map = new Map<string, Room[]>();
    for (const r of upcomingRooms) {
      const arr = map.get(r.date) ?? [];
      arr.push(r);
      map.set(r.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [upcomingRooms]);

  const handleJoin = (id: string) => {
    setRooms((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        const isPast = toDateTimeMs(r) <= Date.now();
        if (isPast) return r;
        if (r.creatorId === 'me') return r;
        if (joinedIds.has(id)) return r;
        if (r.currentPeople >= r.maxPeople) return r;
        return { ...r, currentPeople: r.currentPeople + 1 };
      });
      try {
        localStorage.setItem(ROOMS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    setJoinedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(JOINED_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="flex h-dvh flex-col bg-gray-50 font-sans antialiased pb-24">
      {/* 상단 헤더: 대문 로고와 동일한 스타일 적용 */}
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

      {/* 피드 리스트 영역 */}
      <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6 antialiased">
        {roomsByDate.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed bg-white px-6 py-10 text-center text-sm font-semibold text-gray-500">
            No upcoming rooms.
          </div>
        ) : (
          roomsByDate.map(([date, list], idx) => (
            <div key={date} className={idx === 0 ? '' : 'mt-1'}>
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium text-gray-500">{formatHeader(date)}</p>
              </div>

              {list.map((pod) => {
                const isFull = pod.currentPeople >= pod.maxPeople;
                const isJoined = joinedIds.has(pod.id);
                const isOwner = pod.creatorId === 'me';
                const joinDisabled = isFull || isJoined || isOwner;
                return (
                  <div
                    key={pod.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      // 회색/비활성화 상태여도 채팅방은 입장 가능
                      window.location.href = `/chat/${pod.id}`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        window.location.href = `/chat/${pod.id}`;
                      }
                    }}
                    className="mt-5 rounded-2xl border bg-white px-5 py-4 shadow-sm antialiased hover:border-purple-300 active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="text-lg font-bold text-gray-900">{pod.time}</p>
                        <p className="text-sm font-medium text-gray-700">
                          {pod.origin} → {pod.destination}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 antialiased">
                        <span className={`text-xl font-bold ${isFull ? 'text-gray-400' : 'text-indigo-600'}`}>
                          {pod.currentPeople}/{pod.maxPeople}
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
                        {isOwner ? 'Joined' : isJoined ? 'Joined' : isFull ? 'Full' : 'Join'}
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
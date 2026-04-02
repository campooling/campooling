"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, LogOut } from 'lucide-react';

// 백엔드 연결 전 Mock Data (임시 대화 내용)
const initialMessages = [
  { id: 1, sender: 'system', text: 'Room created. (CPX Gate → Pyeongtaek St.)' },
  { id: 2, sender: 'user_2', name: 'John Doe', text: 'Hey, I am waiting near the CU convenience store.', time: '18:50' },
  { id: 3, sender: 'me', text: 'Got it. I will be there in 2 mins.', time: '18:51' },
];

type Room = {
  id: string;
  createdAt: number;
  creatorId?: string;
  date: string;
  time: string;
  origin: string;
  destination: string;
  currentPeople: number;
  maxPeople: number;
};

const ROOMS_KEY = 'campoolingRooms';
const JOINED_KEY = 'campoolingJoinedRooms';

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params?.id ?? '';
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROOMS_KEY);
      const rooms = raw ? (JSON.parse(raw) as Room[]) : [];
      const found = Array.isArray(rooms) ? rooms.find((r) => r.id === roomId) : null;
      setRoom(found ?? null);
    } catch {
      setRoom(null);
    }
  }, [roomId]);

  const headerTitle = useMemo(() => {
    if (!room) return 'Chat';
    return `${room.origin} → ${room.destination}`;
  }, [room]);

  const headerMembers = useMemo(() => {
    if (!room) return '';
    return `${room.currentPeople}/${room.maxPeople} Members`;
  }, [room]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      sender: 'me',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setInputText('');
  };

  return (
    <div className="flex h-dvh flex-col bg-gray-50 font-sans antialiased">
      {/* 상단 헤더: 방 정보 및 뒤로가기 */}
      <header className="flex shrink-0 items-center gap-4 border-b bg-white px-6 py-4 shadow-sm z-10">
        <button 
          onClick={() => router.back()} 
          className="text-gray-600 hover:text-indigo-600 active:scale-95 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 leading-tight">
            {headerTitle}
          </h1>
          {headerMembers ? <p className="text-sm font-medium text-indigo-600">{headerMembers}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setShowLeaveConfirm(true)}
          className="ml-auto inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95"
        >
          <LogOut className="h-4 w-4 mr-1" />
          Leave
        </button>
      </header>

      {/* 대화 내역 스크롤 영역 */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
        {messages.map((msg) => {
          // 시스템 메시지 (방 생성 안내 등)
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} className="mx-auto my-2 rounded-full bg-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-500">
                {msg.text}
              </div>
            );
          }

          // 내 메시지 (오른쪽 정렬, 보라색)
          if (msg.sender === 'me') {
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-white shadow-sm">
                  <p className="text-base font-medium">{msg.text}</p>
                </div>
                <span className="text-xs font-medium text-gray-400">{msg.time}</span>
              </div>
            );
          }

          // 상대방 메시지 (왼쪽 정렬, 흰색)
          return (
            <div key={msg.id} className="flex flex-col items-start gap-1">
              <span className="pl-1 text-xs font-semibold text-gray-500">{msg.name}</span>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-2.5 text-gray-800 shadow-sm">
                <p className="text-base font-medium">{msg.text}</p>
              </div>
              <span className="text-xs font-medium text-gray-400">{msg.time}</span>
            </div>
          );
        })}
      </main>

      {/* 하단 입력창 고정 */}
      <div className="shrink-0 border-t bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="max-h-32 min-h-[44px] flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-base font-medium focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition-all hover:bg-purple-600 active:scale-95 disabled:bg-gray-300 disabled:opacity-50"
          >
            <Send className="h-5 w-5 ml-0.5" />
          </button>
        </form>
      </div>

      {/* 나가기 경고 오버레이 */}
      {showLeaveConfirm ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-xl">
                ⚠️
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-extrabold tracking-tight text-gray-900">Leave this chat?</h2>
                <p className="mt-1 text-sm font-medium text-gray-600">
                  If you leave, you may lose access to this room.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-base font-bold text-gray-700 shadow-sm hover:border-purple-200 hover:bg-purple-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const joinedRaw = localStorage.getItem(JOINED_KEY);
                    const joined = joinedRaw ? (JSON.parse(joinedRaw) as string[]) : [];
                    const nextJoined = Array.isArray(joined) ? joined.filter((x) => x !== roomId) : [];
                    localStorage.setItem(JOINED_KEY, JSON.stringify(nextJoined));
                  } catch {
                    // ignore
                  }

                  try {
                    const raw = localStorage.getItem(ROOMS_KEY);
                    const rooms = raw ? (JSON.parse(raw) as Room[]) : [];
                    if (Array.isArray(rooms)) {
                      const nextRooms = rooms
                        .map((r) => {
                          if (r.id !== roomId) return r;
                          // 나만 있으면 방 자체 삭제
                          if (r.currentPeople <= 1) return null;
                          // 다른 멤버가 있으면 방 유지(방장이 나가도 동일), 인원만 감소
                          return {
                            ...r,
                            currentPeople: Math.max(0, r.currentPeople - 1),
                            ...(r.creatorId === 'me' ? { creatorId: undefined } : {}),
                          };
                        })
                        .filter(Boolean) as Room[];
                      localStorage.setItem(ROOMS_KEY, JSON.stringify(nextRooms));
                    }
                  } catch {
                    // ignore
                  }

                  router.push('/feed');
                }}
                className="flex-1 rounded-2xl bg-red-600 py-3.5 text-base font-extrabold text-white shadow-lg transition-all hover:bg-red-700 active:scale-95"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
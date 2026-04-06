"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, LogOut } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr'; // Supabase 클라이언트 추가

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

// 메시지 타입 정의
type Message = {
  id: number;
  sender: string;
  name?: string;
  text: string;
  time: string;
  room_id?: string;
};

const ROOMS_KEY = 'campoolingRooms';
const JOINED_KEY = 'campoolingJoinedRooms';

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params?.id ?? '';
  
  // Supabase 클라이언트 초기화
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // 1. 방 정보 불러오기 (기존 로직 유지)
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

  // 2. 실시간 메시지 구독 및 초기 메시지 로딩 (중요!)
  useEffect(() => {
    if (!roomId) return;

    // 초기 메시지 불러오기 (Supabase DB에서)
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('id', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // [핵심 수정] 실시간 구독 설정 - payload: any로 에러 해결
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload: any) => { // 이 부분이 빌드 에러 해결 포인트입니다!
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  const headerTitle = useMemo(() => {
    if (!room) return 'Chat';
    return `${room.origin} → ${room.destination}`;
  }, [room]);

  const headerMembers = useMemo(() => {
    if (!room) return '';
    return `${room.currentPeople}/${room.maxPeople} Members`;
  }, [room]);

  // 3. 메시지 전송 로직 (Supabase DB에 삽입)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessageData = {
      room_id: roomId,
      sender: 'me', // 나중에 유저 닉네임으로 교체 가능
      name: 'Me',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    };

    const { error } = await supabase.from('messages').insert([newMessageData]);

    if (error) {
      console.error("Error sending message:", error.message);
    } else {
      setInputText('');
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-gray-50 font-sans antialiased">
      {/* 상단 헤더 */}
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

      {/* 대화 내역 */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="mx-auto my-2 rounded-full bg-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-500">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg) => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} className="mx-auto my-2 rounded-full bg-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-500">
                {msg.text}
              </div>
            );
          }

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

      {/* 하단 입력창 */}
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

      {/* 나가기 오버레이 로직은 기존과 동일하므로 생략하거나 유지 */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
             {/* ...기존 Leave Confirm UI 유지... */}
             <div className="mt-6 flex gap-3">
               <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-base font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95">Cancel</button>
               <button onClick={() => router.push('/feed')} className="flex-1 rounded-2xl bg-red-600 py-3.5 text-base font-extrabold text-white shadow-lg active:scale-95">Leave</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Pod = {
  id: string;
  creator_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  capacity: number;
  status: string;
  member_count?: number;
};

type Message = {
  id: string;
  pod_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    nickname: string;
  };
};

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params?.id ?? '';
  const supabase = createClient();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [pod, setPod] = useState<Pod | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPodDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    const { data: podData } = await supabase
      .from('pods')
      .select(`
        *,
        member_count:pod_members(count)
      `)
      .eq('id', roomId)
      .single();

    if (podData) {
      setPod({
        ...podData,
        member_count: podData.member_count[0]?.count || 0
      });
    }

    const { data: messagesData } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id(nickname)
      `)
      .eq('pod_id', roomId)
      .order('created_at', { ascending: true });

    if (messagesData) {
      setMessages(messagesData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPodDetails();

    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`room_${roomId}_messages`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `pod_id=eq.${roomId}` 
      }, async (payload) => {
        // Fetch profile for the new message
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', payload.new.user_id)
          .single();
        
        const newMessage = {
          ...payload.new,
          profiles: profileData
        };
        setMessages((prev) => [...prev, newMessage]);
      })
      .subscribe();

    // Subscribe to pod updates (member count, status, etc.)
    const podChannel = supabase
      .channel(`room_${roomId}_updates`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pods', 
        filter: `id=eq.${roomId}` 
      }, fetchPodDetails)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pod_members', 
        filter: `pod_id=eq.${roomId}` 
      }, fetchPodDetails)
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(podChannel);
    };
  }, [roomId, supabase]);

  const headerTitle = useMemo(() => {
    if (!pod) return 'Chat';
    return `${pod.origin} → ${pod.destination}`;
  }, [pod]);

  const headerMembers = useMemo(() => {
    if (!pod) return '';
    return `${pod.member_count}/${pod.capacity} Members`;
  }, [pod]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !userId) return;

    const content = inputText.trim();
    setInputText('');

    const { error } = await supabase
      .from('messages')
      .insert({
        pod_id: roomId,
        user_id: userId,
        content: content
      });

    if (error) {
      alert('Failed to send message: ' + error.message);
    }
  };

  const handleLeavePod = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('pod_members')
      .delete()
      .eq('pod_id', roomId)
      .eq('user_id', userId);

    if (error) {
      alert('Failed to leave pod: ' + error.message);
    } else {
      router.push('/feed');
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
          const isMe = msg.user_id === userId;
          const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          // 내 메시지 (오른쪽 정렬, 보라색)
          if (isMe) {
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-white shadow-sm">
                  <p className="text-base font-medium">{msg.content}</p>
                </div>
                <span className="text-xs font-medium text-gray-400">{timeStr}</span>
              </div>
            );
          }

          // 상대방 메시지 (왼쪽 정렬, 흰색)
          return (
            <div key={msg.id} className="flex flex-col items-start gap-1">
              <span className="pl-1 text-xs font-semibold text-gray-500">{msg.profiles?.nickname || 'User'}</span>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-2.5 text-gray-800 shadow-sm">
                <p className="text-base font-medium">{msg.content}</p>
              </div>
              <span className="text-xs font-medium text-gray-400">{timeStr}</span>
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
                onClick={handleLeavePod}
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
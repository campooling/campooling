'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Menu, X } from 'lucide-react';
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

type Member = {
  id: string;
  nickname: string;
  role?: string | null;
};

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params?.id ?? '';
  const [supabase] = useState(() => (typeof window === 'undefined' ? null : createClient()));

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [pod, setPod] = useState<Pod | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const messagesContainerRef = useRef<HTMLElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const didInitialScrollRef = useRef(false);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const podTimeMs = useMemo(() => (pod ? new Date(pod.departure_time).getTime() : NaN), [pod]);
  const isClosed = useMemo(
    () => Number.isFinite(podTimeMs) && podTimeMs + 15 * 60 * 1000 <= now,
    [podTimeMs, now]
  );
  const isExpired = useMemo(
    () => Number.isFinite(podTimeMs) && podTimeMs + 6 * 60 * 60 * 1000 <= now,
    [podTimeMs, now]
  );

  const fetchPodDetails = async () => {
    if (!supabase) return;
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
      if ((podData.member_count[0]?.count || 0) <= 0) {
        await supabase.from('pods').delete().eq('id', roomId);
        router.replace('/feed');
        return;
      }
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

    const { data: memberRows } = await supabase
      .from('pod_members')
      .select('user_id, profiles:user_id(nickname, role)')
      .eq('pod_id', roomId);

    if (memberRows) {
      setMembers(
        memberRows.map((m: any) => ({
          id: m.user_id,
          nickname: m.profiles?.nickname || 'User',
          role: m.profiles?.role || null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!supabase) return;
    fetchPodDetails();

    // Subscribe to new messages (빌드 에러를 막기 위해 payload: any 적용!)
    const messageChannel = supabase
      .channel(`room_${roomId}_messages`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `pod_id=eq.${roomId}` 
      }, async (payload: any) => { 
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

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    if (!didInitialScrollRef.current) {
      el.scrollTop = el.scrollHeight;
      didInitialScrollRef.current = true;
      shouldAutoScrollRef.current = true;
      return;
    }

    if (!shouldAutoScrollRef.current) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

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
    if (!supabase || !inputText.trim() || !userId) return;

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
    if (!supabase || !userId) return;

    const { error } = await supabase
      .from('pod_members')
      .delete()
      .eq('pod_id', roomId)
      .eq('user_id', userId);

    if (error) {
      alert('Failed to leave pod: ' + error.message);
    } else {
      try {
        const { count } = await supabase
          .from('pod_members')
          .select('*', { count: 'exact', head: true })
          .eq('pod_id', roomId);

        // 모두 나가면 방 삭제
        if ((count ?? 0) <= 0) {
          await supabase.from('pods').delete().eq('id', roomId);
        }
      } catch {
        // ignore
      }
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

  // 15분 지난 방은 입장 불가, 6시간 지난 방은 만료 처리
  if (isExpired) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white px-6 text-center text-sm font-semibold text-gray-600">
        This room has expired.
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white px-6 text-center text-sm font-semibold text-gray-600">
        This room is closed (15+ minutes after the meeting time).
      </div>
    );
  }

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
          onClick={() => setShowMenu(true)}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* 대화 내역 */}
      <main
        ref={messagesContainerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          shouldAutoScrollRef.current = distanceFromBottom < 80;
        }}
        className="flex min-h-0 flex-1 flex-col justify-end gap-4 overflow-y-auto p-6"
      >
        {messages.length === 0 && (
          <div className="mx-auto my-2 rounded-full bg-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-500">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === userId;
          const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

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

      {/* 하단 입력창 */}
      <div className="shrink-0 border-t bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="max-h-32 min-h-[44px] flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
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

      {/* 나가기 오버레이 */}
      {showLeaveConfirm && (
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
      )}

      {/* 메뉴(멤버/시간/나가기) half-screen 팝업 */}
      {showMenu ? (
        <div className="fixed inset-0 z-[190] flex items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white px-6 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[55vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold tracking-tight text-gray-900">Members</h2>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex -space-x-3">
              {members.slice(0, 10).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMember(m)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-sm font-extrabold text-indigo-700 transition-transform active:scale-95"
                  title={m.nickname}
                >
                  {(m.nickname?.trim()?.[0] || 'U').toUpperCase()}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
              <p className="text-xs font-semibold text-gray-500">Departure</p>
              <p className="mt-1 text-base font-extrabold text-gray-900">
                {pod ? new Date(pod.departure_time).toLocaleString('en-US', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
              </p>
              {isClosed ? (
                <p className="mt-1 text-xs font-semibold text-red-600">Closed (15+ min after time)</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                setShowLeaveConfirm(true);
              }}
              className="mt-5 w-full rounded-2xl border border-red-100 bg-red-50 py-4 text-base font-extrabold text-red-600 shadow-sm hover:bg-red-100 active:scale-95"
            >
              Leave
            </button>
          </div>
        </div>
      ) : null}

      {selectedMember ? (
        <div className="fixed inset-0 z-[210] flex items-end bg-black/40" onClick={() => setSelectedMember(null)}>
          <div className="w-full rounded-t-3xl bg-white px-6 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold tracking-tight text-gray-900">Profile</h2>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95"
                aria-label="Close profile"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-lg font-extrabold text-gray-900">{selectedMember.nickname}</p>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                {selectedMember.role === 'USA_ARMY' ? 'U.S. Army' : 'KATUSA'}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-500">Camp Humphreys</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
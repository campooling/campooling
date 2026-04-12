"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, CalendarDays, Users, Clock, X } from 'lucide-react'; 
import BottomNav from '../components/BottomNav';
import { createClient } from '@/lib/supabase/client';

type AvailableDate = {
  dayName: string;
  dayOfMonth: number;
  fullDate: string;
};

const HumphreysLocations = [
  'Pyeongtaek St.',
  'Walk in gate',
  'P2061',
  'Jije St.',
  'Other',
];

function getLocationValidationError(input: string): string | null {
  const value = input.trim();
  if (!value) return "Please enter a location.";
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value)) return "Please write in English.";
  const profanityRegex =
    /f[^a-zA-Z0-9]*u[^a-zA-Z0-9]*c[^a-zA-Z0-9]*k|s[^a-zA-Z0-9]*e[^a-zA-Z0-9]*x|b[^a-zA-Z0-9]*i[^a-zA-Z0-9]*t[^a-zA-Z0-9]*c[^a-zA-Z0-9]*h|s[^a-zA-Z0-9]*h[^a-zA-Z0-9]*i[^a-zA-Z0-9]*t|a[^a-zA-Z0-9]*s[^a-zA-Z0-9]*s/i;
  if (profanityRegex.test(value)) return "Please enter a valid location.";
  if (/[^a-zA-Z0-9\s]{2,}/.test(value)) return "Please enter a valid location.";
  if (/([a-zA-Z])\1{3,}/.test(value)) return "Please enter a valid location.";
  if (/^[A-Za-z]{1,2}\d{3,6}$/.test(value)) return null;
  const cleaned = value.replace(/\s+/g, "");
  const alphaCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
  if (alphaCount < Math.ceil(cleaned.length * 0.5)) return "Please enter a valid location.";
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^(mom|mother|dad|father|baby|love|honey|hello|hi)$/i.test(normalized))
    return "Please enter a valid location.";
  return null;
}

// 날짜 형식 지정 유틸리티 (월 11, 화 12 등)
const getFormattedDate = (date: Date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    dayName: days[date.getDay()],
    dayOfMonth: date.getDate(),
    fullDate: `${year}-${month}-${day}`, // yyyy-mm-dd (local)
  };
};

export default function CreateRoomPage() {
  const router = useRouter();
  const [supabase] = useState(() => (typeof window === 'undefined' ? null : createClient()));

  // --- 상태 관리 (State) ---
  
  // 1. 출발 날짜 선택 (사진 1 참조: 1주일 가로 스크롤)
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDate, setSelectedDate] = useState(''); // yyyy-mm-dd

  // 2. 출발/도착지 선택
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [activeLocationModal, setActiveLocationModal] = useState<'origin' | 'destination' | null>(null);
  const [otherInput, setOtherInput] = useState('');
  const [otherError, setOtherError] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const otherInputRef = useRef<HTMLInputElement>(null);

  // 3. 시간 선택 (사진 3 참조: 숫자 직접 입력)
  const [hour, setHour] = useState('19'); // 기본 19시
  const [minute, setMinute] = useState('00'); // 기본 00분

  // 4. 인원수 (이전 UI 유지)
  const [maxPeople, setMaxPeople] = useState(4); 

  // --- 효과 (Effects) ---
  
  // 오늘부터 1주일간의 날짜 데이터 생성
  useEffect(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(getFormattedDate(date));
    }
    setAvailableDates(dates);
    if (dates.length > 0) {
      setSelectedDate(dates[0].fullDate); // 기본 오늘 선택
    }
  }, []);

  useEffect(() => {
    if (showOtherInput && otherInputRef.current) {
      otherInputRef.current.focus();
    }
  }, [showOtherInput]);

  // --- 핸들러 (Handlers) ---

  // 시간 입력 검증 및 상태 업데이트
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, ''); // 숫자만
    if (value.length > 2) value = value.slice(-2); // 최대 2자리
    const num = parseInt(value);
    if (num >= 0 && num < 24) {
      setHour(value);
    } else if (value === '') {
      setHour(''); // 입력 허용
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 2) value = value.slice(-2);
    const num = parseInt(value);
    if (num >= 0 && num < 60) {
      setMinute(value);
    } else if (value === '') {
      setMinute('');
    }
  };

  const handleLocationSelect = (location: string) => {
    if (location === 'Other') {
      setOtherInput('');
      setOtherError('');
      setShowOtherInput(true);
      return;
    }
    if (activeLocationModal === 'origin') {
      setOrigin(location);
    } else if (activeLocationModal === 'destination') {
      setDestination(location);
    }
    setActiveLocationModal(null);
  };

  const handleOtherSave = () => {
    const v = otherInput.trim();
    const err = getLocationValidationError(v);
    if (err) {
      setOtherError(err);
      return;
    }
    if (activeLocationModal === 'origin') {
      setOrigin(v);
    } else if (activeLocationModal === 'destination') {
      setDestination(v);
    }
    setShowOtherInput(false);
    setActiveLocationModal(null);
  };

  const handleOtherCancel = () => {
    setShowOtherInput(false);
    setOtherInput('');
    setOtherError('');
  };

  // 최종 방 개설 처리
  const handleCreateRoom = async () => {
    if (!supabase) return;
    if (!selectedDate || !origin || !destination || !hour || !minute || !maxPeople) {
      alert('Please fill out all fields.');
      return;
    }
    if (origin === destination) {
        alert('Origin and destination cannot be the same.');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('You must be logged in to create a room.');
      router.push('/');
      return;
    }

    const departureTime = new Date(
      `${selectedDate}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`
    ).toISOString();

    try {
      // 1. Create the pod
      const { data: pod, error: podError } = await supabase
        .from('pods')
        .insert({
          creator_id: user.id,
          origin,
          destination,
          departure_time: departureTime,
          capacity: maxPeople,
          status: 'active'
        })
        .select()
        .single();

      if (podError) throw podError;

      // 2. Add creator to pod_members
      const { error: memberError } = await supabase
        .from('pod_members')
        .insert({
          pod_id: pod.id,
          user_id: user.id
        });

      if (memberError) throw memberError;

      alert('Room created successfully!');
      router.push('/feed');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert('Error creating room: ' + message);
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-gray-50 font-sans antialiased pb-24 relative overflow-x-hidden">
      
      {/* 방 개설 폼 입력 영역 */}
      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 antialiased">
        
        {/* === 2. 출발지/도착지 설정 (사진 2 참조: 노선도형 UI) === */}
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 pl-1">
            Route.
          </label>
          <div className="relative flex items-stretch gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm antialiased">
            {/* 노선도 그래픽 (수직선 + 점) */}
            <div className="absolute left-9 top-1/2 -translate-y-1/2 w-0.5 h-[60%] bg-indigo-100" />
            <div className="flex flex-col justify-between py-1 relative z-10 w-6 items-center">
                <div className="w-6 h-6 rounded-full bg-indigo-100 p-1 flex items-center justify-center border-4 border-white shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div></div>
                <div className="w-6 h-6 rounded-full bg-purple-100 p-1 flex items-center justify-center border-4 border-white shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div></div>
            </div>
            
            {/* 출발/도착 버튼 입력 영역 */}
            <div className="flex-1 flex flex-col justify-between gap-5 relative z-10">
                {/* 출발지 버튼 */}
                <button 
                  type="button"
                  onClick={() => setActiveLocationModal('origin')}
                  className="w-full text-left"
                >
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pick-up</p>
                    <p className={`text-base font-semibold ${origin ? 'text-gray-900' : 'text-gray-400'}`}>
                        {origin || 'Select departure point'}
                    </p>
                </button>
                {/* 구분선 (미니멀) */}
                <div className="border-t border-gray-100" />
                {/* 도착지 버튼 */}
                <button 
                  type="button"
                  onClick={() => setActiveLocationModal('destination')}
                  className="w-full text-left"
                >
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Destination</p>
                    <p className={`text-base font-semibold ${destination ? 'text-gray-900' : 'text-gray-400'}`}>
                        {destination || 'Select destination'}
                    </p>
                </button>
            </div>
          </div>
        </div>

        {/* === 3. 출발 날짜 선택 (사진 1 참조: 가로 스크롤 1주일) === */}
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 pl-1">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            Date
          </label>
          {/* 가로 스크롤 영역 */}
          <div className="flex gap-3 overflow-x-auto pb-1 antialiased -mx-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {availableDates.map((date) => {
              const isActive = selectedDate === date.fullDate;
              return (
                <button 
                  key={date.fullDate}
                  type='button'
                  onClick={() => setSelectedDate(date.fullDate)}
                  className={`flex flex-col items-center justify-center rounded-2xl px-5 py-4 min-w-[70px] transition-all active:scale-95 shrink-0 ${isActive ? 'bg-indigo-600 text-white hover:bg-purple-600 shadow-md' : 'bg-white text-gray-800 border border-gray-200 hover:border-purple-200 hover:bg-purple-50'}`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide">{date.dayName}</span>
                  <span className="text-2xl font-bold tracking-tight">{date.dayOfMonth}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* === 4. 시간 선택 (사진 3 참조: 숫자 직접 입력) === */}
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 pl-1">
            <Clock className="h-4 w-4 text-indigo-500" />
            Time
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm antialiased">
            {/* 시(HH) 입력창 */}
            <input 
              type="text" 
              inputMode='numeric' // 모바일 키패드 강제
              value={hour}
              onChange={handleHourChange}
              placeholder="19"
              className="w-full max-w-[70px] text-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-3xl font-extrabold text-indigo-600 focus:border-indigo-500 focus:ring-0 antialiased tracking-tight"
            />
            {/* 구분선 (:) */}
            <span className="text-3xl font-extrabold text-gray-400">:</span>
            {/* 분(mm) 입력창 */}
            <input 
              type="text" 
              inputMode='numeric'
              value={minute}
              onChange={handleMinuteChange}
              placeholder="00"
              className="w-full max-w-[70px] text-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-3xl font-extrabold text-indigo-600 focus:border-indigo-500 focus:ring-0 antialiased tracking-tight"
            />
             {/* 현재 시간 추천 버튼 (미니멀 추가) */}
            <button 
                type="button" 
                onClick={() => {
                    const now = new Date();
                    setHour(String(now.getHours()).padStart(2, '0'));
                    const roundedMinute = Math.ceil(now.getMinutes() / 5) * 5;
                    setMinute(String(Math.min(59, roundedMinute)).padStart(2, '0')); // 최대 59분
                }}
                className="ml-auto text-sm font-bold text-gray-500 bg-gray-100 rounded-full px-4 py-2 hover:bg-gray-200"
            >
                Set to Now
            </button>
          </div>
        </div>

        {/* 5. 최대 인원 선택 (기존 UI 유지) */}
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 pl-1">
            <Users className="h-4 w-4 text-indigo-500" />
            Max. People (Including you)
          </label>
          <div className="flex gap-3">
            {[2, 3, 4].map(num => (
              <button 
                key={num}
                type='button'
                onClick={() => setMaxPeople(num)}
                className={`flex-1 rounded-full py-3.5 text-lg font-bold shadow-sm transition-all antialiased active:scale-95 ${maxPeople === num ? 'bg-indigo-600 text-white hover:bg-purple-600' : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-200 hover:bg-purple-50'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* 6. 방 개설 완료 버튼 (가독성 좋게 수정한 버전) */}
        <div className="mt-auto pt-10">
            <button 
                type='button' 
                onClick={handleCreateRoom} 
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4.5 text-xl font-extrabold tracking-wide text-white shadow-lg transition-all hover:from-purple-600 hover:to-indigo-600 antialiased active:scale-95"
            >
                Create Room
            </button>
        </div>

      </main>

      {/* 하단 네비게이션바 (고정) */}
      <BottomNav />

      {/* 장소 선택 모달 (최상단) — 인라인 렌더링으로 포커스 유지 */}
      {activeLocationModal && (() => {
        const otherLocation = activeLocationModal === 'origin' ? destination : origin;
        return (
          <div className="fixed inset-0 z-[100] flex flex-col bg-white antialiased">
            <header className="flex items-center gap-4 border-b bg-white px-6 py-4 shadow-sm">
              <button onClick={() => { setActiveLocationModal(null); setShowOtherInput(false); }} className="text-gray-600 hover:text-indigo-600">
                <X className="h-6 w-6" />
              </button>
            </header>
            <main className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
              {HumphreysLocations.map((loc) => {
                const isDisabled = loc !== 'Other' && loc === otherLocation;
                const isOther = loc === 'Other';

                if (isOther && showOtherInput) {
                  return (
                    <div key={loc} className="rounded-2xl border border-indigo-300 bg-indigo-50/50 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <MapPin className={`h-5 w-5 shrink-0 ${activeLocationModal === 'origin' ? 'text-indigo-500' : 'text-purple-500'}`} />
                        <span className="text-base font-semibold text-gray-900">Other</span>
                      </div>
                      <input
                        ref={otherInputRef}
                        value={otherInput}
                        onChange={(e) => {
                          setOtherInput(e.target.value);
                          if (otherError) {
                            const err = getLocationValidationError(e.target.value);
                            setOtherError(err ?? '');
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleOtherSave(); }}
                        placeholder="Type location name..."
                        className={`w-full rounded-xl border bg-white px-4 py-3 text-base font-semibold text-gray-900 outline-none focus:border-indigo-500 ${otherError ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      {otherError && (
                        <p className="mt-1.5 pl-1 text-xs font-semibold text-red-500">{otherError}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={handleOtherCancel}
                          className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-600 active:scale-95"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleOtherSave}
                          disabled={!otherInput.trim()}
                          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleLocationSelect(loc)}
                    disabled={isDisabled}
                    className={`w-full text-left rounded-2xl border p-5 transition-all active:scale-95 flex items-center gap-4 ${isDisabled ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}
                  >
                    <MapPin className={`h-5 w-5 shrink-0 ${activeLocationModal === 'origin' ? 'text-indigo-500' : 'text-purple-500'}`} />
                    <span className={`text-base font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>{loc}</span>
                  </button>
                );
              })}
            </main>
          </div>
        );
      })()}
    </div>
  );
}
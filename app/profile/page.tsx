"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronRight, CarTaxiFront } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function ProfilePage() {
  const router = useRouter();

  // 프론트엔드 UI 확인용 Mock Data 
  const userProfile = {
    name: 'Jaeho Jung',
    role: 'KATUSA',
    location: 'Camp Humphreys',
  };

  const activeRoom = {
    id: 1,
    time: '19:00 Today',
    route: 'CPX Gate → Pyeongtaek St.',
    status: 'Waiting (3/4)',
  };

  const handleLogout = () => {
    alert('Logged out successfully.');
    router.push('/'); // 로그인(대문) 화면으로 이동
  };

  return (
    <div className="flex h-dvh flex-col bg-gray-50 font-sans antialiased pb-24">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Profile</h1>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
        
        {/* 1. 유저 정보 카드 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-2xl">
              🧑‍🚀
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{userProfile.name}</h2>
              <p className="text-sm font-medium text-gray-500">
                {userProfile.role} • {userProfile.location}
              </p>
            </div>
          </div>
        </div>

        {/* 2. 현재 참여 중인 방 (기획 요소 반영) */}
        <div>
          <h3 className="mb-3 px-1 text-sm font-bold text-gray-500">My Active Room</h3>
          <div 
            onClick={() => router.push('/chat/1')} // 클릭 시 채팅방으로 바로 이동
            className="flex cursor-pointer items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm transition-all hover:border-indigo-300 active:scale-95"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-indigo-600 p-2.5 text-white">
                <CarTaxiFront className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-600">{activeRoom.status}</p>
                <p className="text-base font-semibold text-gray-900">{activeRoom.route}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-indigo-400" />
          </div>
        </div>

        {/* 3. 메뉴 리스트 (미니멀) */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <button className="flex w-full items-center justify-between border-b border-gray-100 px-6 py-4 text-left transition-colors hover:bg-gray-50">
            <span className="font-semibold text-gray-700">Payment Methods</span>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50">
            <span className="font-semibold text-gray-700">Ride History</span>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* 4. 로그아웃 버튼 */}
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
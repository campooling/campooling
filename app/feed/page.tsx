import React from 'react';
import BottomNav from '../components/BottomNav';

const mockPods = [
  { id: 1, creatorId: 'user_1', time: '3/26 Thu 19:00', origin: 'Pyeongtaek St.', destination: 'CPX Gate', currentPeople: 2, maxPeople: 4, status: 'Active' },
  { id: 2, creatorId: 'user_2', time: '3/27 Fri 09:00', origin: 'CPX Gate', destination: 'Jije St.', currentPeople: 1, maxPeople: 4, status: 'Active' },
  { id: 3, creatorId: 'user_3', time: '3/27 Fri 12:30', origin: 'Main Gate', destination: 'Anjeong-ri St.', currentPeople: 1, maxPeople: 3, status: 'Full' },
];

export default function FeedPage() {
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 shadow-sm" aria-hidden>
          <span className="text-xl leading-none">🚕</span>
        </div>
      </header>

      {/* 피드 리스트 영역 */}
      <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6 antialiased">
        <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium text-gray-500">3/26 Thu</p>
        </div>

        {mockPods.filter(pod => pod.time.includes('3/26 Thu')).map((pod) => (
          <div key={pod.id} className="rounded-2xl border bg-white px-5 py-4 shadow-sm antialiased hover:border-purple-300">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <p className="text-lg font-bold text-gray-900">{pod.time.split(' ')[2]}</p>
                <p className="text-sm font-medium text-gray-700">{pod.origin} → {pod.destination}</p>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 antialiased">
                  <span className={`text-xl font-bold ${pod.status === 'Full' ? 'text-gray-400' : 'text-indigo-600'}`}>{pod.currentPeople}/{pod.maxPeople}</span>
                  <span className="text-xs font-semibold text-gray-500">Seats</span>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button 
                  type='button' 
                  className={`rounded-xl px-5 py-2 text-sm font-bold shadow-sm transition-all antialiased active:scale-95 ${pod.status === 'Full' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-purple-600'}`}
                  disabled={pod.status === 'Full'}
                >
                    {pod.status === 'Full' ? 'Full' : 'Join'}
                </button>
            </div>
          </div>
        ))}

        <div className="border-t pt-4 mt-6">
            <p className="text-sm font-medium text-gray-500">3/27 Fri</p>
        </div>

         {mockPods.filter(pod => pod.time.includes('3/27 Fri')).map((pod) => (
          <div key={pod.id} className="rounded-2xl border bg-white px-5 py-4 shadow-sm antialiased hover:border-purple-300">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <p className="text-lg font-bold text-gray-900">{pod.time.split(' ')[2]}</p>
                <p className="text-sm font-medium text-gray-700">{pod.origin} → {pod.destination}</p>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 antialiased">
                  <span className={`text-xl font-bold ${pod.status === 'Full' ? 'text-gray-400' : 'text-indigo-600'}`}>{pod.currentPeople}/{pod.maxPeople}</span>
                  <span className="text-xs font-semibold text-gray-500">Seats</span>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button 
                  type='button' 
                  className={`rounded-xl px-5 py-2 text-sm font-bold shadow-sm transition-all antialiased active:scale-95 ${pod.status === 'Full' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-purple-600'}`}
                  disabled={pod.status === 'Full'}
                >
                    {pod.status === 'Full' ? 'Full' : 'Join'}
                </button>
            </div>
          </div>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
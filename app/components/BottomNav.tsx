// app/components/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const active = (href: string) => (pathname === href ? 'text-indigo-600' : 'text-gray-500');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-lg antialiased">
      <div className="flex items-center justify-around px-6">
        {/* 홈 (피드) */}
        <Link href="/feed" className={`flex flex-col items-center gap-1.5 ${active('/feed')} hover:text-purple-600`}>
          <Home className="h-6 w-6" />
          <span className="text-xs font-semibold">Home</span>
        </Link>

        {/* 개설 (방 만들기) */}
        <Link href="/create" className={`flex flex-col items-center gap-1.5 ${active('/create')} hover:text-indigo-600`}>
          <PlusCircle className="h-8 w-8" />
          <span className="text-xs font-semibold">Create</span>
        </Link>

        {/* 프로필 (마이페이지) */}
        <Link href="/profile" className={`flex flex-col items-center gap-1.5 ${active('/profile')} hover:text-indigo-600`}>
          <User className="h-6 w-6" />
          <span className="text-xs font-semibold">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon } from 'lucide-react';

export function HomeButton() {
  const pathname = usePathname();
  
  if (pathname === '/') return null;
  
  return (
    <Link 
      href="/"
      className="fixed top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 z-50"
      aria-label="Go to homepage"
    >
      <HomeIcon className="w-5 h-5" />
    </Link>
  );
} 
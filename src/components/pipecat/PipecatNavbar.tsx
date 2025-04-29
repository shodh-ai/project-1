'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, Image } from 'lucide-react';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  isActive: boolean;
}

const NavLink = ({ href, children, icon, isActive }: NavLinkProps) => {
  return (
    <Link 
      href={href}
      className={`flex items-center p-3 gap-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
    >
      <div className={`${isActive ? 'text-indigo-700' : 'text-gray-500'}`}>
        {icon}
      </div>
      <span className={`${isActive ? 'font-medium text-indigo-700' : 'text-gray-800'}`}>
        {children}
      </span>
    </Link>
  );
};

const PipecatNavbar = () => {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: <Home size={20} />,
    },
    {
      href: '/vocabpage',
      label: 'LiveKit Vocabulary',
      icon: <BookOpen size={20} />,
    },
    {
      href: '/pipecatvocabpage',
      label: 'Gemini Vocabulary',
      icon: <Image size={20} />,
    },
  ];

  return (
    <div className="p-4 border-b bg-white">
      <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto">
        <div className="mb-4 md:mb-0">
          <h1 className="text-xl font-bold text-indigo-600">Vocabulary Learning</h1>
          <p className="text-sm text-gray-500">AI-Powered Image Generation</p>
        </div>
        
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <NavLink 
              key={item.href}
              href={item.href}
              icon={item.icon}
              isActive={pathname === item.href}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default PipecatNavbar;

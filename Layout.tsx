import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, Camera, LayoutDashboard, User, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { NotificationSystem } from './NotificationSystem';

export function Navbar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Map', icon: Map },
    { path: '/report', label: 'Report', icon: Camera },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center z-50 sm:top-0 sm:bottom-auto sm:flex-col sm:w-20 sm:h-full sm:border-t-0 sm:border-r">
      <div className="hidden sm:flex items-center justify-center mb-8 mt-4">
        <ShieldAlert className="w-8 h-8 text-blue-600" />
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center p-2 rounded-lg transition-colors",
              isActive ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-blue-500 hover:bg-gray-50"
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0 sm:pl-20">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sm:hidden">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">CivicClean AI+</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {children}
      </main>
      <Navbar />
      <NotificationSystem />
    </div>
  );
}


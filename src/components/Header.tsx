'use client';

import { useState, useEffect } from 'react';

interface HeaderProps {
  projectName: string;
  nashStatus: 'online' | 'busy' | 'offline';
  activeTasks: number;
  pendingTasks: number;
}

export function Header({ projectName, nashStatus, activeTasks, pendingTasks }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }).toUpperCase();
  };

  const statusConfig = {
    online: { color: 'bg-emerald-500', label: 'Online' },
    busy: { color: 'bg-amber-500', label: 'Working' },
    offline: { color: 'bg-stone-300', label: 'Offline' },
  };

  const s = statusConfig[nashStatus];

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
      {/* Left: Logo & Project */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-stone-400">◇</span>
          <span className="text-lg font-semibold tracking-tight text-stone-900">MISSION CONTROL</span>
        </div>
        <span className="px-3 py-1 text-xs font-medium text-stone-500 bg-stone-100 rounded">
          {projectName}
        </span>
      </div>

      {/* Center: Stats */}
      <div className="flex items-center gap-12">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className={`w-3 h-3 rounded-full ${s.color}`} />
            <span className="text-xl font-light text-stone-900">{s.label}</span>
          </div>
          <div className="text-[10px] tracking-widest text-stone-400 uppercase">Nash</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-light text-stone-900">{activeTasks}</div>
          <div className="text-[10px] tracking-widest text-stone-400 uppercase">Active</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-light text-stone-900">{pendingTasks}</div>
          <div className="text-[10px] tracking-widest text-stone-400 uppercase">Pending</div>
        </div>
      </div>

      {/* Right: Time */}
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-xl font-light tracking-wider text-stone-900">{formatTime(time)}</div>
          <div className="text-[10px] tracking-wider text-stone-400">{formatDate(time)}</div>
        </div>
      </div>
    </header>
  );
}

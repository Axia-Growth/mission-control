'use client';

import { useState, useEffect } from 'react';

interface HeaderProps {
  projectName: string;
  agentsActive: number;
  tasksInQueue: number;
  isOnline: boolean;
}

export function Header({ projectName, agentsActive, tasksInQueue, isOnline }: HeaderProps) {
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
          <div className="text-3xl font-light text-stone-900">{agentsActive}</div>
          <div className="text-[10px] tracking-widest text-stone-400 uppercase">Agents Active</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-light text-stone-900">{tasksInQueue}</div>
          <div className="text-[10px] tracking-widest text-stone-400 uppercase">Tasks in Queue</div>
        </div>
      </div>

      {/* Right: Time & Status */}
      <div className="flex items-center gap-6">
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-600 border border-stone-200 rounded hover:bg-stone-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Docs
        </button>
        <div className="text-right">
          <div className="text-xl font-light tracking-wider text-stone-900">{formatTime(time)}</div>
          <div className="text-[10px] tracking-wider text-stone-400">{formatDate(time)}</div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>
    </header>
  );
}

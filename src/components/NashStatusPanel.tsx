'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface OperatorStatus {
  ampFreeRemaining: number;
  ampFreeTotal: number;
  ampWorkspaceBalance: number;
  ralphLoopRunning: boolean;
  ralphLoopCurrentTask?: number;
  ralphLoopTotalTasks?: number;
  ralphLoopProject?: string;
  lastUpdated: number;
}

interface NashStatusPanelProps {
  status: 'online' | 'busy' | 'offline';
  currentTask?: string;
  tasksCompletedToday?: number;
  operatorStatus?: OperatorStatus | null;
}

function formatLastUpdated(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function NashStatusPanel({ 
  status, 
  currentTask,
  tasksCompletedToday = 0,
  operatorStatus 
}: NashStatusPanelProps) {
  const [syncRequested, setSyncRequested] = useState(false);
  const statusConfig = {
    online: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'ONLINE' },
    busy: { dot: 'bg-amber-500', text: 'text-amber-600', label: 'WORKING' },
    offline: { dot: 'bg-stone-300', text: 'text-stone-400', label: 'OFFLINE' },
  };

  const s = statusConfig[status];
  
  // AMP credits calculation
  const ampFreePercent = operatorStatus 
    ? (operatorStatus.ampFreeRemaining / operatorStatus.ampFreeTotal) * 100 
    : 100;

  return (
    <div className="w-72 flex-shrink-0 border-r border-stone-200 bg-white overflow-y-auto">
      {/* Nash Identity */}
      <div className="px-4 py-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-2xl">
            ♟️
          </div>
          <div>
            <div className="font-semibold text-stone-900">Nash Vega</div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
            </div>
          </div>
        </div>
        {currentTask && (
          <div className="mt-3 p-2 bg-amber-50 rounded-lg">
            <div className="text-xs text-amber-600 font-medium">Current Task</div>
            <div className="text-sm text-stone-700 truncate">{currentTask}</div>
          </div>
        )}
      </div>

      {/* AMP Credits */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="text-sm font-medium text-stone-700">AMP Code</span>
          </div>
          <button
            onClick={() => {
              setSyncRequested(true);
              // TODO: Wire up to operatorStatus.update mutation
              setTimeout(() => setSyncRequested(false), 2000);
            }}
            className="p-1 rounded hover:bg-stone-100 transition-colors group relative"
            title={operatorStatus ? `Last updated: ${formatLastUpdated(operatorStatus.lastUpdated)}` : 'Sync AMP status'}
          >
            <RefreshCw 
              className={`w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 ${syncRequested ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>
        
        {operatorStatus ? (
          <>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-stone-500">Free Credits</span>
              <span className="font-mono text-stone-700">
                ${operatorStatus.ampFreeRemaining.toFixed(2)}/${operatorStatus.ampFreeTotal}
              </span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${ampFreePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Workspace</span>
              <span className="font-mono text-stone-700">
                ${operatorStatus.ampWorkspaceBalance.toFixed(2)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-xs text-stone-400">Loading...</div>
        )}
      </div>

      {/* Ralph Loop Status */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔄</span>
          <span className="text-sm font-medium text-stone-700">Ralph Loop</span>
        </div>
        
        {operatorStatus?.ralphLoopRunning ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-amber-600 font-medium">RUNNING</span>
            </div>
            {operatorStatus.ralphLoopProject && (
              <div className="text-xs text-stone-500">{operatorStatus.ralphLoopProject}</div>
            )}
            {operatorStatus.ralphLoopTotalTasks && (
              <div className="text-sm text-stone-700">
                Task {operatorStatus.ralphLoopCurrentTask || 1}/{operatorStatus.ralphLoopTotalTasks}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-stone-300" />
            <span className="text-xs text-stone-400">Idle</span>
          </div>
        )}
      </div>

      {/* Today's Stats */}
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-stone-500 uppercase mb-3">Today</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-stone-50 rounded-lg p-3">
            <div className="text-2xl font-semibold text-stone-900">{tasksCompletedToday}</div>
            <div className="text-xs text-stone-500">Tasks Done</div>
          </div>
          <div className="bg-stone-50 rounded-lg p-3">
            <div className="text-2xl font-semibold text-stone-900">—</div>
            <div className="text-xs text-stone-500">Cost</div>
          </div>
        </div>
      </div>
    </div>
  );
}

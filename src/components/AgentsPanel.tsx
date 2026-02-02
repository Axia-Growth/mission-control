'use client';

import { Agent } from '@/lib/types';

interface AgentsPanelProps {
  agents: Agent[];
}

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  founder: { label: 'LEAD', color: 'bg-amber-100 text-amber-700' },
  lead: { label: 'LEAD', color: 'bg-amber-100 text-amber-700' },
  specialist: { label: 'SPC', color: 'bg-stone-100 text-stone-600' },
  intern: { label: 'INT', color: 'bg-orange-100 text-orange-600' },
};

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  online: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'WORKING' },
  busy: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'WORKING' },
  idle: { dot: 'bg-amber-500', text: 'text-amber-600', label: 'IDLE' },
  offline: { dot: 'bg-stone-300', text: 'text-stone-400', label: 'OFFLINE' },
};

const AGENT_ICONS: Record<string, string> = {
  mike: '👤',
  nash: '♟️',
  dev: '⚡',
  otto: '📋',
};

export function AgentsPanel({ agents }: AgentsPanelProps) {
  const activeCount = agents.filter(a => a.status === 'online' || a.status === 'busy').length;

  return (
    <div className="w-64 flex-shrink-0 border-r border-stone-200 bg-white overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium text-stone-900">AGENTS</span>
          <span className="ml-auto text-sm text-stone-400">{agents.length}</span>
        </div>
      </div>

      {/* Agent List */}
      <div className="py-2">
        {agents.map(agent => {
          const roleType = agent.config?.role?.toLowerCase().includes('founder') ? 'founder' :
                          agent.config?.role?.toLowerCase().includes('chief') ? 'lead' :
                          agent.config?.role?.toLowerCase().includes('intern') ? 'intern' : 'specialist';
          const badge = ROLE_BADGES[roleType];
          const status = STATUS_STYLES[agent.status] || STATUS_STYLES.offline;
          const icon = AGENT_ICONS[agent.name.toLowerCase()] || agent.config?.emoji || '🤖';

          return (
            <div 
              key={agent._id} 
              className="px-4 py-3 hover:bg-stone-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">
                  {icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-900 truncate">{agent.name}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    <span className={`text-[11px] font-medium ${status.text}`}>{status.label}</span>
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5 truncate">
                    {agent.config?.role || 'Agent'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

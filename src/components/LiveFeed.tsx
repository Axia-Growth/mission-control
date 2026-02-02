'use client';

import { useState } from 'react';
import { useQuery, api } from '@/lib/convex';
import { Agent, ActivityLog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface LiveFeedProps {
  agents: Agent[];
}

type FilterType = 'all' | 'tasks' | 'comments' | 'status';

const AGENT_ICONS: Record<string, string> = {
  mike: '👤',
  nash: '♟️',
  dev: '⚡',
  otto: '📋',
};

export function LiveFeed({ agents }: LiveFeedProps) {
  const activities = useQuery(api.activity.recent, { limit: 100 }) as ActivityLog[] | undefined;
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const getAgentInfo = (agentName: string | undefined) => {
    if (!agentName) return null;
    return agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
  };

  const formatTime = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: false });
    } catch {
      return '';
    }
  };

  // Map action types to filter categories
  const getFilterType = (actionType: string): FilterType => {
    if (actionType.includes('task')) return 'tasks';
    if (actionType.includes('comment')) return 'comments';
    if (actionType.includes('heartbeat') || actionType.includes('status')) return 'status';
    return 'tasks';
  };

  const filteredActivities = (activities || []).filter(a => {
    if (filter !== 'all' && getFilterType(a.actionType) !== filter) return false;
    if (selectedAgent) {
      if (a.agent.toLowerCase() !== selectedAgent.toLowerCase()) return false;
    }
    return true;
  });

  const counts = {
    all: (activities || []).length,
    tasks: (activities || []).filter(a => getFilterType(a.actionType) === 'tasks').length,
    comments: (activities || []).filter(a => getFilterType(a.actionType) === 'comments').length,
    status: (activities || []).filter(a => getFilterType(a.actionType) === 'status').length,
  };

  return (
    <div className="w-80 flex-shrink-0 border-l border-stone-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-stone-900">LIVE FEED</span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-stone-100">
        {/* Type filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(['all', 'tasks', 'comments', 'status'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                filter === f
                  ? 'bg-amber-100 border-amber-200 text-amber-800'
                  : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} {counts[f]}
            </button>
          ))}
        </div>

        {/* Agent filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAgent(null)}
            className={`px-2 py-1 text-xs rounded-full border transition-colors ${
              !selectedAgent
                ? 'bg-amber-100 border-amber-200 text-amber-800'
                : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
            }`}
          >
            All Agents
          </button>
          {agents.map(agent => {
            const icon = AGENT_ICONS[agent.name.toLowerCase()] || agent.config?.emoji || '🤖';
            const activityCount = (activities || []).filter(a => 
              a.agent.toLowerCase() === agent.name.toLowerCase()
            ).length;

            return (
              <button
                key={agent._id}
                onClick={() => setSelectedAgent(agent.name)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors flex items-center gap-1 ${
                  selectedAgent === agent.name
                    ? 'bg-amber-100 border-amber-200 text-amber-800'
                    : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                <span>{icon}</span>
                <span>{agent.name}</span>
                <span className="text-stone-400">{activityCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {activities === undefined ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">
            No activity yet
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredActivities.map(activity => {
              const agent = getAgentInfo(activity.agent);
              const icon = agent 
                ? (AGENT_ICONS[agent.name.toLowerCase()] || agent.config?.emoji || '🤖')
                : '📝';
              const details = activity.details as { title?: string; oldStatus?: string; newStatus?: string } | undefined;

              return (
                <div key={activity._id} className="px-4 py-3 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm flex-shrink-0">
                      {icon}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-stone-900">
                        <span className="font-semibold text-amber-700">{activity.agent}</span>
                        {' '}
                        <span className="text-stone-500">
                          {activity.actionType === 'task_completed' && 'completed'}
                          {activity.actionType === 'task_started' && 'started'}
                          {activity.actionType === 'task_created' && 'created'}
                          {activity.actionType === 'task_updated' && 'updated'}
                          {activity.actionType === 'comment_added' && 'commented on'}
                          {activity.actionType === 'heartbeat' && 'heartbeat'}
                        </span>
                        {details?.title && (
                          <>
                            {' '}
                            <span className="font-medium">&quot;{details.title}&quot;</span>
                          </>
                        )}
                        {details?.newStatus && !details?.title && (
                          <span className="text-stone-400"> → {details.newStatus}</span>
                        )}
                      </div>

                      <div className="text-[10px] text-stone-400 mt-1">
                        {formatTime(activity._creationTime)} ago
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

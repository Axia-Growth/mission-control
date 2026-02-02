'use client';

import { useQuery, api } from '@/lib/convex';
import { Agent, Task } from '@/lib/types';
import { Bot, CheckCircle2, Clock, AlertTriangle, MoreHorizontal } from 'lucide-react';

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  online: { 
    color: 'text-green-700', 
    bg: 'bg-green-100',
    icon: <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
  },
  busy: { 
    color: 'text-blue-700', 
    bg: 'bg-blue-100',
    icon: <Clock className="w-3 h-3 text-blue-600" />
  },
  offline: { 
    color: 'text-gray-500', 
    bg: 'bg-gray-100',
    icon: <div className="w-2 h-2 rounded-full bg-gray-400" />
  },
};

const AGENT_ICONS: Record<string, string> = {
  mike: '👤',
  nash: '♟️',
  dev: '⚡',
  otto: '📋',
};

export default function AgentsPage() {
  const agents = useQuery(api.agents.list) as Agent[] | undefined;
  const tasks = useQuery(api.tasks.list, { includeCancelled: false }) as Task[] | undefined;

  function getTimeSince(timestamp: number | undefined): string {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (agents === undefined || tasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Group tasks by assignee
  const tasksByAgent: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    if (task.assignedTo && task.status !== 'done') {
      const key = task.assignedTo.toLowerCase();
      if (!tasksByAgent[key]) tasksByAgent[key] = [];
      tasksByAgent[key].push(task);
    }
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <p className="text-gray-500">ML Holdings agent team status and workload</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
          const agentTasks = tasksByAgent[agent.name.toLowerCase()] || [];
          const urgentCount = agentTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
          const icon = AGENT_ICONS[agent.name.toLowerCase()] || agent.config?.emoji || '🤖';

          return (
            <div key={agent._id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                      {icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">{agent.name}</h3>
                      <p className="text-sm text-gray-500">{agent.config?.role || 'Agent'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    {status.icon}
                    <span className="capitalize">{agent.status}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-4 bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Active tasks</span>
                  <span className="font-medium">{agentTasks.length}</span>
                </div>
                {urgentCount > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      High priority
                    </span>
                    <span className="font-medium text-orange-600">{urgentCount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500">Last seen</span>
                  <span className="text-gray-600">{getTimeSince(agent.lastHeartbeat)}</span>
                </div>
                {agent.costToday !== undefined && agent.costToday > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">Cost today</span>
                    <span className="text-gray-600">${agent.costToday.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Current Work */}
              {agentTasks.length > 0 && (
                <div className="p-4 border-t">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Working on</p>
                  <ul className="space-y-2">
                    {agentTasks.slice(0, 3).map((task) => (
                      <li key={task._id} className="flex items-center gap-2 text-sm">
                        {task.status === 'in_progress' ? (
                          <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className="truncate text-gray-700">{task.title}</span>
                      </li>
                    ))}
                    {agentTasks.length > 3 && (
                      <li className="flex items-center gap-2 text-sm text-gray-500">
                        <MoreHorizontal className="w-4 h-4 flex-shrink-0" />
                        <span>+{agentTasks.length - 3} more</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

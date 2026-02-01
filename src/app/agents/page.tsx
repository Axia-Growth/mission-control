'use client';

import { useEffect, useState } from 'react';
import { getSupabase, Agent, Task } from '@/lib/supabase';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_COLORS = {
  online: 'bg-green-100 text-green-700 border-green-200',
  busy: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  offline: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = getSupabase();
    
    const [agentsRes, tasksRes] = await Promise.all([
      supabase.from('mc_agents').select('*').order('created_at'),
      supabase.from('mc_tasks').select('*').not('status', 'in', '("done","cancelled")'),
    ]);

    if (agentsRes.data) setAgents(agentsRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    setLoading(false);
  }

  function getAgentTasks(agentId: string) {
    return tasks.filter(t => t.assigned_to === agentId);
  }

  function formatLastSeen(lastHeartbeat: string | null) {
    if (!lastHeartbeat) return 'Never';
    const diff = Date.now() - new Date(lastHeartbeat).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(lastHeartbeat).toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <p className="text-gray-500">Team members and their current workload</p>
      </div>

      <div className="grid gap-4">
        {agents.map(agent => {
          const agentTasks = getAgentTasks(agent.id);
          const inProgress = agentTasks.filter(t => t.status === 'in_progress').length;
          const pending = agentTasks.filter(t => t.status === 'pending').length;

          return (
            <div key={agent.id} className="bg-white rounded-lg border p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{agent.config?.emoji || '🤖'}</div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{agent.name}</h2>
                    <p className="text-sm text-gray-500 capitalize">{agent.config?.role || 'Agent'}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full border text-sm font-medium ${STATUS_COLORS[agent.status]}`}>
                  {agent.status}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
                  <div className="text-xs text-gray-500">In Progress</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-600">{pending}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{agentTasks.length}</div>
                  <div className="text-xs text-gray-500">Total Active</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Last seen: {formatLastSeen(agent.last_heartbeat)}
                </div>
              </div>

              {agentTasks.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Current Tasks</h3>
                  <ul className="space-y-1">
                    {agentTasks.slice(0, 5).map(task => (
                      <li key={task.id} className="text-sm flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          task.status === 'in_progress' ? 'bg-blue-500' : 
                          task.status === 'blocked' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-gray-700">{task.title}</span>
                        {task.project && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{task.project}</span>
                        )}
                      </li>
                    ))}
                    {agentTasks.length > 5 && (
                      <li className="text-xs text-gray-400">+{agentTasks.length - 5} more</li>
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

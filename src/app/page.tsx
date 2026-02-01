'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ActivityFeed } from '@/components/ActivityFeed';
import { CostTracker } from '@/components/CostTracker';

interface Agent {
  id: string;
  name: string;
  status: string;
  role?: string;
  config?: { emoji?: string };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  project?: string;
  due_at?: string;
}

const PRIORITY_COLORS = {
  low: 'border-l-gray-300',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

const AGENT_STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500',
  busy: 'bg-yellow-500',
  idle: 'bg-yellow-400',
  offline: 'bg-gray-400',
};

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');

  useEffect(() => {
    fetchData();
    
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    const agentsChannel = supabase
      .channel('agents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_agents' }, () => {
        fetchAgents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(agentsChannel);
    };
  }, []);

  async function fetchData() {
    await Promise.all([fetchAgents(), fetchTasks()]);
    setLoading(false);
  }

  async function fetchAgents() {
    const { data } = await supabase
      .from('mc_agents')
      .select('*')
      .order('created_at');
    if (data) setAgents(data);
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('mc_tasks')
      .select('*')
      .not('status', 'eq', 'done')
      .not('status', 'eq', 'cancelled')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setTasks(data);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await supabase.from('mc_tasks').insert({
      title: newTaskTitle,
      created_by: 'mike',
      assigned_to: newTaskAssignee || null,
      project: newTaskProject || null,
      priority: 'normal',
    });

    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskProject('');
  }

  async function updateTaskStatus(taskId: string, status: Task['status']) {
    await supabase
      .from('mc_tasks')
      .update({ 
        status,
        started_at: status === 'in_progress' ? new Date().toISOString() : undefined,
        completed_at: status === 'done' ? new Date().toISOString() : undefined,
      })
      .eq('id', taskId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    review: tasks.filter(t => t.status === 'review'),
  };

  return (
    <div className="flex gap-6">
      {/* Main Content - Kanban */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Agent task coordination</p>
          </div>
          <div className="flex items-center gap-4 bg-white rounded-lg px-4 py-2 shadow-sm border">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${AGENT_STATUS_COLORS[agent.status] || AGENT_STATUS_COLORS.offline}`} />
                <span className="text-sm capitalize">{agent.config?.emoji} {agent.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Add Task */}
        <form onSubmit={createTask} className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task..."
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {agents.filter(a => a.name !== 'mike').map(agent => (
                <option key={agent.id} value={agent.name}>{agent.name}</option>
              ))}
            </select>
            <select
              value={newTaskProject}
              onChange={(e) => setNewTaskProject(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Project</option>
              <option value="axia-os">Axia OS</option>
              <option value="just-ccd">Just CC&apos;d</option>
              <option value="weight-supply">Weight Supply</option>
              <option value="mission-control">Mission Control</option>
              <option value="personal-brand">Personal Brand</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Task
            </button>
          </div>
        </form>

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-4">
          {(['pending', 'in_progress', 'blocked', 'review'] as const).map(status => (
            <div key={status} className="bg-gray-100 rounded-lg p-3">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between text-sm">
                <span className="capitalize">{status.replace('_', ' ')}</span>
                <span className="bg-white px-2 py-0.5 rounded-full text-xs">
                  {tasksByStatus[status].length}
                </span>
              </h3>
              <div className="space-y-2">
                {tasksByStatus[status].map(task => (
                  <div
                    key={task.id}
                    className={`bg-white rounded-lg shadow-sm border-l-4 p-3 ${PRIORITY_COLORS[task.priority]}`}
                  >
                    <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.project && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {task.project}
                          </span>
                        )}
                        {task.assigned_to && (
                          <span className="text-xs text-gray-500">
                            → {task.assigned_to}
                          </span>
                        )}
                      </div>
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                        className="text-xs border rounded px-1 py-0.5 bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                ))}
                {tasksByStatus[status].length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar - Activity + Costs */}
      <div className="w-80 flex-shrink-0 space-y-4">
        <CostTracker />
        <ActivityFeed limit={15} />
      </div>
    </div>
  );
}

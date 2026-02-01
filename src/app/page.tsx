'use client';

import { useEffect, useState } from 'react';
import { getSupabase, Agent, Task } from '@/lib/supabase';

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  review: 'bg-purple-100 text-purple-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-500',
};

const PRIORITY_COLORS = {
  low: 'border-l-gray-300',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

const AGENT_STATUS_COLORS = {
  online: 'bg-green-500',
  busy: 'bg-yellow-500',
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
    
    // Set up realtime subscriptions
    const tasksChannel = getSupabase()
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    const agentsChannel = getSupabase()
      .channel('agents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_agents' }, () => {
        fetchAgents();
      })
      .subscribe();

    return () => {
      getSupabase().removeChannel(tasksChannel);
      getSupabase().removeChannel(agentsChannel);
    };
  }, []);

  async function fetchData() {
    await Promise.all([fetchAgents(), fetchTasks()]);
    setLoading(false);
  }

  async function fetchAgents() {
    const { data } = await getSupabase()
      .from('mc_agents')
      .select('*')
      .order('created_at');
    if (data) setAgents(data);
  }

  async function fetchTasks() {
    const { data } = await getSupabase()
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

    await getSupabase().from('mc_tasks').insert({
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
    await getSupabase()
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading Mission Control...</div>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mission Control</h1>
            <p className="text-sm text-gray-500">ML Holdings Agent Coordination</p>
          </div>
          <div className="flex items-center gap-4">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${AGENT_STATUS_COLORS[agent.status]}`} />
                <span className="text-sm">{agent.config?.emoji} {agent.name}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="p-6">
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
              {agents.filter(a => a.id !== 'mike').map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
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
            <div key={status} className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
                <span className="capitalize">{status.replace('_', ' ')}</span>
                <span className="text-sm bg-white px-2 py-0.5 rounded-full">
                  {tasksByStatus[status].length}
                </span>
              </h3>
              <div className="space-y-3">
                {tasksByStatus[status].map(task => (
                  <div
                    key={task.id}
                    className={`bg-white rounded-lg shadow-sm border-l-4 p-3 ${PRIORITY_COLORS[task.priority]}`}
                  >
                    <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {task.project && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {task.project}
                          </span>
                        )}
                        {task.assigned_to && (
                          <span className="text-xs text-gray-500">
                            → {agents.find(a => a.id === task.assigned_to)?.name || task.assigned_to}
                          </span>
                        )}
                      </div>
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                        className="text-xs border rounded px-1 py-0.5"
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
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

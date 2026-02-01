'use client';

import { useEffect, useState } from 'react';
import { getSupabase, Task } from '@/lib/supabase';
import { Plus, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const PRIORITY_BADGES = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const STATUS_BADGES = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-500',
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('normal');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const supabase = getSupabase();
    
    // Active tasks for Mike
    const { data: active } = await supabase
      .from('mc_tasks')
      .select('*')
      .or('assigned_to.eq.mike,created_by.eq.mike')
      .not('status', 'in', '("done","cancelled")')
      .order('priority', { ascending: false })
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    // Completed tasks
    const { data: completed } = await supabase
      .from('mc_tasks')
      .select('*')
      .or('assigned_to.eq.mike,created_by.eq.mike')
      .in('status', ['done', 'cancelled'])
      .order('completed_at', { ascending: false })
      .limit(20);

    if (active) setTasks(active);
    if (completed) setCompletedTasks(completed);
    setLoading(false);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await getSupabase().from('mc_tasks').insert({
      title: newTaskTitle,
      created_by: 'mike',
      assigned_to: 'mike',
      priority: newTaskPriority,
      due_at: newTaskDue || null,
    });

    setNewTaskTitle('');
    setNewTaskDue('');
    setNewTaskPriority('normal');
    fetchTasks();
  }

  async function toggleComplete(task: Task) {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    await getSupabase()
      .from('mc_tasks')
      .update({ 
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', task.id);
    fetchTasks();
  }

  async function updateStatus(taskId: string, status: Task['status']) {
    await getSupabase()
      .from('mc_tasks')
      .update({ 
        status,
        started_at: status === 'in_progress' ? new Date().toISOString() : undefined,
        completed_at: status === 'done' ? new Date().toISOString() : undefined,
      })
      .eq('id', taskId);
    fetchTasks();
  }

  function formatDue(dueAt: string | null) {
    if (!dueAt) return null;
    const due = new Date(dueAt);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Overdue', class: 'text-red-600' };
    if (diffDays === 0) return { text: 'Today', class: 'text-orange-600' };
    if (diffDays === 1) return { text: 'Tomorrow', class: 'text-yellow-600' };
    if (diffDays <= 7) return { text: `${diffDays} days`, class: 'text-blue-600' };
    return { text: due.toLocaleDateString(), class: 'text-gray-500' };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  const overdueTasks = tasks.filter(t => t.due_at && new Date(t.due_at) < new Date());
  const upcomingTasks = tasks.filter(t => !t.due_at || new Date(t.due_at) >= new Date());

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-500">Personal tasks and reminders</p>
      </div>

      {/* Quick Add */}
      <form onSubmit={createTask} className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task..."
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={newTaskDue}
            onChange={(e) => setNewTaskDue(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </form>

      {/* Overdue Section */}
      {overdueTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Overdue ({overdueTasks.length})
          </h2>
          <div className="space-y-2">
            {overdueTasks.map(task => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onToggle={toggleComplete}
                onStatusChange={updateStatus}
                formatDue={formatDue}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Tasks */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Active ({upcomingTasks.length})
        </h2>
        {upcomingTasks.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            No active tasks. Add one above!
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map(task => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onToggle={toggleComplete}
                onStatusChange={updateStatus}
                formatDue={formatDue}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Toggle */}
      <div className="border-t pt-4">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          {showCompleted ? 'Hide' : 'Show'} completed ({completedTasks.length})
        </button>
        
        {showCompleted && completedTasks.length > 0 && (
          <div className="mt-3 space-y-2 opacity-60">
            {completedTasks.map(task => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onToggle={toggleComplete}
                onStatusChange={updateStatus}
                formatDue={formatDue}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ 
  task, 
  onToggle, 
  onStatusChange,
  formatDue 
}: { 
  task: Task; 
  onToggle: (task: Task) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  formatDue: (due: string | null) => { text: string; class: string } | null;
}) {
  const dueInfo = formatDue(task.due_at);
  const isDone = task.status === 'done';

  return (
    <div className={`bg-white rounded-lg border p-3 flex items-center gap-3 ${isDone ? 'opacity-60' : ''}`}>
      <button
        onClick={() => onToggle(task)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isDone 
            ? 'bg-green-500 border-green-500 text-white' 
            : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {isDone && <CheckCircle2 className="h-3 w-3" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {task.project && (
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{task.project}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_BADGES[task.priority]}`}>
            {task.priority}
          </span>
        </div>
      </div>

      {dueInfo && (
        <div className={`flex items-center gap-1 text-sm ${dueInfo.class}`}>
          <Calendar className="h-4 w-4" />
          {dueInfo.text}
        </div>
      )}

      {!isDone && (
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
          className="text-xs border rounded px-2 py-1"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
      )}
    </div>
  );
}

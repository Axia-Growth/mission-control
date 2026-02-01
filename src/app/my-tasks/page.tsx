'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string | null;
  due_date: string | null;
  created_at: string;
  mentions: string[];
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-gray-400',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  done: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  'in-progress': <Clock className="h-5 w-5 text-blue-500" />,
  blocked: <AlertCircle className="h-5 w-5 text-red-500" />,
  todo: <Circle className="h-5 w-5 text-gray-400" />,
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);

  useEffect(() => {
    fetchMyTasks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('my-tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mc_tasks' },
        () => fetchMyTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMyTasks() {
    const { data, error } = await supabase
      .from('mc_tasks')
      .select('*')
      .or('assignee.eq.mike,mentions.cs.{mike}')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;

    const { error } = await supabase.from('mc_tasks').insert({
      title: newTaskTitle,
      assignee: 'mike',
      status: 'todo',
      priority: 'medium',
      mentions: [],
    });

    if (error) {
      console.error('Error adding task:', error);
    } else {
      setNewTaskTitle('');
      setShowNewTask(false);
    }
  }

  async function toggleTaskStatus(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const { error } = await supabase
      .from('mc_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      console.error('Error updating task:', error);
    }
  }

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500">Tasks assigned to or mentioning Mike</p>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* New Task Input */}
      {showNewTask && (
        <div className="bg-white rounded-lg border p-4 mb-4 shadow-sm">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setShowNewTask(false)}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={addTask}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Task
            </button>
          </div>
        </div>
      )}

      {/* Active Tasks */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
          <h2 className="font-semibold text-gray-700">Active ({activeTasks.length})</h2>
        </div>
        {activeTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No active tasks — you&apos;re all caught up! 🎉
          </div>
        ) : (
          <ul className="divide-y">
            {activeTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3 p-4 hover:bg-gray-50">
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {STATUS_ICONS[task.status] || STATUS_ICONS.todo}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className={`font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    {task.due_date && (
                      <span className="text-gray-500">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.assignee && task.assignee !== 'mike' && (
                      <span className="text-gray-500">
                        Assigned to: {task.assignee}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-semibold text-gray-500">Completed ({completedTasks.length})</h2>
          </div>
          <ul className="divide-y">
            {completedTasks.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className="flex-shrink-0"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </button>
                <span className="text-gray-500 line-through">{task.title}</span>
              </li>
            ))}
          </ul>
          {completedTasks.length > 5 && (
            <div className="px-4 py-2 text-center text-sm text-gray-500 border-t">
              +{completedTasks.length - 5} more completed
            </div>
          )}
        </div>
      )}
    </div>
  );
}

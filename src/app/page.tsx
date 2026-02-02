'use client';

import { useState } from 'react';
import { useQuery, useMutation, api } from '@/lib/convex';
import { Id } from '../../convex/_generated/dataModel';
import { Header } from '@/components/Header';
import { AgentsPanel } from '@/components/AgentsPanel';
import { MissionQueue } from '@/components/MissionQueue';
import { LiveFeed } from '@/components/LiveFeed';
import { CommentSection } from '@/components/CommentSection';

// Map Convex types to component types
type Agent = {
  _id: Id<"agents">;
  name: string;
  status: 'online' | 'busy' | 'offline';
  currentTaskId?: Id<"tasks">;
  lastHeartbeat?: number;
  config: { role: string; emoji: string };
  healthStatus?: 'healthy' | 'degraded' | 'error';
  tokensToday?: number;
  costToday?: number;
  discordUserId?: string;
  _creationTime: number;
};

type Task = {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdBy: string;
  assignedTo?: string;
  project?: string;
  tags?: string[];
  parentTaskId?: Id<"tasks">;
  mentions?: string[];
  dueAt?: number;
  startedAt?: number;
  completedAt?: number;
  _creationTime: number;
};

export default function CommandCenter() {
  const agents = useQuery(api.agents.list) as Agent[] | undefined;
  const tasks = useQuery(api.tasks.list, { includeCancelled: false }) as Task[] | undefined;
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  
  const [isOnline, setIsOnline] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Loading state
  if (agents === undefined || tasks === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4" />
          <p className="text-stone-500 text-sm">Loading Mission Control...</p>
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter(a => a.status === 'online' || a.status === 'busy').length;
  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;

  async function handleTaskStatusChange(taskId: string, status: Task['status']) {
    await updateTaskStatus({ 
      id: taskId as Id<"tasks">, 
      status,
      changedBy: 'mike',
    });
  }

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      {/* Header */}
      <Header
        projectName="ML Holdings"
        agentsActive={activeAgents}
        tasksInQueue={activeTasks}
        isOnline={isOnline}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Agents Panel */}
        <AgentsPanel agents={agents} />

        {/* Center: Mission Queue (Kanban) */}
        <MissionQueue
          tasks={tasks}
          agents={agents}
          onTaskStatusChange={handleTaskStatusChange}
          onTaskClick={setSelectedTask}
        />

        {/* Right: Live Feed */}
        <LiveFeed agents={agents} />
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          agents={agents}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleTaskStatusChange}
        />
      )}
    </div>
  );
}

interface TaskDetailModalProps {
  task: Task;
  agents: Agent[];
  onClose: () => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
}

function TaskDetailModal({ task, agents, onClose, onStatusChange }: TaskDetailModalProps) {
  const AGENT_ICONS: Record<string, string> = {
    mike: '👤',
    nash: '♟️',
    dev: '⚡',
    otto: '📋',
  };

  const assignedAgent = agents.find(a => a.name.toLowerCase() === task.assignedTo?.toLowerCase());
  const assignedIcon = assignedAgent 
    ? (AGENT_ICONS[assignedAgent.name.toLowerCase()] || assignedAgent.config?.emoji || '🤖')
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-stone-900">{task.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              {task.project && (
                <span className="px-2 py-0.5 text-xs text-amber-700 bg-amber-50 rounded">
                  {task.project}
                </span>
              )}
              <span className={`px-2 py-0.5 text-xs rounded ${
                task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                task.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                'bg-stone-100 text-stone-600'
              }`}>
                {task.priority}
              </span>
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task._id, e.target.value as Task['status'])}
                className="text-xs border border-stone-200 rounded px-2 py-1"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Description */}
          {task.description && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-stone-500 uppercase mb-2">Description</h3>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Assigned */}
          {assignedAgent && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-stone-500 uppercase mb-2">Assigned To</h3>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                  {assignedIcon}
                </span>
                <span className="text-sm font-medium text-stone-900">{assignedAgent.name}</span>
                <span className="text-xs text-stone-500">{assignedAgent.config?.role}</span>
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-stone-500 uppercase mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 text-xs text-stone-600 bg-stone-100 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <CommentSection taskId={task._id} taskTitle={task.title} />
        </div>
      </div>
    </div>
  );
}

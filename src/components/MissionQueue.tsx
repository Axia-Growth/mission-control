'use client';

import { Task, Agent } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface MissionQueueProps {
  tasks: Task[];
  agents: Agent[];
  onTaskStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onTaskClick?: (task: Task) => void;
}

const PRIORITY_INDICATOR: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-stone-400',
};

export function MissionQueue({ tasks, agents, onTaskStatusChange, onTaskClick }: MissionQueueProps) {
  // For assigned column, filter tasks that are pending but have assignee
  const assignedTasks = tasks.filter(t => t.status === 'pending' && t.assignedTo);
  const inboxTasks = tasks.filter(t => t.status === 'pending' && !t.assignedTo);
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="flex-1 overflow-x-auto bg-stone-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-stone-400" />
          <span className="text-sm font-medium text-stone-900">MISSION QUEUE</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-amber-100 flex items-center justify-center text-[10px]">⚡</span>
            1
          </span>
          <span>{tasks.length} active</span>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 min-w-max">
        <KanbanColumn
          title="INBOX"
          count={inboxTasks.length}
          tasks={inboxTasks}
          agents={agents}
          onTaskStatusChange={onTaskStatusChange}
          onTaskClick={onTaskClick}
        />
        <KanbanColumn
          title="ASSIGNED"
          count={assignedTasks.length}
          tasks={assignedTasks}
          agents={agents}
          onTaskStatusChange={onTaskStatusChange}
          onTaskClick={onTaskClick}
        />
        <KanbanColumn
          title="IN PROGRESS"
          count={inProgressTasks.length}
          tasks={inProgressTasks}
          agents={agents}
          onTaskStatusChange={onTaskStatusChange}
          onTaskClick={onTaskClick}
        />
        <KanbanColumn
          title="REVIEW"
          count={reviewTasks.length}
          tasks={reviewTasks}
          agents={agents}
          onTaskStatusChange={onTaskStatusChange}
          onTaskClick={onTaskClick}
        />
        <KanbanColumn
          title="DONE"
          count={doneTasks.length}
          tasks={doneTasks}
          agents={agents}
          onTaskStatusChange={onTaskStatusChange}
          onTaskClick={onTaskClick}
        />
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  title: string;
  count: number;
  tasks: Task[];
  agents: Agent[];
  onTaskStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onTaskClick?: (task: Task) => void;
}

function KanbanColumn({ title, count, tasks, agents, onTaskStatusChange, onTaskClick }: KanbanColumnProps) {
  const getAgentInfo = (name: string | undefined) => {
    if (!name) return null;
    return agents.find(a => a.name.toLowerCase() === name.toLowerCase());
  };

  const formatTime = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: false });
    } catch {
      return '';
    }
  };

  const AGENT_ICONS: Record<string, string> = {
    mike: '👤',
    nash: '♟️',
    dev: '⚡',
    otto: '📋',
  };

  return (
    <div className="w-72 flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-stone-400" />
        <span className="text-xs font-medium text-stone-500 tracking-wider">{title}</span>
        <span className="ml-auto px-2 py-0.5 text-xs text-stone-500 bg-white rounded-full border border-stone-200">
          {count}
        </span>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map(task => {
          const agent = getAgentInfo(task.assignedTo);
          const icon = agent ? (AGENT_ICONS[agent.name.toLowerCase()] || agent.config?.emoji || '🤖') : null;

          return (
            <div
              key={task._id}
              onClick={() => onTaskClick?.(task)}
              className="bg-white rounded-lg p-4 shadow-sm border border-stone-100 hover:shadow-md hover:border-stone-200 transition-all cursor-pointer"
            >
              {/* Priority indicator */}
              {task.priority === 'urgent' || task.priority === 'high' ? (
                <div className="flex items-center gap-1 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_INDICATOR[task.priority]}`} />
                  <span className="text-[10px] font-medium text-red-600 uppercase">{task.priority}</span>
                </div>
              ) : null}

              {/* Title */}
              <h4 className="font-medium text-stone-900 text-sm leading-snug mb-2">
                {task.title}
              </h4>

              {/* Description */}
              {task.description && (
                <p className="text-xs text-stone-500 mb-3 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                {/* Assignee */}
                <div className="flex items-center gap-2">
                  {icon && (
                    <span className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs">
                      {icon}
                    </span>
                  )}
                  {agent && (
                    <span className="text-xs text-stone-600">{agent.name}</span>
                  )}
                </div>

                {/* Time */}
                <span className="text-[11px] text-stone-400">
                  {formatTime(task._creationTime)}
                </span>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-stone-100">
                  {task.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] text-stone-500 bg-stone-50 rounded">
                      {tag}
                    </span>
                  ))}
                  {task.tags.length > 3 && (
                    <span className="text-[10px] text-stone-400">+{task.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* Project badge */}
              {task.project && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <span className="px-2 py-0.5 text-[10px] text-amber-700 bg-amber-50 rounded">
                    {task.project}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="py-8 text-center text-xs text-stone-400">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

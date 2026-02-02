'use client';

import { useQuery, api } from '@/lib/convex';
import { ActivityLog } from '@/lib/types';
import { 
  CheckCircle2, 
  PlayCircle, 
  MessageSquare, 
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw
} from 'lucide-react';

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  task_completed: { 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    color: 'text-green-500 bg-green-50', 
    label: 'completed' 
  },
  task_started: { 
    icon: <PlayCircle className="h-4 w-4" />, 
    color: 'text-blue-500 bg-blue-50', 
    label: 'started' 
  },
  task_created: { 
    icon: <Zap className="h-4 w-4" />, 
    color: 'text-purple-500 bg-purple-50', 
    label: 'created' 
  },
  task_updated: { 
    icon: <RefreshCw className="h-4 w-4" />, 
    color: 'text-yellow-500 bg-yellow-50', 
    label: 'updated' 
  },
  comment_added: { 
    icon: <MessageSquare className="h-4 w-4" />, 
    color: 'text-gray-500 bg-gray-50', 
    label: 'commented on' 
  },
  heartbeat: { 
    icon: <Clock className="h-4 w-4" />, 
    color: 'text-gray-400 bg-gray-50', 
    label: 'heartbeat' 
  },
  error: { 
    icon: <AlertTriangle className="h-4 w-4" />, 
    color: 'text-red-500 bg-red-50', 
    label: 'error' 
  },
};

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityFeed({ limit = 20 }: { limit?: number }) {
  const activities = useQuery(api.activity.recent, { limit }) as ActivityLog[] | undefined;

  if (activities === undefined) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Activity Feed</h3>
        <p className="text-gray-500 text-sm text-center py-4">
          No activity yet. Actions will appear here in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-900">Activity Feed</h3>
      </div>
      <div className="divide-y max-h-[400px] overflow-y-auto">
        {activities.map((activity) => {
          const config = ACTION_CONFIG[activity.actionType] || ACTION_CONFIG.task_updated;
          const details = activity.details as { title?: string; old_status?: string; new_status?: string } | undefined;
          
          return (
            <div key={activity._id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
              <div className={`p-2 rounded-full ${config.color}`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium capitalize">{activity.agent}</span>
                  {' '}{config.label}{' '}
                  {details?.title && (
                    <span className="font-medium">&quot;{details.title}&quot;</span>
                  )}
                  {details?.new_status && !details?.title && (
                    <span className="text-gray-500">
                      → {details.new_status}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {getTimeAgo(activity._creationTime)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

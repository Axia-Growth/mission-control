'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, 
  PlayCircle, 
  MessageSquare, 
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw
} from 'lucide-react';

interface ActivityLog {
  id: string;
  timestamp: string;
  agent: string;
  action_type: string;
  details: Record<string, unknown>;
  task_id: string | null;
}

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

function getTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityFeed({ limit = 20 }: { limit?: number }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mc_activity_logs' },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityLog, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  async function fetchActivities() {
    const { data, error } = await supabase
      .from('mc_activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activities:', error);
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  }

  if (loading) {
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
          const config = ACTION_CONFIG[activity.action_type] || ACTION_CONFIG.task_updated;
          const details = activity.details as { title?: string; old_status?: string; new_status?: string };
          
          return (
            <div key={activity.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
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
                  {getTimeAgo(activity.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

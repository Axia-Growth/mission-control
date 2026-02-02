// Shared types for components (works with Convex data)
import { Id } from "../../convex/_generated/dataModel";

export interface Agent {
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
}

export interface Task {
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
}

export interface TaskComment {
  _id: Id<"taskComments">;
  taskId: Id<"tasks">;
  author: string;
  content: string;
  _creationTime: number;
}

export interface ActivityLog {
  _id: Id<"activityLogs">;
  agent: string;
  actionType: string;
  details?: Record<string, unknown>;
  taskId?: Id<"tasks">;
  _creationTime: number;
}

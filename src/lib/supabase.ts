import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Singleton instance for client-side use
export const supabase = (() => {
  if (typeof window === 'undefined') {
    // SSR: return a lazy proxy that will be replaced on client
    return null as unknown as SupabaseClient;
  }
  return getSupabase();
})();

// Types
export interface Agent {
  id: string;
  name: string;
  status: 'online' | 'busy' | 'offline';
  current_task_id: string | null;
  last_heartbeat: string | null;
  config: {
    role: string;
    emoji: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: string;
  assigned_to: string | null;
  project: string | null;
  tags: string[] | null;
  parent_task_id: string | null;
  mentions: string[] | null;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  created_at: string;
}

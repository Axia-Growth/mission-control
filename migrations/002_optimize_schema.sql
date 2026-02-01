-- Mission Control Schema Optimization
-- Run in Supabase SQL Editor

-- ============================================
-- 1. NEW TABLES
-- ============================================

-- Activity logs (real-time feed of all agent actions)
CREATE TABLE IF NOT EXISTS mc_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'task_created', 'task_updated', 'task_completed', 'comment_added', 'heartbeat', 'error'
  details JSONB DEFAULT '{}',
  task_id UUID REFERENCES mc_tasks(id) ON DELETE SET NULL,
  axia_record_type TEXT, -- 'client', 'campaign', 'lead', null
  axia_record_id UUID,
  session_id TEXT
);

-- Cost tracking (per agent turn)
CREATE TABLE IF NOT EXISTS mc_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
  task_id UUID REFERENCES mc_tasks(id) ON DELETE SET NULL,
  session_id TEXT,
  turn_type TEXT -- 'chat', 'tool', 'heartbeat', 'spawn'
);

-- Task status history (audit trail)
CREATE TABLE IF NOT EXISTS mc_task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES mc_tasks(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. ENHANCE EXISTING TABLES
-- ============================================

-- mc_agents: Add health tracking and Discord integration
ALTER TABLE mc_agents 
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'error')),
  ADD COLUMN IF NOT EXISTS tokens_today INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_today DECIMAL(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT;

-- mc_tasks: Add Axia linking and time tracking
ALTER TABLE mc_tasks 
  ADD COLUMN IF NOT EXISTS axia_client_id UUID,
  ADD COLUMN IF NOT EXISTS axia_campaign_id UUID,
  ADD COLUMN IF NOT EXISTS time_estimate_hours DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS assignee TEXT; -- alias for assigned_to for dashboard compatibility

-- Sync assignee with assigned_to
UPDATE mc_tasks SET assignee = assigned_to WHERE assignee IS NULL AND assigned_to IS NOT NULL;

-- ============================================
-- 3. INDEXES (Performance)
-- ============================================

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_mc_tasks_status ON mc_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mc_tasks_assignee ON mc_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_mc_tasks_due ON mc_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_mc_tasks_priority ON mc_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_mc_tasks_created ON mc_tasks(created_at DESC);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_mc_activity_timestamp ON mc_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mc_activity_agent ON mc_activity_logs(agent);
CREATE INDEX IF NOT EXISTS idx_mc_activity_task ON mc_activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_mc_activity_type ON mc_activity_logs(action_type);

-- Costs indexes
CREATE INDEX IF NOT EXISTS idx_mc_costs_agent ON mc_costs(agent);
CREATE INDEX IF NOT EXISTS idx_mc_costs_timestamp ON mc_costs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mc_costs_date ON mc_costs(DATE(timestamp));

-- Task history index
CREATE INDEX IF NOT EXISTS idx_mc_task_history_task ON mc_task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_mc_task_history_time ON mc_task_history(changed_at DESC);

-- Agents index
CREATE INDEX IF NOT EXISTS idx_mc_agents_status ON mc_agents(status);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE mc_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_task_history ENABLE ROW LEVEL SECURITY;

-- Activity logs: Anyone can read, service role can write
CREATE POLICY "mc_activity_logs_read" ON mc_activity_logs FOR SELECT USING (true);
CREATE POLICY "mc_activity_logs_insert" ON mc_activity_logs FOR INSERT WITH CHECK (true);

-- Costs: Anyone can read, service role can write
CREATE POLICY "mc_costs_read" ON mc_costs FOR SELECT USING (true);
CREATE POLICY "mc_costs_insert" ON mc_costs FOR INSERT WITH CHECK (true);

-- Task history: Anyone can read, service role can write
CREATE POLICY "mc_task_history_read" ON mc_task_history FOR SELECT USING (true);
CREATE POLICY "mc_task_history_insert" ON mc_task_history FOR INSERT WITH CHECK (true);

-- ============================================
-- 5. ENABLE REALTIME
-- ============================================

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE mc_activity_logs;
-- Note: mc_tasks, mc_agents should already be in realtime

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to log task changes automatically
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO mc_task_history (task_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, COALESCE(NEW.assigned_to, 'system'), 'status', OLD.status, NEW.status);
    
    -- Also log to activity
    INSERT INTO mc_activity_logs (agent, action_type, task_id, details)
    VALUES (
      COALESCE(NEW.assigned_to, 'system'),
      CASE NEW.status 
        WHEN 'done' THEN 'task_completed'
        WHEN 'in-progress' THEN 'task_started'
        ELSE 'task_updated'
      END,
      NEW.id,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'title', NEW.title)
    );
  END IF;
  
  -- Log assignee changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO mc_task_history (task_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, COALESCE(NEW.assigned_to, 'system'), 'assigned_to', OLD.assigned_to, NEW.assigned_to);
  END IF;
  
  -- Log priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO mc_task_history (task_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, COALESCE(NEW.assigned_to, 'system'), 'priority', OLD.priority, NEW.priority);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tasks
DROP TRIGGER IF EXISTS task_change_logger ON mc_tasks;
CREATE TRIGGER task_change_logger
  AFTER UPDATE ON mc_tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_changes();

-- Function to reset daily agent costs (run via cron)
CREATE OR REPLACE FUNCTION reset_daily_agent_costs()
RETURNS void AS $$
BEGIN
  UPDATE mc_agents SET tokens_today = 0, cost_today = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. VIEWS FOR DASHBOARD
-- ============================================

-- Daily cost summary view
CREATE OR REPLACE VIEW mc_daily_costs AS
SELECT 
  DATE(timestamp) as date,
  agent,
  model,
  SUM(tokens_in) as total_tokens_in,
  SUM(tokens_out) as total_tokens_out,
  SUM(estimated_cost) as total_cost,
  COUNT(*) as turn_count
FROM mc_costs
GROUP BY DATE(timestamp), agent, model
ORDER BY date DESC, agent;

-- Agent workload view
CREATE OR REPLACE VIEW mc_agent_workload AS
SELECT 
  a.name as agent,
  a.status,
  a.health_status,
  a.last_heartbeat,
  a.cost_today,
  COUNT(t.id) FILTER (WHERE t.status != 'done') as active_tasks,
  COUNT(t.id) FILTER (WHERE t.priority IN ('urgent', 'high') AND t.status != 'done') as high_priority_tasks
FROM mc_agents a
LEFT JOIN mc_tasks t ON t.assigned_to = a.name
GROUP BY a.id, a.name, a.status, a.health_status, a.last_heartbeat, a.cost_today;

-- ============================================
-- 8. SEED DATA UPDATES
-- ============================================

-- Update agent roles
UPDATE mc_agents SET role = 'Chief of Staff' WHERE name = 'nash';
UPDATE mc_agents SET role = 'CTO / Developer' WHERE name = 'dev';
UPDATE mc_agents SET role = 'COO / Operations' WHERE name = 'otto';
UPDATE mc_agents SET role = 'Founder' WHERE name = 'mike';

-- Set health status
UPDATE mc_agents SET health_status = 'healthy' WHERE status = 'online';
UPDATE mc_agents SET health_status = 'healthy' WHERE status = 'idle';
UPDATE mc_agents SET health_status = 'degraded' WHERE status = 'offline';

SELECT 'Schema optimization complete!' as result;

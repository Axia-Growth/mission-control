'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp, Zap, AlertTriangle } from 'lucide-react';

interface DailyCost {
  date: string;
  agent: string;
  model: string;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost: number;
  turn_count: number;
}

interface AgentCostSummary {
  agent: string;
  cost: number;
  tokens: number;
  turns: number;
}

export function CostTracker() {
  const [todayCosts, setTodayCosts] = useState<AgentCostSummary[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCosts();
    
    // Refresh every minute
    const interval = setInterval(fetchCosts, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchCosts() {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('mc_daily_costs')
      .select('*')
      .eq('date', today);

    if (error) {
      // View might not exist yet, try direct query
      const { data: rawData } = await supabase
        .from('mc_costs')
        .select('agent, estimated_cost, tokens_in, tokens_out')
        .gte('timestamp', `${today}T00:00:00`);
      
      if (rawData) {
        const byAgent: Record<string, AgentCostSummary> = {};
        rawData.forEach((row) => {
          if (!byAgent[row.agent]) {
            byAgent[row.agent] = { agent: row.agent, cost: 0, tokens: 0, turns: 0 };
          }
          byAgent[row.agent].cost += Number(row.estimated_cost);
          byAgent[row.agent].tokens += row.tokens_in + row.tokens_out;
          byAgent[row.agent].turns += 1;
        });
        const summaries = Object.values(byAgent).sort((a, b) => b.cost - a.cost);
        setTodayCosts(summaries);
        setTotalToday(summaries.reduce((sum, s) => sum + s.cost, 0));
      }
    } else if (data) {
      // Aggregate by agent from view
      const byAgent: Record<string, AgentCostSummary> = {};
      data.forEach((row: DailyCost) => {
        if (!byAgent[row.agent]) {
          byAgent[row.agent] = { agent: row.agent, cost: 0, tokens: 0, turns: 0 };
        }
        byAgent[row.agent].cost += Number(row.total_cost);
        byAgent[row.agent].tokens += row.total_tokens_in + row.total_tokens_out;
        byAgent[row.agent].turns += row.turn_count;
      });
      const summaries = Object.values(byAgent).sort((a, b) => b.cost - a.cost);
      setTodayCosts(summaries);
      setTotalToday(summaries.reduce((sum, s) => sum + s.cost, 0));
    }
    
    setLoading(false);
  }

  const alertThreshold = Math.floor(totalToday / 10) * 10 + 10; // Next $10 increment

  if (loading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-12 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Cost Tracker</h3>
        <span className="text-xs text-gray-500">Today</span>
      </div>
      
      <div className="p-4">
        {/* Total */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ${totalToday.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">
              Alert at ${alertThreshold}
            </p>
          </div>
        </div>

        {/* By Agent */}
        {todayCosts.length > 0 ? (
          <div className="space-y-2">
            {todayCosts.map((summary) => (
              <div key={summary.agent} className="flex items-center justify-between py-2 border-t">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium capitalize">{summary.agent}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${summary.cost.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    {summary.turns} turns • {(summary.tokens / 1000).toFixed(1)}k tokens
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500">
            No usage recorded today
          </div>
        )}

        {/* Alert threshold indicator */}
        {totalToday > 0 && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp className="h-3 w-3" />
              <span>
                ${(alertThreshold - totalToday).toFixed(2)} until next alert
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min((totalToday / alertThreshold) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get recent costs
export const recent = query({
  args: { 
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("costs")
      .order("desc")
      .take(args.limit || 100);
  },
});

// Get costs by agent
export const byAgent = query({
  args: { 
    agent: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("costs")
      .withIndex("by_agent", (q) => q.eq("agent", args.agent))
      .order("desc")
      .take(args.limit || 100);
  },
});

// Get daily summary
export const dailySummary = query({
  handler: async (ctx) => {
    const now = Date.now();
    const startOfDay = new Date(now).setHours(0, 0, 0, 0);
    
    const costs = await ctx.db.query("costs").collect();
    const todayCosts = costs.filter((c) => c._creationTime >= startOfDay);
    
    // Group by agent
    const byAgent: Record<string, { tokensIn: number; tokensOut: number; cost: number; turns: number }> = {};
    
    for (const cost of todayCosts) {
      if (!byAgent[cost.agent]) {
        byAgent[cost.agent] = { tokensIn: 0, tokensOut: 0, cost: 0, turns: 0 };
      }
      byAgent[cost.agent].tokensIn += cost.tokensIn;
      byAgent[cost.agent].tokensOut += cost.tokensOut;
      byAgent[cost.agent].cost += cost.estimatedCost;
      byAgent[cost.agent].turns += 1;
    }
    
    const totalCost = todayCosts.reduce((sum, c) => sum + c.estimatedCost, 0);
    
    return { byAgent, totalCost, turnCount: todayCosts.length };
  },
});

// Record a cost entry
export const record = mutation({
  args: {
    agent: v.string(),
    model: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    estimatedCost: v.number(),
    taskId: v.optional(v.id("tasks")),
    sessionId: v.optional(v.string()),
    turnType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("costs", {
      agent: args.agent,
      model: args.model,
      tokensIn: args.tokensIn,
      tokensOut: args.tokensOut,
      estimatedCost: args.estimatedCost,
      taskId: args.taskId,
      sessionId: args.sessionId,
      turnType: args.turnType,
    });
  },
});

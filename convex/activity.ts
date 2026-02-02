import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get recent activity logs
export const recent = query({
  args: { 
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const logs = await ctx.db
      .query("activityLogs")
      .order("desc")
      .take(limit);
    return logs;
  },
});

// Get activity by agent
export const byAgent = query({
  args: { 
    agent: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_agent", (q) => q.eq("agent", args.agent))
      .order("desc")
      .take(args.limit || 50);
    return logs;
  },
});

// Log an activity
export const log = mutation({
  args: {
    agent: v.string(),
    actionType: v.string(),
    taskId: v.optional(v.id("tasks")),
    details: v.optional(v.any()),
    axiaRecordType: v.optional(v.string()),
    axiaRecordId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityLogs", {
      agent: args.agent,
      actionType: args.actionType,
      taskId: args.taskId,
      details: args.details,
      axiaRecordType: args.axiaRecordType,
      axiaRecordId: args.axiaRecordId,
      sessionId: args.sessionId,
    });
  },
});

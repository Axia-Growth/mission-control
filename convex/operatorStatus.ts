import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const statuses = await ctx.db.query("operatorStatus").collect();
    return statuses[0] || null;
  },
});

export const update = mutation({
  args: {
    ampFreeRemaining: v.number(),
    ampFreeTotal: v.number(),
    ampWorkspaceBalance: v.number(),
    ralphLoopRunning: v.boolean(),
    ralphLoopCurrentTask: v.optional(v.number()),
    ralphLoopTotalTasks: v.optional(v.number()),
    ralphLoopProject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("operatorStatus").first();
    
    const data = {
      ...args,
      lastUpdated: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("operatorStatus", data);
    }
  },
});

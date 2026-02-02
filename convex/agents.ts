import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all agents
export const list = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    return agents.sort((a, b) => a._creationTime - b._creationTime);
  },
});

// Get agent by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// Get a single agent by ID
export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create or update agent
export const upsert = mutation({
  args: {
    name: v.string(),
    status: v.optional(v.union(v.literal("online"), v.literal("busy"), v.literal("offline"))),
    config: v.optional(v.object({
      role: v.string(),
      emoji: v.string(),
    })),
    healthStatus: v.optional(v.union(v.literal("healthy"), v.literal("degraded"), v.literal("error"))),
    discordUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      const updates: any = {};
      if (args.status) updates.status = args.status;
      if (args.config) updates.config = args.config;
      if (args.healthStatus) updates.healthStatus = args.healthStatus;
      if (args.discordUserId) updates.discordUserId = args.discordUserId;
      
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      return await ctx.db.insert("agents", {
        name: args.name,
        status: args.status || "offline",
        config: args.config || { role: "Agent", emoji: "🤖" },
        healthStatus: args.healthStatus || "healthy",
        discordUserId: args.discordUserId,
      });
    }
  },
});

// Update agent status
export const updateStatus = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(v.literal("online"), v.literal("busy"), v.literal("offline")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      status: args.status,
      healthStatus: args.status === "offline" ? "degraded" : "healthy",
    });
    return args.id;
  },
});

// Record heartbeat
export const heartbeat = mutation({
  args: {
    name: v.string(),
    status: v.optional(v.union(v.literal("online"), v.literal("busy"), v.literal("offline"))),
    currentTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!agent) {
      throw new Error(`Agent ${args.name} not found`);
    }

    await ctx.db.patch(agent._id, {
      lastHeartbeat: Date.now(),
      status: args.status || "online",
      currentTaskId: args.currentTaskId,
      healthStatus: "healthy",
    });

    return agent._id;
  },
});

// Update agent costs
export const updateCosts = mutation({
  args: {
    name: v.string(),
    tokensToday: v.number(),
    costToday: v.number(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!agent) throw new Error(`Agent ${args.name} not found`);

    await ctx.db.patch(agent._id, {
      tokensToday: args.tokensToday,
      costToday: args.costToday,
    });

    return agent._id;
  },
});

// Reset daily costs for all agents
export const resetDailyCosts = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    for (const agent of agents) {
      await ctx.db.patch(agent._id, {
        tokensToday: 0,
        costToday: 0,
      });
    }
  },
});

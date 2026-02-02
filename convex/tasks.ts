import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all tasks (excluding cancelled, sorted by priority/created)
export const list = query({
  args: {
    includeCancelled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let tasks = await ctx.db.query("tasks").collect();
    
    if (!args.includeCancelled) {
      tasks = tasks.filter((t) => t.status !== "cancelled");
    }
    
    // Sort by priority (urgent > high > normal > low), then by creation time
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    tasks.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b._creationTime - a._creationTime;
    });
    
    return tasks;
  },
});

// Get tasks by status
export const byStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status as any))
      .collect();
  },
});

// Get tasks assigned to a specific agent
export const byAssignee = query({
  args: { assignee: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assignedTo", args.assignee))
      .collect();
  },
});

// Get a single task by ID
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new task
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"))),
    createdBy: v.string(),
    assignedTo: v.optional(v.string()),
    project: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    mentions: v.optional(v.array(v.string())),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: "pending",
      priority: args.priority || "normal",
      createdBy: args.createdBy,
      assignedTo: args.assignedTo,
      project: args.project,
      tags: args.tags,
      mentions: args.mentions,
      dueAt: args.dueAt,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      agent: args.createdBy,
      actionType: "task_created",
      taskId,
      details: { title: args.title },
    });

    return taskId;
  },
});

// Update task status
export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("review"),
      v.literal("done"),
      v.literal("cancelled")
    ),
    changedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const updates: any = { status: args.status };
    
    if (args.status === "in_progress" && !task.startedAt) {
      updates.startedAt = Date.now();
    }
    if (args.status === "done" && !task.completedAt) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.id, updates);

    // Log history
    await ctx.db.insert("taskHistory", {
      taskId: args.id,
      changedBy: args.changedBy || task.assignedTo || "system",
      fieldChanged: "status",
      oldValue: task.status,
      newValue: args.status,
    });

    // Log activity
    const actionType = args.status === "done" ? "task_completed" 
      : args.status === "in_progress" ? "task_started" 
      : "task_updated";
    
    await ctx.db.insert("activityLogs", {
      agent: args.changedBy || task.assignedTo || "system",
      actionType,
      taskId: args.id,
      details: { 
        title: task.title,
        oldStatus: task.status,
        newStatus: args.status,
      },
    });

    return args.id;
  },
});

// Update task assignment
export const assign = mutation({
  args: {
    id: v.id("tasks"),
    assignedTo: v.optional(v.string()),
    changedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.id, { assignedTo: args.assignedTo });

    // Log history
    await ctx.db.insert("taskHistory", {
      taskId: args.id,
      changedBy: args.changedBy || "system",
      fieldChanged: "assigned_to",
      oldValue: task.assignedTo,
      newValue: args.assignedTo,
    });

    return args.id;
  },
});

// Update task (general)
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"))),
    assignedTo: v.optional(v.string()),
    project: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    dueAt: v.optional(v.number()),
    changedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, changedBy, ...updates } = args;
    const task = await ctx.db.get(id);
    if (!task) throw new Error("Task not found");

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }

    return id;
  },
});

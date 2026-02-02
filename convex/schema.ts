import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agents table
  agents: defineTable({
    name: v.string(),
    status: v.union(v.literal("online"), v.literal("busy"), v.literal("offline")),
    currentTaskId: v.optional(v.id("tasks")),
    lastHeartbeat: v.optional(v.number()),
    config: v.object({
      role: v.string(),
      emoji: v.string(),
    }),
    healthStatus: v.optional(v.union(v.literal("healthy"), v.literal("degraded"), v.literal("error"))),
    tokensToday: v.optional(v.number()),
    costToday: v.optional(v.number()),
    discordUserId: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_status", ["status"]),

  // Tasks table
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("review"),
      v.literal("done"),
      v.literal("cancelled")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent")
    ),
    createdBy: v.string(),
    assignedTo: v.optional(v.string()),
    project: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    parentTaskId: v.optional(v.id("tasks")),
    mentions: v.optional(v.array(v.string())),
    dueAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assignedTo"])
    .index("by_priority", ["priority"])
    .index("by_project", ["project"]),

  // Task comments
  taskComments: defineTable({
    taskId: v.id("tasks"),
    author: v.string(),
    content: v.string(),
  }).index("by_task", ["taskId"]),

  // Activity logs
  activityLogs: defineTable({
    agent: v.string(),
    actionType: v.string(),
    details: v.optional(v.any()),
    taskId: v.optional(v.id("tasks")),
    axiaRecordType: v.optional(v.string()),
    axiaRecordId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  }).index("by_agent", ["agent"]),

  // Cost tracking
  costs: defineTable({
    agent: v.string(),
    model: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    estimatedCost: v.number(),
    taskId: v.optional(v.id("tasks")),
    sessionId: v.optional(v.string()),
    turnType: v.optional(v.string()),
  })
    .index("by_agent", ["agent"]),

  // Task history (audit trail)
  taskHistory: defineTable({
    taskId: v.id("tasks"),
    changedBy: v.string(),
    fieldChanged: v.string(),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
  }).index("by_task", ["taskId"]),
});

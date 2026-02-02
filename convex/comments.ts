import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get comments for a task
export const byTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    return comments.sort((a, b) => a._creationTime - b._creationTime);
  },
});

// Add a comment
export const add = mutation({
  args: {
    taskId: v.id("tasks"),
    author: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const commentId = await ctx.db.insert("taskComments", {
      taskId: args.taskId,
      author: args.author,
      content: args.content,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      agent: args.author,
      actionType: "comment_added",
      taskId: args.taskId,
      details: { title: task.title },
    });

    return commentId;
  },
});

// Delete a comment
export const remove = mutation({
  args: { id: v.id("taskComments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

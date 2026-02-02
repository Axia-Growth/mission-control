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

// Add a comment (supports markdown and attachments)
export const add = mutation({
  args: {
    taskId: v.id("tasks"),
    author: v.string(),
    content: v.string(),
    contentType: v.optional(v.union(v.literal("text"), v.literal("markdown"))),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      filename: v.string(),
      mimeType: v.string(),
      size: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const commentId = await ctx.db.insert("taskComments", {
      taskId: args.taskId,
      author: args.author,
      content: args.content,
      contentType: args.contentType || "text",
      attachments: args.attachments,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      agent: args.author,
      actionType: args.attachments?.length ? "comment_with_attachment" : "comment_added",
      taskId: args.taskId,
      details: { 
        title: task.title,
        hasAttachments: !!args.attachments?.length,
        attachmentCount: args.attachments?.length || 0,
      },
    });

    return commentId;
  },
});

// Delete a comment
export const remove = mutation({
  args: { id: v.id("taskComments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (comment?.attachments) {
      // Delete associated files from storage
      for (const attachment of comment.attachments) {
        await ctx.storage.delete(attachment.storageId);
      }
    }
    await ctx.db.delete(args.id);
  },
});

// Update a comment
export const update = mutation({
  args: {
    id: v.id("taskComments"),
    content: v.optional(v.string()),
    contentType: v.optional(v.union(v.literal("text"), v.literal("markdown"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const comment = await ctx.db.get(id);
    if (!comment) throw new Error("Comment not found");

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }

    return id;
  },
});

// Generate upload URL for attachments
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get download URL for an attachment
export const getAttachmentUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

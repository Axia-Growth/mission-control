import { mutation } from "./_generated/server";

// Seed initial agents
export const seedAgents = mutation({
  handler: async (ctx) => {
    const agents = [
      { name: "mike", config: { role: "Founder", emoji: "👤" }, status: "online" as const },
      { name: "nash", config: { role: "Chief of Staff", emoji: "♟️" }, status: "online" as const },
      { name: "dev", config: { role: "CTO / Developer", emoji: "⚡" }, status: "offline" as const },
      { name: "otto", config: { role: "COO / Operations", emoji: "📋" }, status: "offline" as const },
    ];

    for (const agent of agents) {
      const existing = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", agent.name))
        .first();

      if (!existing) {
        await ctx.db.insert("agents", {
          ...agent,
          healthStatus: "healthy",
        });
      }
    }

    return "Seeded agents";
  },
});

// Seed a sample task
export const seedTask = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("tasks").first();
    if (existing) return "Tasks already exist";

    await ctx.db.insert("tasks", {
      title: "Cal.com API Integration",
      description: "Integrate Cal.com API to automatically create team + invite link for new clients during onboarding",
      status: "pending",
      priority: "high",
      createdBy: "nash",
      assignedTo: "dev",
      project: "Axia OS",
      tags: ["integration", "api", "onboarding"],
    });

    return "Seeded sample task";
  },
});

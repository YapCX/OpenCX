import { mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

export const initializeSystem = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    // Initialize default settings
    const defaultSettings = [
      {
        key: "base_currency",
        value: "USD",
        description: "Base currency for exchange rate calculations",
        category: "currency",
      },
      {
        key: "default_discount_percent",
        value: 2.5,
        description: "Default discount percentage for buying currency",
        category: "currency",
      },
      {
        key: "default_markup_percent",
        value: 3.5,
        description: "Default markup percentage for selling currency",
        category: "currency",
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .first();

      if (!existing) {
        await ctx.db.insert("settings", {
          ...setting,
          lastUpdated: Date.now(),
          updatedBy: userId,
        });
      }
    }

    console.log("System initialized with default settings");
  },
});
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { DEFAULT_BASE_CURRENCY } from "./settings";

export const initializeBaseCurrency = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if base currency setting already exists
    const existingSetting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "baseCurrency"))
      .first();

    if (!existingSetting) {
      // Initialize with default base currency
      await ctx.db.insert("settings", {
        key: "baseCurrency",
        value: DEFAULT_BASE_CURRENCY,
        description: "Base currency for the system",
        category: "currency",
        lastUpdated: Date.now(),
        updatedBy: userId as any,
      });
      
      return `Base currency initialized to ${DEFAULT_BASE_CURRENCY}`;
    }
    
    return `Base currency already set to ${existingSetting.value}`;
  },
});
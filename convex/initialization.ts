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
      {
        key: "default_service_fee",
        value: 1.5,
        description: "Default service fee percentage for transactions",
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

    // Initialize default ID types
    const defaultIdTypes = [
      {
        name: "Driver's License",
        description: "Provincial driver's license",
        requiresExpiry: true,
        country: "CA",
      },
      {
        name: "Passport",
        description: "Government issued passport",
        requiresExpiry: true,
        country: undefined,
      },
      {
        name: "Provincial ID",
        description: "Provincial identification card",
        requiresExpiry: true,
        country: "CA",
      },
      {
        name: "Health Card",
        description: "Provincial health insurance card",
        requiresExpiry: false,
        country: "CA",
      },
      {
        name: "Birth Certificate",
        description: "Certificate of birth",
        requiresExpiry: false,
        country: "CA",
      },
      {
        name: "Social Insurance Number",
        description: "SIN card or document",
        requiresExpiry: false,
        country: "CA",
      },
    ];

    for (const idType of defaultIdTypes) {
      const existing = await ctx.db
        .query("idTypes")
        .withIndex("by_name", (q) => q.eq("name", idType.name))
        .first();

      if (!existing) {
        await ctx.db.insert("idTypes", {
          ...idType,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    console.log("System initialized with default settings and ID types");
  },
});
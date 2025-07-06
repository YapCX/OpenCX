import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

export const list = query({
  args: {
    country: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let result;

    if (args.country !== undefined) {
      const country = args.country;
      result = await ctx.db
        .query("idTypes")
        .withIndex("by_country", (q) => q.eq("country", country))
        .order("asc")
        .collect();
    } else if (args.activeOnly === true) {
      result = await ctx.db
        .query("idTypes")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .order("asc")
        .collect();
    } else {
      result = await ctx.db
        .query("idTypes")
        .order("asc")
        .collect();
    }

    return result;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    requiresExpiry: v.boolean(),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();

    const idType = {
      name: args.name,
      description: args.description,
      isActive: true,
      requiresExpiry: args.requiresExpiry,
      country: args.country,
      createdAt: now,
      updatedAt: now,
    };

    const id = await ctx.db.insert("idTypes", idType);
    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id("idTypes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    requiresExpiry: v.optional(v.boolean()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("idTypes") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    // Return common ID types if none exist
    const existingTypes = await ctx.db.query("idTypes").collect();

    if (existingTypes.length === 0) {
      return [
        { name: "Driver's License", requiresExpiry: true, country: "CA" },
        { name: "Passport", requiresExpiry: true, country: null },
        { name: "Provincial ID", requiresExpiry: true, country: "CA" },
        { name: "Health Card", requiresExpiry: false, country: "CA" },
        { name: "Social Insurance Number", requiresExpiry: false, country: "CA" },
        { name: "Birth Certificate", requiresExpiry: false, country: "CA" },
      ];
    }

    return existingTypes.filter(type => type.isActive);
  },
});
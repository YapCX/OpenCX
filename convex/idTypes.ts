import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    
    const idTypes = await ctx.db.query("idTypes").order("asc").collect();
    
    // Return default types if none exist
    if (idTypes.length === 0) {
      return [
        { _id: "default-1", name: "Driver's License", isActive: true },
        { _id: "default-2", name: "Passport", isActive: true },
        { _id: "default-3", name: "State ID", isActive: true },
        { _id: "default-4", name: "Military ID", isActive: true },
        { _id: "default-5", name: "Permanent Resident Card", isActive: true },
      ];
    }
    
    return idTypes.filter(type => type.isActive);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    return await ctx.db.insert("idTypes", {
      name: args.name,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("idTypes"),
    name: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const { id, ...updates } = args;
    
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("idTypes") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    return await ctx.db.delete(args.id);
  },
});

import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("branches")
      .order("asc")
      .collect()
  },
})

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("branches")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()
  },
})

export const getById = query({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    return await ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existing = await ctx.db
      .query("branches")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first()

    if (existing) {
      throw new Error(`Branch with code ${args.code} already exists`)
    }

    const now = Date.now()
    return await ctx.db.insert("branches", {
      name: args.name,
      code: args.code.toUpperCase(),
      address: args.address,
      phone: args.phone,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("branches"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const { id, ...updates } = args
    const branch = await ctx.db.get(id)
    if (!branch) throw new Error("Branch not found")

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )

    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branchId", args.id))
      .first()

    if (transactions) {
      throw new Error("Cannot delete branch with existing transactions")
    }

    await ctx.db.delete(args.id)
  },
})

export const seedDefaultBranch = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existing = await ctx.db.query("branches").first()
    if (existing) return { seeded: false, message: "Branch already exists", branchId: existing._id }

    const now = Date.now()
    const branchId = await ctx.db.insert("branches", {
      name: "Head Office",
      code: "HOF",
      address: "123 Main Street",
      phone: "+1 (555) 000-0000",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    return { seeded: true, message: "Seeded default branch", branchId }
  },
})

export const getDefaultBranch = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    return await ctx.db.query("branches").first()
  },
})

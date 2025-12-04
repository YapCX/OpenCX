import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {
    userId: v.optional(v.id("users")),
    entityType: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx)
    if (!authUserId) return []

    let entries = await ctx.db
      .query("auditLog")
      .withIndex("by_date")
      .order("desc")
      .collect()

    if (args.userId) {
      entries = entries.filter(e => e.userId === args.userId)
    }

    if (args.entityType) {
      entries = entries.filter(e => e.entityType === args.entityType)
    }

    if (args.startDate) {
      entries = entries.filter(e => e.createdAt >= args.startDate!)
    }

    if (args.endDate) {
      entries = entries.filter(e => e.createdAt <= args.endDate!)
    }

    const limitedEntries = entries.slice(0, args.limit || 100)

    const entriesWithUser = await Promise.all(
      limitedEntries.map(async (entry) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", q => q.eq("userId", entry.userId))
          .first()

        return {
          ...entry,
          userName: profile ? `${profile.firstName} ${profile.lastName}` : "Unknown User",
          userEmail: profile ? (await ctx.db.get(entry.userId))?.email : null,
        }
      })
    )

    return entriesWithUser
  },
})

export const log = mutation({
  args: {
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    return await ctx.db.insert("auditLog", {
      userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      details: args.details,
      createdAt: Date.now(),
    })
  },
})

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000

    const allEntries = await ctx.db.query("auditLog").collect()
    const todayEntries = allEntries.filter(e => e.createdAt >= dayAgo)
    const weekEntries = allEntries.filter(e => e.createdAt >= weekAgo)

    const actionCounts: Record<string, number> = {}
    for (const entry of allEntries) {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1
    }

    const uniqueUsers = new Set(allEntries.map(e => e.userId))

    return {
      totalEntries: allEntries.length,
      todayEntries: todayEntries.length,
      weekEntries: weekEntries.length,
      uniqueUsers: uniqueUsers.size,
      topActions: Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count })),
    }
  },
})

import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {
    status: v.optional(v.string()),
    severity: v.optional(v.string()),
    alertType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    let alerts = await ctx.db.query("complianceAlerts").order("desc").collect()

    // Apply filters
    if (args.status) {
      alerts = alerts.filter(a => a.status === args.status)
    }
    if (args.severity) {
      alerts = alerts.filter(a => a.severity === args.severity)
    }
    if (args.alertType) {
      alerts = alerts.filter(a => a.alertType === args.alertType)
    }

    // Limit results
    if (args.limit) {
      alerts = alerts.slice(0, args.limit)
    }

    // Enrich with customer and transaction data
    const customers = await ctx.db.query("customers").collect()
    const customerMap = new Map(customers.map(c => [c._id, c]))

    const transactions = await ctx.db.query("transactions").collect()
    const transactionMap = new Map(transactions.map(t => [t._id, t]))

    const users = await ctx.db.query("users").collect()
    const userMap = new Map(users.map(u => [u._id, u]))

    return alerts.map(alert => ({
      ...alert,
      customer: alert.customerId ? customerMap.get(alert.customerId) : undefined,
      transaction: alert.transactionId ? transactionMap.get(alert.transactionId) : undefined,
      reviewedByUser: alert.reviewedBy ? userMap.get(alert.reviewedBy) : undefined,
    }))
  },
})

export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db
      .query("complianceAlerts")
      .withIndex("by_status", q => q.eq("status", "pending"))
      .order("desc")
      .collect()
  },
})

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const alerts = await ctx.db.query("complianceAlerts").collect()

    const pending = alerts.filter(a => a.status === "pending").length
    const reviewed = alerts.filter(a => a.status === "reviewed").length
    const resolved = alerts.filter(a => a.status === "resolved").length
    const escalated = alerts.filter(a => a.status === "escalated").length

    const critical = alerts.filter(a => a.severity === "critical" && a.status === "pending").length
    const high = alerts.filter(a => a.severity === "high" && a.status === "pending").length
    const medium = alerts.filter(a => a.severity === "medium" && a.status === "pending").length
    const low = alerts.filter(a => a.severity === "low" && a.status === "pending").length

    const byType = {
      sanction_match: alerts.filter(a => a.alertType === "sanction_match").length,
      suspicious_activity: alerts.filter(a => a.alertType === "suspicious_activity").length,
      threshold_exceeded: alerts.filter(a => a.alertType === "threshold_exceeded").length,
    }

    return {
      total: alerts.length,
      byStatus: { pending, reviewed, resolved, escalated },
      bySeverity: { critical, high, medium, low },
      byType,
    }
  },
})

export const get = query({
  args: { id: v.id("complianceAlerts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const alert = await ctx.db.get(id)
    if (!alert) return null

    const customer = alert.customerId ? await ctx.db.get(alert.customerId) : undefined
    const transaction = alert.transactionId ? await ctx.db.get(alert.transactionId) : undefined
    const reviewedByUser = alert.reviewedBy ? await ctx.db.get(alert.reviewedBy) : undefined

    return {
      ...alert,
      customer,
      transaction,
      reviewedByUser,
    }
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id("complianceAlerts"),
    status: v.string(),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const alert = await ctx.db.get(args.id)
    if (!alert) throw new Error("Alert not found")

    const now = Date.now()

    await ctx.db.patch(args.id, {
      status: args.status,
      reviewedAt: now,
      reviewedBy: userId,
      resolutionNotes: args.resolutionNotes || alert.resolutionNotes,
    })

    return args.id
  },
})

export const create = mutation({
  args: {
    alertType: v.string(),
    severity: v.string(),
    customerId: v.optional(v.id("customers")),
    transactionId: v.optional(v.id("transactions")),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const now = Date.now()

    return await ctx.db.insert("complianceAlerts", {
      alertType: args.alertType,
      severity: args.severity,
      customerId: args.customerId,
      transactionId: args.transactionId,
      description: args.description,
      status: "pending",
      createdAt: now,
    })
  },
})

export const remove = mutation({
  args: { id: v.id("complianceAlerts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    await ctx.db.delete(id)
  },
})

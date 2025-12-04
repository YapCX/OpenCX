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
      aggregation_threshold: alerts.filter(a => a.alertType === "aggregation_threshold").length,
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

// Get transactions for CTR report (transactions over $10,000 threshold)
export const getCTRTransactions = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const CTR_THRESHOLD = 10000

    let transactions = await ctx.db.query("transactions").order("desc").collect()

    // Filter by date range
    if (args.dateFrom) {
      transactions = transactions.filter(t => t.createdAt >= args.dateFrom!)
    }
    if (args.dateTo) {
      transactions = transactions.filter(t => t.createdAt <= args.dateTo!)
    }

    // Filter by customer if specified
    if (args.customerId) {
      transactions = transactions.filter(t => t.customerId === args.customerId)
    }

    // Filter by threshold (transactions >= $10,000)
    transactions = transactions.filter(t => t.totalAmount >= CTR_THRESHOLD)

    // Enrich with customer data
    const customers = await ctx.db.query("customers").collect()
    const customerMap = new Map(customers.map(c => [c._id, c]))

    return transactions.map(t => ({
      ...t,
      customer: t.customerId ? customerMap.get(t.customerId) : undefined,
    }))
  },
})

// Generate CTR report data for a specific customer (aggregation in 24h window)
export const generateCTRReport = query({
  args: {
    customerId: v.id("customers"),
    dateFrom: v.number(),
    dateTo: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const customer = await ctx.db.get(args.customerId)
    if (!customer) throw new Error("Customer not found")

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_customer", q => q.eq("customerId", args.customerId))
      .collect()

    const filteredTransactions = transactions.filter(
      t => t.createdAt >= args.dateFrom && t.createdAt <= args.dateTo && t.status === "completed"
    )

    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.totalAmount, 0)
    const totalBuy = filteredTransactions.filter(t => t.transactionType === "buy").reduce((sum, t) => sum + t.totalAmount, 0)
    const totalSell = filteredTransactions.filter(t => t.transactionType === "sell").reduce((sum, t) => sum + t.totalAmount, 0)

    // Get branch info for first transaction
    let branch = null
    if (filteredTransactions.length > 0) {
      branch = await ctx.db.get(filteredTransactions[0].branchId)
    }

    return {
      reportType: "CTR",
      reportDate: Date.now(),
      reportingPeriod: {
        from: args.dateFrom,
        to: args.dateTo,
      },
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        dateOfBirth: customer.dateOfBirth,
        address: customer.address,
        idType: customer.idType,
        idNumber: customer.idNumber,
        nationality: customer.nationality,
        occupation: customer.occupation,
      },
      summary: {
        totalTransactions: filteredTransactions.length,
        totalAmount,
        totalBuy,
        totalSell,
        currenciesInvolved: [...new Set(filteredTransactions.flatMap(t => [t.sourceCurrency, t.targetCurrency]))],
      },
      transactions: filteredTransactions.map(t => ({
        transactionNumber: t.transactionNumber,
        transactionType: t.transactionType,
        sourceCurrency: t.sourceCurrency,
        targetCurrency: t.targetCurrency,
        sourceAmount: t.sourceAmount,
        targetAmount: t.targetAmount,
        exchangeRate: t.exchangeRate,
        totalAmount: t.totalAmount,
        date: t.createdAt,
      })),
      branch: branch ? {
        name: branch.name,
        code: branch.code,
        address: branch.address,
      } : null,
      filedBy: userId,
    }
  },
})

// Get flagged transactions for SAR report
export const getSARAlerts = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    let alerts = await ctx.db.query("complianceAlerts").order("desc").collect()

    // Filter for SAR-eligible alerts (suspicious activity, sanction matches, high-severity)
    alerts = alerts.filter(a =>
      a.alertType === "suspicious_activity" ||
      a.alertType === "sanction_match" ||
      (a.severity === "high" || a.severity === "critical")
    )

    // Filter by date range
    if (args.dateFrom) {
      alerts = alerts.filter(a => a.createdAt >= args.dateFrom!)
    }
    if (args.dateTo) {
      alerts = alerts.filter(a => a.createdAt <= args.dateTo!)
    }

    // Filter by status if specified
    if (args.status) {
      alerts = alerts.filter(a => a.status === args.status)
    }

    // Enrich with customer and transaction data
    const customers = await ctx.db.query("customers").collect()
    const customerMap = new Map(customers.map(c => [c._id, c]))

    const transactions = await ctx.db.query("transactions").collect()
    const transactionMap = new Map(transactions.map(t => [t._id, t]))

    return alerts.map(alert => ({
      ...alert,
      customer: alert.customerId ? customerMap.get(alert.customerId) : undefined,
      transaction: alert.transactionId ? transactionMap.get(alert.transactionId) : undefined,
    }))
  },
})

// Generate SAR report data for a specific alert
export const generateSARReport = query({
  args: {
    alertId: v.id("complianceAlerts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const alert = await ctx.db.get(args.alertId)
    if (!alert) throw new Error("Alert not found")

    const customer = alert.customerId ? await ctx.db.get(alert.customerId) : null
    const transaction = alert.transactionId ? await ctx.db.get(alert.transactionId) : null
    let branch = null
    if (transaction) {
      branch = await ctx.db.get(transaction.branchId)
    }

    // Get all transactions for this customer if available
    let relatedTransactions: typeof transaction[] = []
    if (alert.customerId) {
      relatedTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_customer", q => q.eq("customerId", alert.customerId!))
        .order("desc")
        .take(20)
    }

    // Get all alerts for this customer
    let relatedAlerts: typeof alert[] = []
    if (alert.customerId) {
      relatedAlerts = await ctx.db
        .query("complianceAlerts")
        .withIndex("by_customer", q => q.eq("customerId", alert.customerId!))
        .order("desc")
        .collect()
    }

    return {
      reportType: "SAR",
      reportDate: Date.now(),
      alert: {
        id: alert._id,
        type: alert.alertType,
        severity: alert.severity,
        description: alert.description,
        status: alert.status,
        createdAt: alert.createdAt,
        resolutionNotes: alert.resolutionNotes,
      },
      subject: customer ? {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        dateOfBirth: customer.dateOfBirth,
        address: customer.address,
        idType: customer.idType,
        idNumber: customer.idNumber,
        nationality: customer.nationality,
        occupation: customer.occupation,
        sourceOfFunds: customer.sourceOfFunds,
        isPEP: customer.isPEP,
        pepDetails: customer.pepDetails,
        isSuspicious: customer.isSuspicious,
        suspiciousReason: customer.suspiciousReason,
        sanctionScreeningStatus: customer.sanctionScreeningStatus,
      } : null,
      transaction: transaction ? {
        transactionNumber: transaction.transactionNumber,
        transactionType: transaction.transactionType,
        sourceCurrency: transaction.sourceCurrency,
        targetCurrency: transaction.targetCurrency,
        sourceAmount: transaction.sourceAmount,
        targetAmount: transaction.targetAmount,
        exchangeRate: transaction.exchangeRate,
        totalAmount: transaction.totalAmount,
        date: transaction.createdAt,
        status: transaction.status,
      } : null,
      relatedTransactions: relatedTransactions.map(t => ({
        transactionNumber: t!.transactionNumber,
        transactionType: t!.transactionType,
        totalAmount: t!.totalAmount,
        date: t!.createdAt,
      })),
      relatedAlerts: relatedAlerts.map(a => ({
        type: a.alertType,
        severity: a.severity,
        description: a.description,
        status: a.status,
        createdAt: a.createdAt,
      })),
      branch: branch ? {
        name: branch.name,
        code: branch.code,
        address: branch.address,
      } : null,
      filedBy: userId,
      narrative: `Suspicious activity detected: ${alert.description}`,
    }
  },
})

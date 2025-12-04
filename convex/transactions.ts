import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

const HIGH_VALUE_THRESHOLD = 3000 // Threshold for suspicious transaction detection in base currency (USD)
const AGGREGATION_THRESHOLD = 10000 // 24-hour aggregation threshold for CTR reporting
const AGGREGATION_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

function generateTransactionNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `TXN-${year}${month}${day}-${random}`
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Get user's profile to determine their branch
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    // If no profile or no branch, return empty (user not properly set up)
    if (!userProfile || !userProfile.branchId) return []

    const branchId = userProfile.branchId

    // Query transactions filtered by user's branch
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .collect()

    let filtered = transactions
    if (args.status) {
      filtered = filtered.filter((t) => t.status === args.status)
    }

    if (args.limit) {
      filtered = filtered.slice(0, args.limit)
    }

    return filtered
  },
})

export const getById = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    return await ctx.db.get(args.id)
  },
})

export const getByNumber = query({
  args: { transactionNumber: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    return await ctx.db
      .query("transactions")
      .withIndex("by_number", (q) => q.eq("transactionNumber", args.transactionNumber))
      .first()
  },
})

export const getByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .collect()
  },
})

export const getTodayStats = query({
  args: { branchId: v.optional(v.id("branches")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { count: 0, totalBuy: 0, totalSell: 0 }

    // Get user's profile to determine their branch
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    if (!userProfile || !userProfile.branchId) return { count: 0, totalBuy: 0, totalSell: 0 }

    // Use provided branchId if given (and matches user's branch for security), otherwise use user's branch
    const branchId = args.branchId === userProfile.branchId ? args.branchId : userProfile.branchId

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startTimestamp = startOfDay.getTime()

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .collect()

    const todayTransactions = transactions.filter(
      (t) =>
        t.createdAt >= startTimestamp &&
        t.status === "completed"
    )

    const totalBuy = todayTransactions
      .filter((t) => t.transactionType === "buy")
      .reduce((sum, t) => sum + t.totalAmount, 0)

    const totalSell = todayTransactions
      .filter((t) => t.transactionType === "sell")
      .reduce((sum, t) => sum + t.totalAmount, 0)

    return {
      count: todayTransactions.length,
      totalBuy,
      totalSell,
    }
  },
})

export const create = mutation({
  args: {
    transactionType: v.string(),
    branchId: v.id("branches"),
    customerId: v.optional(v.id("customers")),
    sourceCurrency: v.string(),
    targetCurrency: v.string(),
    sourceAmount: v.number(),
    targetAmount: v.number(),
    exchangeRate: v.number(),
    commission: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    if (!["buy", "sell"].includes(args.transactionType)) {
      throw new Error("Transaction type must be 'buy' or 'sell'")
    }

    if (args.sourceAmount <= 0) {
      throw new Error("Source amount must be positive")
    }

    const now = Date.now()

    // Check for sanction screening if customer is provided
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId)
      if (customer) {
        // Block transaction if customer is sanctioned and NOT whitelisted
        if (customer.sanctionScreeningStatus === "flagged" && !customer.isWhitelisted) {
          throw new Error("SANCTION_BLOCKED: Transaction blocked - Customer is on sanction list. Please contact compliance.")
        }

        // Block if customer is marked as suspicious and not reviewed
        if (customer.isSuspicious) {
          throw new Error("SUSPICIOUS_BLOCKED: Transaction blocked - Customer is flagged as suspicious. Please contact compliance.")
        }
      }
    }

    const totalAmount = args.targetAmount + (args.commission || 0)
    const transactionNumber = generateTransactionNumber()

    // Determine USD equivalent for threshold checks
    // For simplicity, use totalAmount for USD transactions, otherwise estimate
    const usdEquivalent = args.sourceCurrency === "USD" ? args.sourceAmount :
                          args.targetCurrency === "USD" ? args.targetAmount :
                          totalAmount

    const transactionId = await ctx.db.insert("transactions", {
      transactionNumber,
      transactionType: args.transactionType,
      customerId: args.customerId,
      branchId: args.branchId,
      sourceCurrency: args.sourceCurrency,
      targetCurrency: args.targetCurrency,
      sourceAmount: args.sourceAmount,
      targetAmount: args.targetAmount,
      exchangeRate: args.exchangeRate,
      commission: args.commission,
      totalAmount,
      status: "completed",
      notes: args.notes,
      createdAt: now,
      createdBy: userId,
    })

    // Create compliance alerts for high-value transactions
    if (usdEquivalent >= HIGH_VALUE_THRESHOLD) {
      await ctx.db.insert("complianceAlerts", {
        alertType: "threshold_exceeded",
        severity: usdEquivalent >= AGGREGATION_THRESHOLD ? "high" : "medium",
        customerId: args.customerId,
        transactionId,
        description: `High-value transaction detected: ${args.transactionType.toUpperCase()} ${args.sourceAmount} ${args.sourceCurrency} -> ${args.targetAmount} ${args.targetCurrency} (Estimated USD: $${usdEquivalent.toFixed(2)})`,
        status: "pending",
        createdAt: now,
      })
    }

    // Check 24-hour aggregation rule for the customer
    if (args.customerId) {
      const windowStart = now - AGGREGATION_WINDOW_MS

      // Get all customer transactions in the last 24 hours
      const recentTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
        .collect()

      const transactionsInWindow = recentTransactions.filter(
        (t) => t.createdAt >= windowStart && t.status === "completed"
      )

      // Calculate total USD equivalent in window
      // Use sourceAmount for USD transactions, otherwise use a simple estimate
      const totalInWindow = transactionsInWindow.reduce((sum, t) => {
        const txUsdEquivalent = t.sourceCurrency === "USD" ? t.sourceAmount :
                                t.targetCurrency === "USD" ? t.targetAmount :
                                t.totalAmount
        return sum + txUsdEquivalent
      }, 0)

      // If total exceeds aggregation threshold, create alert
      if (totalInWindow >= AGGREGATION_THRESHOLD) {
        // Check if we already have a recent aggregation alert for this customer
        const existingAggregationAlert = await ctx.db
          .query("complianceAlerts")
          .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
          .filter((q) => q.and(
            q.eq(q.field("alertType"), "aggregation_threshold"),
            q.gte(q.field("createdAt"), windowStart)
          ))
          .first()

        if (!existingAggregationAlert) {
          const customer = await ctx.db.get(args.customerId)
          await ctx.db.insert("complianceAlerts", {
            alertType: "aggregation_threshold",
            severity: "high",
            customerId: args.customerId,
            transactionId,
            description: `24-hour aggregation threshold exceeded for customer "${customer?.firstName} ${customer?.lastName}": Total transactions = $${totalInWindow.toFixed(2)} (${transactionsInWindow.length} transactions in 24 hours). CTR may be required.`,
            status: "pending",
            createdAt: now,
          })
        }
      }
    }

    // Log audit entry
    await ctx.db.insert("auditLog", {
      userId,
      action: "transaction_created",
      entityType: "transaction",
      entityId: transactionId,
      details: `Created ${args.transactionType.toUpperCase()} transaction ${transactionNumber}: ${args.sourceAmount} ${args.sourceCurrency} -> ${args.targetAmount} ${args.targetCurrency}`,
      createdAt: now,
    })

    return { transactionId, transactionNumber }
  },
})

export const voidTransaction = mutation({
  args: {
    id: v.id("transactions"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const transaction = await ctx.db.get(args.id)
    if (!transaction) throw new Error("Transaction not found")

    if (transaction.status === "voided") {
      throw new Error("Transaction is already voided")
    }

    const now = Date.now()

    await ctx.db.patch(args.id, {
      status: "voided",
      voidReason: args.reason,
      voidedAt: now,
      voidedBy: userId,
    })

    // Log audit entry
    await ctx.db.insert("auditLog", {
      userId,
      action: "transaction_voided",
      entityType: "transaction",
      entityId: args.id,
      details: `Voided transaction ${transaction.transactionNumber}. Reason: ${args.reason}`,
      createdAt: now,
    })

    return { success: true }
  },
})

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Get user's profile to determine their branch
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    if (!userProfile || !userProfile.branchId) return []

    const branchId = userProfile.branchId
    const limit = args.limit || 10

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(limit)

    return transactions
  },
})

export const listWithFilters = query({
  args: {
    search: v.optional(v.string()),
    transactionType: v.optional(v.string()),
    status: v.optional(v.string()),
    currency: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Get user's profile to determine their branch
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    if (!userProfile || !userProfile.branchId) return []

    const branchId = userProfile.branchId

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .collect()

    let filtered = transactions

    if (args.search) {
      const searchLower = args.search.toLowerCase()
      filtered = filtered.filter((t) =>
        t.transactionNumber.toLowerCase().includes(searchLower)
      )
    }

    if (args.transactionType) {
      filtered = filtered.filter((t) => t.transactionType === args.transactionType)
    }

    if (args.status) {
      filtered = filtered.filter((t) => t.status === args.status)
    }

    if (args.currency) {
      filtered = filtered.filter(
        (t) => t.sourceCurrency === args.currency || t.targetCurrency === args.currency
      )
    }

    if (args.dateFrom) {
      filtered = filtered.filter((t) => t.createdAt >= args.dateFrom!)
    }

    if (args.dateTo) {
      filtered = filtered.filter((t) => t.createdAt <= args.dateTo!)
    }

    if (args.minAmount !== undefined) {
      filtered = filtered.filter((t) => t.totalAmount >= args.minAmount!)
    }

    if (args.maxAmount !== undefined) {
      filtered = filtered.filter((t) => t.totalAmount <= args.maxAmount!)
    }

    const limit = args.limit || 100
    return filtered.slice(0, limit)
  },
})

export const getWithCustomer = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const transaction = await ctx.db.get(args.id)
    if (!transaction) return null

    let customer = null
    if (transaction.customerId) {
      customer = await ctx.db.get(transaction.customerId)
    }

    let branch = null
    if (transaction.branchId) {
      branch = await ctx.db.get(transaction.branchId)
    }

    return { ...transaction, customer, branch }
  },
})

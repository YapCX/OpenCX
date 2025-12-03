import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

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

    let query = ctx.db.query("transactions").order("desc")

    const transactions = await query.collect()

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

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startTimestamp = startOfDay.getTime()

    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .collect()

    const todayTransactions = transactions.filter(
      (t) =>
        t.createdAt >= startTimestamp &&
        t.status === "completed" &&
        (!args.branchId || t.branchId === args.branchId)
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

    const totalAmount = args.targetAmount + (args.commission || 0)
    const transactionNumber = generateTransactionNumber()
    const now = Date.now()

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

    await ctx.db.patch(args.id, {
      status: "voided",
      voidReason: args.reason,
      voidedAt: Date.now(),
      voidedBy: userId,
    })

    return { success: true }
  },
})

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const limit = args.limit || 10

    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .take(limit)

    return transactions
  },
})

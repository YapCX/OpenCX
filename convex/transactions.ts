import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const create = mutation({
  args: {
    type: v.union(
      v.literal("currency_buy"),
      v.literal("currency_sell"),
      v.literal("cash_in"),
      v.literal("cash_out"),
      v.literal("transfer"),
      v.literal("adjustment")
    ),
    fromCurrency: v.string(),
    fromAmount: v.number(),
    toCurrency: v.string(),
    toAmount: v.number(),
    exchangeRate: v.number(),
    serviceFee: v.optional(v.number()),
    serviceFeeType: v.optional(v.union(v.literal("flat"), v.literal("percentage"))),
    paymentMethod: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    
    // Determine if AML is required (transactions over $1000 equivalent)
    const requiresAML = args.fromAmount > 1000 || args.toAmount > 1000;
    
    const transaction = {
      transactionId: generateTransactionId(),
      userId,
      customerId: args.customerId,
      type: args.type,
      fromCurrency: args.fromCurrency,
      fromAmount: args.fromAmount,
      toCurrency: args.toCurrency,
      toAmount: args.toAmount,
      exchangeRate: args.exchangeRate,
      serviceFee: args.serviceFee,
      serviceFeeType: args.serviceFeeType,
      paymentMethod: args.paymentMethod,
      status: "pending" as const,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      requiresAML,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    };
    
    const id = await ctx.db.insert("transactions", transaction);
    return { id, transactionId: transaction.transactionId };
  },
});

export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    )),
    type: v.optional(v.union(
      v.literal("currency_buy"),
      v.literal("currency_sell"),
      v.literal("cash_in"),
      v.literal("cash_out"),
      v.literal("transfer"),
      v.literal("adjustment")
    )),
    limit: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    let query = ctx.db.query("transactions").withIndex("by_user", (q) => q.eq("userId", userId));
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }
    
    let transactions = await query
      .order("desc")
      .take(args.limit || 100);
    
    // Apply search filter if provided
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      transactions = transactions.filter((t) => 
        t.transactionId.toLowerCase().includes(searchLower) ||
        t.customerName?.toLowerCase().includes(searchLower) ||
        t.customerEmail?.toLowerCase().includes(searchLower) ||
        t.fromCurrency.toLowerCase().includes(searchLower) ||
        t.toCurrency.toLowerCase().includes(searchLower)
      );
    }
    
    return transactions;
  },
});

export const getById = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const transaction = await ctx.db.get(args.id);
    
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    
    if (transaction.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    return transaction;
  },
});

export const getByTransactionId = query({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .first();
    
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    
    if (transaction.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    return transaction;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("transactions"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const transaction = await ctx.db.get(args.id);
    
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    
    if (transaction.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    const now = Date.now();
    const updates: any = {
      status: args.status,
      updatedAt: now,
    };
    
    if (args.notes) {
      updates.notes = args.notes;
    }
    
    if (args.status === "completed") {
      updates.completedAt = now;
    }
    
    await ctx.db.patch(args.id, updates);
    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const transaction = await ctx.db.get(args.id);
    
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    
    if (transaction.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Only allow deletion of pending or failed transactions
    if (transaction.status !== "pending" && transaction.status !== "failed") {
      throw new Error("Cannot delete completed or processing transactions");
    }
    
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const stats = {
      total: transactions.length,
      pending: transactions.filter(t => t.status === "pending").length,
      processing: transactions.filter(t => t.status === "processing").length,
      completed: transactions.filter(t => t.status === "completed").length,
      failed: transactions.filter(t => t.status === "failed").length,
      cancelled: transactions.filter(t => t.status === "cancelled").length,
      buyOrders: transactions.filter(t => t.type === "currency_buy").length,
      sellOrders: transactions.filter(t => t.type === "currency_sell").length,
      totalVolume: transactions
        .filter(t => t.status === "completed")
        .reduce((sum, t) => sum + t.fromAmount, 0),
    };
    
    return stats;
  },
});

export const calculateExchangeAmount = query({
  args: {
    fromCurrency: v.string(),
    toCurrency: v.string(),
    amount: v.number(),
    type: v.union(v.literal("buy"), v.literal("sell")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Get currency rates
    const fromCurrencyData = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.fromCurrency))
      .first();
    
    const toCurrencyData = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.toCurrency))
      .first();
    
    if (!fromCurrencyData || !toCurrencyData) {
      throw new Error("Currency not found");
    }
    
    let exchangeRate: number;
    
    if (args.type === "buy") {
      // Customer is buying toCurrency with fromCurrency
      exchangeRate = toCurrencyData.buyRate / fromCurrencyData.marketRate;
    } else {
      // Customer is selling fromCurrency for toCurrency
      exchangeRate = toCurrencyData.sellRate / fromCurrencyData.marketRate;
    }
    
    const convertedAmount = args.amount * exchangeRate;
    
    // Get service fee settings
    const serviceFeeSettings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "default_service_fee"))
      .first();
    
    const defaultServiceFee = serviceFeeSettings?.value as number || 0;
    const serviceFee = args.amount * (defaultServiceFee / 100);
    
    return {
      fromAmount: args.amount,
      toAmount: convertedAmount,
      exchangeRate,
      serviceFee,
      serviceFeeType: "percentage" as const,
    };
  },
});
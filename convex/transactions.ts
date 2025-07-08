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
    
    // Determine category based on transaction type
    let category: "cash_movement" | "currency_exchange" | "internal";
    if (args.type === "currency_buy" || args.type === "currency_sell") {
      category = "currency_exchange";
    } else if (args.type === "cash_in" || args.type === "cash_out") {
      category = "cash_movement";
    } else {
      category = "internal";
    }
    
    const transaction = {
      transactionId: generateTransactionId(),
      userId,
      customerId: args.customerId,
      type: args.type,
      category,
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
    category: v.optional(v.union(
      v.literal("cash_movement"),
      v.literal("currency_exchange"),
      v.literal("internal")
    )),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
    currentSessionOnly: v.optional(v.boolean()), // For tellers to see only current session
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Get user to check if they're a manager
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    let query;
    
    if (user.isManager || user.isComplianceOfficer) {
      // Managers and compliance officers can see all transactions
      query = ctx.db.query("transactions").withIndex("by_created_at");
    } else {
      // Regular tellers see only their own transactions
      if (args.currentSessionOnly) {
        // Get current active till session for the user
        const currentSession = await ctx.db
          .query("tillSessions")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();
        
        if (currentSession) {
          // Filter transactions from current session onwards
          query = ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.gte(q.field("createdAt"), currentSession.signInTime));
        } else {
          // No active session, return empty results
          return [];
        }
      } else {
        // Show all user's transactions (for pagination through previous sessions)
        query = ctx.db.query("transactions").withIndex("by_user", (q) => q.eq("userId", userId));
      }
    }
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }
    
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }
    
    let transactions = await query
      .order("desc")
      .take(args.limit || 100);
    
    // Apply offset for pagination
    if (args.offset) {
      transactions = transactions.slice(args.offset);
    }
    
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

export const update = mutation({
  args: {
    id: v.id("transactions"),
    type: v.optional(v.union(
      v.literal("currency_buy"),
      v.literal("currency_sell"),
      v.literal("cash_in"),
      v.literal("cash_out"),
      v.literal("transfer"),
      v.literal("adjustment")
    )),
    fromCurrency: v.optional(v.string()),
    fromAmount: v.optional(v.number()),
    toCurrency: v.optional(v.string()),
    toAmount: v.optional(v.number()),
    exchangeRate: v.optional(v.number()),
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
    const transaction = await ctx.db.get(args.id);
    
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    
    if (transaction.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Only allow updates to pending transactions
    if (transaction.status !== "pending") {
      throw new Error("Can only edit pending transactions");
    }
    
    const now = Date.now();
    const updates: any = {
      updatedAt: now,
    };
    
    // Only update fields that are provided
    if (args.type !== undefined) {
      updates.type = args.type;
      
      // Update category when type changes
      if (args.type === "currency_buy" || args.type === "currency_sell") {
        updates.category = "currency_exchange";
      } else if (args.type === "cash_in" || args.type === "cash_out") {
        updates.category = "cash_movement";
      } else {
        updates.category = "internal";
      }
    }
    
    if (args.fromCurrency !== undefined) updates.fromCurrency = args.fromCurrency;
    if (args.fromAmount !== undefined) {
      updates.fromAmount = args.fromAmount;
      // Update AML requirement based on new amount
      updates.requiresAML = args.fromAmount > 1000 || (args.toAmount !== undefined ? args.toAmount > 1000 : transaction.toAmount > 1000);
    }
    if (args.toCurrency !== undefined) updates.toCurrency = args.toCurrency;
    if (args.toAmount !== undefined) {
      updates.toAmount = args.toAmount;
      // Update AML requirement based on new amount
      updates.requiresAML = args.toAmount > 1000 || (args.fromAmount !== undefined ? args.fromAmount > 1000 : transaction.fromAmount > 1000);
    }
    if (args.exchangeRate !== undefined) updates.exchangeRate = args.exchangeRate;
    if (args.serviceFee !== undefined) updates.serviceFee = args.serviceFee;
    if (args.serviceFeeType !== undefined) updates.serviceFeeType = args.serviceFeeType;
    if (args.paymentMethod !== undefined) updates.paymentMethod = args.paymentMethod;
    if (args.customerName !== undefined) updates.customerName = args.customerName;
    if (args.customerEmail !== undefined) updates.customerEmail = args.customerEmail;
    if (args.customerPhone !== undefined) updates.customerPhone = args.customerPhone;
    if (args.customerId !== undefined) updates.customerId = args.customerId;
    if (args.notes !== undefined) updates.notes = args.notes;
    
    await ctx.db.patch(args.id, updates);
    return { success: true };
  },
});

// Helper function to update till cash account balances
async function updateTillCashAccount(ctx: any, tillId: string, currency: string, amount: number) {
  const cashAccount = await ctx.db
    .query("cashLedgerAccounts")
    .withIndex("by_till_and_currency", (q: any) => 
      q.eq("tillId", tillId).eq("currencyCode", currency)
    )
    .unique();

  if (!cashAccount) {
    throw new Error(`Cash account for ${currency} not found in till ${tillId}`);
  }

  const newBalance = cashAccount.balance + amount;
  
  if (newBalance < 0) {
    throw new Error(`Insufficient ${currency} balance in till ${tillId}. Current: ${cashAccount.balance}, Requested: ${amount}`);
  }

  await ctx.db.patch(cashAccount._id, {
    balance: newBalance,
    lastUpdated: Date.now(),
  });

  return { oldBalance: cashAccount.balance, newBalance };
}

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
    tillId: v.optional(v.string()), // Required for completing transactions
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
      
      // Update till balances for currency exchange transactions
      if (transaction.category === "currency_exchange") {
        // Get the till ID - either from args or find user's current till
        let tillId = args.tillId;
        
        if (!tillId) {
          // Find user's current active till session
          const currentSession = await ctx.db
            .query("tillSessions")
            .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .first();
          
          if (currentSession) {
            tillId = currentSession.tillId;
          }
        }
        
        if (!tillId) {
          throw new Error("No active till session found. Please sign into a till to complete transactions.");
        }
        
        // Update till balances based on transaction type
        try {
          if (transaction.type === "currency_buy") {
            // Customer buys toCurrency with fromCurrency
            // Till receives fromCurrency (what customer pays) - INCREASE
            // Till gives out toCurrency (what customer receives) - DECREASE
            await updateTillCashAccount(ctx, tillId, transaction.fromCurrency, transaction.fromAmount);
            await updateTillCashAccount(ctx, tillId, transaction.toCurrency, -transaction.toAmount);
            
          } else if (transaction.type === "currency_sell") {
            // Customer sells fromCurrency for toCurrency
            // Till receives fromCurrency (what customer sells) - INCREASE
            // Till gives out toCurrency (what customer gets paid) - DECREASE
            await updateTillCashAccount(ctx, tillId, transaction.fromCurrency, transaction.fromAmount);
            await updateTillCashAccount(ctx, tillId, transaction.toCurrency, -transaction.toAmount);
          }
          
          // Store the till ID in the transaction for audit purposes
          updates.tillId = tillId;
          
        } catch (error) {
          throw new Error(`Failed to update till balances: ${error}`);
        }
      }
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
  args: {
    category: v.optional(v.union(
      v.literal("cash_movement"),
      v.literal("currency_exchange"),
      v.literal("internal")
    )),
    currentSessionOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Get user to check if they're a manager
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    let query;
    
    if (user.isManager || user.isComplianceOfficer) {
      // Managers and compliance officers can see all transactions
      query = ctx.db.query("transactions").withIndex("by_created_at");
    } else {
      // Regular tellers see only their own transactions
      if (args.currentSessionOnly) {
        // Get current active till session for the user
        const currentSession = await ctx.db
          .query("tillSessions")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();
        
        if (currentSession) {
          // Filter transactions from current session onwards
          query = ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.gte(q.field("createdAt"), currentSession.signInTime));
        } else {
          // No active session, return empty stats
          return {
            total: 0,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
            buyOrders: 0,
            sellOrders: 0,
            totalVolume: 0,
          };
        }
      } else {
        // Show all user's transactions stats
        query = ctx.db.query("transactions").withIndex("by_user", (q) => q.eq("userId", userId));
      }
    }
    
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }
    
    const transactions = await query.collect();
    
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
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

function generateTransactionId(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}

export const create = mutation({
  args: {
    tillId: v.string(),
    type: v.union(
      v.literal("cash_in"),
      v.literal("cash_out"),
      v.literal("transfer"),
      v.literal("adjustment")
    ),
    amount: v.number(),
    currency: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify user is signed into the till
    const activeSession = await ctx.db
      .query("tillSessions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .unique();

    if (!activeSession || activeSession.tillId !== args.tillId) {
      throw new Error("You must be signed into this till to create transactions");
    }

    // Verify currency exists
    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.currency))
      .unique();

    if (!currency) {
      throw new Error(`Currency ${args.currency} not found`);
    }

    // Get cash ledger account
    const cashAccount = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_and_currency", (q: any) => 
        q.eq("tillId", args.tillId).eq("currencyCode", args.currency)
      )
      .unique();

    if (!cashAccount) {
      throw new Error(`Cash account for ${args.currency} not found in till ${args.tillId}`);
    }

    // Calculate new balance
    let newBalance = cashAccount.balance;
    if (args.type === "cash_in") {
      newBalance += args.amount;
    } else if (args.type === "cash_out") {
      newBalance -= args.amount;
      if (newBalance < 0) {
        throw new Error("Insufficient funds for cash out transaction");
      }
    } else if (args.type === "adjustment") {
      newBalance = args.amount; // Direct balance adjustment
    }

    const now = Date.now();
    const transactionId = generateTransactionId();

    // Create transaction record
    const transactionDocId = await ctx.db.insert("transactions", {
      transactionId,
      tillId: args.tillId,
      userId: userId,
      type: args.type,
      category: "cash_movement",
      amount: args.amount,
      currency: args.currency,
      fromCurrency: args.currency,
      fromAmount: args.amount,
      toCurrency: args.currency,
      toAmount: args.amount,
      exchangeRate: 1,
      status: "completed",
      requiresCompliance: false,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });

    // Update cash ledger account balance
    await ctx.db.patch(cashAccount._id, {
      balance: newBalance,
      lastUpdated: now,
    });

    return {
      transactionId,
      transactionDocId,
      newBalance,
    };
  },
});

export const list = query({
  args: {
    tillId: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
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

    let transactions;

    if (user.isManager || user.isComplianceOfficer) {
      // Managers and compliance officers can see all till transactions
      if (args.tillId) {
        transactions = await ctx.db
          .query("transactions")
          .withIndex("by_till_id", (q) => q.eq("tillId", args.tillId))
          .order("desc")
          .collect();
      } else {
        transactions = await ctx.db
          .query("transactions")
          .order("desc")
          .collect();
      }
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
          const userTillId = args.tillId || currentSession.tillId;
          transactions = await ctx.db
            .query("transactions")
            .withIndex("by_till_id", (q) => q.eq("tillId", userTillId))
            .filter((q) => 
              q.and(
                q.eq(q.field("userId"), userId),
                q.gte(q.field("createdAt"), currentSession.signInTime)
              )
            )
            .order("desc")
            .collect();
        } else {
          // No active session, return empty results
          return [];
        }
      } else {
        // Show all user's transactions (for pagination through previous sessions)
        if (args.tillId) {
          transactions = await ctx.db
            .query("transactions")
            .withIndex("by_till_id", (q) => q.eq("tillId", args.tillId))
            .filter((q) => q.eq(q.field("userId"), userId))
            .order("desc")
            .collect();
        } else {
          transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();
        }
      }
    }

    // Apply offset and limit for pagination
    if (args.offset) {
      transactions = transactions.slice(args.offset);
    }
    
    if (args.limit) {
      transactions = transactions.slice(0, args.limit);
    }

    return transactions;
  },
});

export const getCurrentTillTransactions = query({
  args: { 
    limit: v.optional(v.number()),
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

    // Get user's current active session
    const activeSession = await ctx.db
      .query("tillSessions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .unique();

    if (!activeSession) {
      return [];
    }

    let transactions;

    if (user.isManager || user.isComplianceOfficer) {
      // Managers and compliance officers can see all transactions in the till
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_till_id", (q) => q.eq("tillId", activeSession.tillId))
        .order("desc")
        .collect();
    } else {
      // Regular tellers see only their own transactions
      if (args.currentSessionOnly) {
        // Filter transactions from current session onwards
        transactions = await ctx.db
          .query("transactions")
          .withIndex("by_till_id", (q) => q.eq("tillId", activeSession.tillId))
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), userId),
              q.gte(q.field("createdAt"), activeSession.signInTime)
            )
          )
          .order("desc")
          .collect();
      } else {
        // Show all user's transactions in this till
        transactions = await ctx.db
          .query("transactions")
          .withIndex("by_till_id", (q) => q.eq("tillId", activeSession.tillId))
          .filter((q) => q.eq(q.field("userId"), userId))
          .order("desc")
          .collect();
      }
    }

    if (args.limit) {
      transactions = transactions.slice(0, args.limit);
    }

    return transactions;
  },
});

export const getByTransactionId = query({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db
      .query("transactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .unique();
  },
});

export const createCurrencyExchange = mutation({
  args: {
    tillId: v.string(),
    customerId: v.optional(v.string()),
    type: v.union(v.literal("currency_buy"), v.literal("currency_sell")),
    fromCurrency: v.string(),
    fromAmount: v.number(),
    toCurrency: v.string(),
    toAmount: v.number(),
    exchangeRate: v.number(),
    serviceFee: v.optional(v.number()),
    serviceFeeType: v.optional(v.union(v.literal("flat"), v.literal("percentage"))),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify user is signed into the till
    const activeSession = await ctx.db
      .query("tillSessions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .unique();

    if (!activeSession || activeSession.tillId !== args.tillId) {
      throw new Error("You must be signed into this till to create transactions");
    }

    // Check if transaction requires compliance
    const requiresCompliance = args.fromAmount >= 1000 || args.toAmount >= 1000;

    const now = Date.now();
    const transactionId = generateTransactionId();

    // Create transaction record
    const transactionDocId = await ctx.db.insert("transactions", {
      transactionId,
      tillId: args.tillId,
      userId: userId,
      customerId: args.customerId,
      type: args.type,
      category: "currency_exchange",
      fromCurrency: args.fromCurrency,
      fromAmount: args.fromAmount,
      toCurrency: args.toCurrency,
      toAmount: args.toAmount,
      exchangeRate: args.exchangeRate,
      serviceFee: args.serviceFee,
      serviceFeeType: args.serviceFeeType,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      requiresCompliance,
      notes: args.notes,
      status: "completed",
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });

    // Update cash ledger accounts
    // For currency_buy: customer gives us fromCurrency, we give them toCurrency
    // For currency_sell: customer gives us toCurrency, we give them fromCurrency
    
    if (args.type === "currency_buy") {
      // We receive fromCurrency, give out toCurrency
      await updateCashAccount(ctx, args.tillId, args.fromCurrency, args.fromAmount);
      await updateCashAccount(ctx, args.tillId, args.toCurrency, -args.toAmount);
    } else {
      // We give out fromCurrency, receive toCurrency
      await updateCashAccount(ctx, args.tillId, args.fromCurrency, -args.fromAmount);
      await updateCashAccount(ctx, args.tillId, args.toCurrency, args.toAmount);
    }

    return {
      transactionId,
      transactionDocId,
      requiresCompliance,
    };
  },
});

async function updateCashAccount(ctx: any, tillId: string, currency: string, amount: number) {
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
    throw new Error(`Insufficient ${currency} balance in till ${tillId}`);
  }

  await ctx.db.patch(cashAccount._id, {
    balance: newBalance,
    lastUpdated: Date.now(),
  });
}

export const getTillBalances = query({
  args: { tillId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const cashAccounts = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_id", (q) => q.eq("tillId", args.tillId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return cashAccounts.map(account => ({
      currencyCode: account.currencyCode,
      balance: account.balance,
      accountName: account.accountName,
    }));
  },
});

export const getCurrentTillBalances = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    // Get user's current active session
    const activeSession = await ctx.db
      .query("tillSessions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .unique();

    if (!activeSession) {
      return [];
    }

    const cashAccounts = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_id", (q) => q.eq("tillId", activeSession.tillId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return cashAccounts.map(account => ({
      currencyCode: account.currencyCode,
      balance: account.balance,
      accountName: account.accountName,
    }));
  },
});
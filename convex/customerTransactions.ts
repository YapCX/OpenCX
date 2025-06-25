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

async function requireTillAccess(ctx: any) {
  const userId = await requireAuth(ctx);
  
  // Check if user is signed into a till
  const currentTill = await ctx.db
    .query("tills")
    .withIndex("by_current_user", (q: any) => q.eq("currentUserId", userId))
    .first();
  
  if (!currentTill) {
    throw new Error("You must be signed into a till to perform transactions");
  }
  
  return { userId, tillId: currentTill.tillId };
}

export const createBuyTransaction = mutation({
  args: {
    customerId: v.union(v.id("customers"), v.null()),
    foreignCurrency: v.string(),
    foreignAmount: v.number(),
    localCurrency: v.string(),
    localAmount: v.number(),
    exchangeRate: v.number(),
    flatFee: v.number(),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, tillId } = await requireTillAccess(ctx);
    
    if (args.foreignAmount <= 0 || args.localAmount <= 0) {
      throw new Error("Amounts must be greater than zero");
    }
    
    // Generate transaction ID
    const transactionId = `BUY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const transactionData = {
      transactionId,
      tillId,
      userId,
      customerId: args.customerId,
      type: "currency_buy" as const,
      category: "currency_exchange" as const,
      
      // For currency transactions, amount and currency refer to the foreign currency
      amount: args.foreignAmount,
      currency: args.foreignCurrency,
      
      // Exchange specific fields
      foreignCurrency: args.foreignCurrency,
      foreignAmount: args.foreignAmount,
      localCurrency: args.localCurrency,
      localAmount: args.localAmount,
      exchangeRate: args.exchangeRate,
      flatFee: args.flatFee,
      paymentMethod: args.paymentMethod,
      
      status: "completed",
      createdAt: Date.now(),
    };
    
    await ctx.db.insert("transactions", transactionData);
    
    // Update foreign currency ledger account (debit - we're giving foreign currency)
    const foreignLedgerAccount = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_and_currency", (q: any) => 
        q.eq("tillId", tillId).eq("currencyCode", args.foreignCurrency)
      )
      .first();
    
    if (foreignLedgerAccount) {
      await ctx.db.patch(foreignLedgerAccount._id, {
        balance: foreignLedgerAccount.balance - args.foreignAmount,
        lastUpdated: Date.now(),
      });
    }
    
    // Update local currency ledger account (credit - we're receiving local currency)
    const localLedgerAccount = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_and_currency", (q: any) => 
        q.eq("tillId", tillId).eq("currencyCode", args.localCurrency)
      )
      .first();
    
    if (localLedgerAccount) {
      await ctx.db.patch(localLedgerAccount._id, {
        balance: localLedgerAccount.balance + args.localAmount,
        lastUpdated: Date.now(),
      });
    }
    
    return transactionId;
  },
});

export const createSellTransaction = mutation({
  args: {
    customerId: v.union(v.id("customers"), v.null()),
    foreignCurrency: v.string(),
    foreignAmount: v.number(),
    localCurrency: v.string(),
    localAmount: v.number(),
    exchangeRate: v.number(),
    flatFee: v.number(),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, tillId } = await requireTillAccess(ctx);
    
    if (args.foreignAmount <= 0 || args.localAmount <= 0) {
      throw new Error("Amounts must be greater than zero");
    }
    
    // Generate transaction ID
    const transactionId = `SELL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const transactionData = {
      transactionId,
      tillId,
      userId,
      customerId: args.customerId,
      type: "currency_sell" as const,
      category: "currency_exchange" as const,
      
      // For currency transactions, amount and currency refer to the foreign currency
      amount: args.foreignAmount,
      currency: args.foreignCurrency,
      
      // Exchange specific fields
      foreignCurrency: args.foreignCurrency,
      foreignAmount: args.foreignAmount,
      localCurrency: args.localCurrency,
      localAmount: args.localAmount,
      exchangeRate: args.exchangeRate,
      flatFee: args.flatFee,
      paymentMethod: args.paymentMethod,
      
      status: "completed",
      createdAt: Date.now(),
    };
    
    await ctx.db.insert("transactions", transactionData);
    
    // Update foreign currency ledger account (credit - we're receiving foreign currency)
    const foreignLedgerAccount = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_and_currency", (q: any) => 
        q.eq("tillId", tillId).eq("currencyCode", args.foreignCurrency)
      )
      .first();
    
    if (foreignLedgerAccount) {
      await ctx.db.patch(foreignLedgerAccount._id, {
        balance: foreignLedgerAccount.balance + args.foreignAmount,
        lastUpdated: Date.now(),
      });
    }
    
    // Update local currency ledger account (debit - we're giving local currency)
    const localLedgerAccount = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_and_currency", (q: any) => 
        q.eq("tillId", tillId).eq("currencyCode", args.localCurrency)
      )
      .first();
    
    if (localLedgerAccount) {
      await ctx.db.patch(localLedgerAccount._id, {
        balance: localLedgerAccount.balance - args.localAmount,
        lastUpdated: Date.now(),
      });
    }
    
    return transactionId;
  },
});

export const getByTransactionId = query({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_transaction_id", (q: any) => q.eq("transactionId", args.transactionId))
      .first();
    
    if (!transaction) {
      return null;
    }
    
    // Only return currency exchange transactions
    if (transaction.category !== "currency_exchange") {
      return null;
    }
    
    // Get user information
    const user = await ctx.db.get(transaction.userId);
    
    // Get customer information if exists
    let customer = null;
    if (transaction.customerId) {
      customer = await ctx.db.get(transaction.customerId);
    }
    
    return {
      ...transaction,
      user: user ? {
        _id: user._id,
        name: (user as any).name || "Unknown User",
        email: (user as any).email,
      } : null,
      customer: customer ? {
        _id: customer._id,
        customerId: (customer as any).customerId,
        fullName: (customer as any).fullName,
        legalBusinessName: (customer as any).legalBusinessName,
        customerType: (customer as any).customerType,
      } : null,
    };
  },
});

export const list = query({
  args: {
    tillId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    let transactions;
    
    // Apply filters - only get currency exchange transactions
    if (args.tillId) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_till", (q: any) => q.eq("tillId", args.tillId))
        .filter((q: any) => q.eq(q.field("category"), "currency_exchange"))
        .order("desc")
        .take(args.limit || 50);
    } else {
      transactions = await ctx.db
        .query("transactions")
        .filter((q: any) => q.eq(q.field("category"), "currency_exchange"))
        .order("desc")
        .take(args.limit || 50);
    }
    
    // Get user information for each transaction
    const transactionsWithUsers = await Promise.all(
      transactions.map(async (transaction) => {
        const user = await ctx.db.get(transaction.userId);
        return {
          ...transaction,
          user: user ? {
            _id: user._id,
            name: (user as any).name || (user as any).email || "User",
            email: (user as any).email,
          } : null,
        };
      })
    );
    
    return transactionsWithUsers;
  },
});
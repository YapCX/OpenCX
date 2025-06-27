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

export const create = mutation({
  args: {
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
  returns: v.string(),
  handler: async (ctx, args) => {
    const { userId, tillId } = await requireTillAccess(ctx);

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const transactionData = {
      transactionId,
      tillId,
      userId,
      customerId: null,
      type: args.type,
      category: "cash_movement" as const,
      amount: args.amount,
      currency: args.currency,
      status: "completed",
      notes: args.notes,
      createdAt: Date.now(),
    };

    await ctx.db.insert("transactions", transactionData);

    // Update cash ledger account balance
    const ledgerAccount = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_and_currency", (q: any) =>
        q.eq("tillId", tillId).eq("currencyCode", args.currency)
      )
      .first();

    if (ledgerAccount) {
      const balanceChange = args.type === "cash_in" ? args.amount : -args.amount;
      await ctx.db.patch(ledgerAccount._id, {
        balance: ledgerAccount.balance + balanceChange,
        lastUpdated: Date.now(),
      });
    }

    return transactionId;
  },
});

export const list = query({
  args: {
    tillId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let transactions;

    // Apply filters - only get cash movement transactions
    if (args.tillId) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_till", (q: any) => q.eq("tillId", args.tillId))
        .filter((q: any) => q.eq(q.field("category"), "cash_movement"))
        .order("desc")
        .take(args.limit || 50);
    } else {
      transactions = await ctx.db
        .query("transactions")
        .filter((q: any) => q.eq(q.field("category"), "cash_movement"))
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

export const getCurrentTillTransactions = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const { tillId } = await requireTillAccess(ctx);

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_till", (q: any) => q.eq("tillId", tillId))
      .filter((q: any) => q.eq(q.field("category"), "cash_movement"))
      .order("desc")
      .take(20);

    return transactions;
  },
});

export const getTillBalance = query({
  args: { tillId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Removed strict authentication requirement to allow client-side access without user auth.
    // Optionally, you can reintroduce permission checks here if needed.

    const accounts = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_id", (q: any) => q.eq("tillId", args.tillId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    return accounts;
  },
});

export const getByTransactionId = query({
  args: { transactionId: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_transaction_id", (q: any) => q.eq("transactionId", args.transactionId))
      .first();

    if (!transaction) {
      return null;
    }

    // Only return cash movement transactions
    if (transaction.category !== "cash_movement") {
      return null;
    }

    // Get user information
    const user = await ctx.db.get(transaction.userId);

    return {
      ...transaction,
      user: user ? {
        _id: user._id,
        name: (user as any).name || "Unknown User",
        email: (user as any).email,
      } : null,
    };
  },
});
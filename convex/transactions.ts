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

// Helper function to check compliance requirements
async function checkComplianceRequirements(ctx: any, args: any) {
  const warnings: string[] = [];
  
  // Get compliance settings
  const generalSettings = await ctx.db.query("settings").collect();
  const settingsMap = Object.fromEntries(generalSettings.map((s: any) => [s.key, s.value]));
  const complianceSettings = await ctx.db.query("complianceSettings").first();
  
  // Check if compliance checks are enabled
  const performComplianceChecks = settingsMap.performComplianceChecks ?? true;
  if (!performComplianceChecks) {
    return { warnings, requiresCompliance: false };
  }
  
  const activateRuleBasedAml = settingsMap.activateRuleBasedAml ?? false;
  const requireProfileThreshold = settingsMap.requireProfileThreshold ?? 1000;
  const lctThreshold = settingsMap.lctThreshold ?? 10000;
  const requireSinThreshold = settingsMap.requireSinThreshold ?? 3000;
  const requirePepThreshold = settingsMap.requirePepThreshold ?? 1000;
  const warnIncompleteKyc = settingsMap.warnIncompleteKyc ?? true;
  const warnRepeatTransactionsDays = settingsMap.warnRepeatTransactionsDays ?? 7;
  
  const transactionAmount = Math.max(args.fromAmount, args.toAmount);
  
  // Check if compliance is required based on thresholds
  let requiresCompliance = false;
  
  // Profile threshold check
  if (transactionAmount > requireProfileThreshold) {
    requiresCompliance = true;
    if (!args.customerId) {
      warnings.push("CUSTOMER_PROFILE_REQUIRED");
    }
  }
  
  // LCT threshold check
  if (transactionAmount > lctThreshold) {
    requiresCompliance = true;
    warnings.push("LCT_THRESHOLD_EXCEEDED");
  }
  
  // SIN threshold check
  if (transactionAmount > requireSinThreshold) {
    requiresCompliance = true;
    warnings.push("SIN_REQUIRED");
  }
  
  // PEP threshold check
  if (transactionAmount > requirePepThreshold) {
    requiresCompliance = true;
    warnings.push("PEP_DOCUMENTATION_REQUIRED");
  }
  
  // Customer-specific checks
  if (args.customerId) {
    const customer = await ctx.db.query("customers").filter((q: any) => q.eq(q.field("customerId"), args.customerId)).first();
    
    if (customer) {
      // KYC completeness check
      if (warnIncompleteKyc) {
        const isIncomplete = !customer.firstName || !customer.lastName || !customer.address || !customer.phone;
        if (isIncomplete) {
          warnings.push("INCOMPLETE_KYC");
        }
      }
      
      // Repeat transaction check
      if (warnRepeatTransactionsDays > 0) {
        const cutoffDate = Date.now() - (warnRepeatTransactionsDays * 24 * 60 * 60 * 1000);
        const recentTransactions = await ctx.db
          .query("transactions")
          .filter((q: any) => q.eq(q.field("customerId"), args.customerId))
          .filter((q: any) => q.gte(q.field("createdAt"), cutoffDate))
          .collect();
        
        if (recentTransactions.length > 0) {
          warnings.push("REPEAT_TRANSACTION_WARNING");
        }
      }
      
      // Risk level checks
      if (customer.riskLevel === "high") {
        warnings.push("HIGH_RISK_CUSTOMER");
        requiresCompliance = true;
      }
      
      // Sanctions screening status
      if (customer.sanctionsScreeningStatus === "match") {
        warnings.push("SANCTIONS_MATCH");
        requiresCompliance = true;
      }
      
      // Compliance status check
      if (customer.complianceStatus === "pending" || customer.complianceStatus === "requires_review") {
        warnings.push("COMPLIANCE_REVIEW_REQUIRED");
        requiresCompliance = true;
      }
    }
  }
  
  // Rule-based compliance checks
  if (activateRuleBasedAml && complianceSettings) {
    // Auto screening checks
    if (complianceSettings.autoScreeningEnabled && args.customerId) {
      warnings.push("AUTO_SCREENING_REQUIRED");
    }
    
    // Transaction limits
    if (complianceSettings.transactionLimits) {
      const { individualTransaction, corporateTransaction } = complianceSettings.transactionLimits;
      const customer = args.customerId ? await ctx.db.query("customers").filter((q: any) => q.eq(q.field("customerId"), args.customerId)).first() : null;
      
      const limit = customer?.type === "corporate" ? corporateTransaction : individualTransaction;
      if (transactionAmount > limit) {
        warnings.push("TRANSACTION_LIMIT_EXCEEDED");
        requiresCompliance = true;
      }
    }
    
    // Two-person approval requirement
    if (complianceSettings.requireTwoPersonApproval && requiresCompliance) {
      warnings.push("TWO_PERSON_APPROVAL_REQUIRED");
    }
  }
  
  return { warnings, requiresCompliance };
}

export const create = mutation({
  args: {
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
    overrideWarnings: v.optional(v.boolean()), // Allow overriding warnings for authorized users
    overrideReason: v.optional(v.string()), // Required reason for overrides
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    
    // Auto-determine transaction type based on base currency
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "base_currency"))
      .first();
    const baseCurrency = setting?.value as string || "CAD";
    const type: "currency_buy" | "currency_sell" = args.toCurrency === baseCurrency ? "currency_sell" : "currency_buy";
    
    // Perform compliance checks
    const complianceResult = await checkComplianceRequirements(ctx, args);
    
    // Get user for permission checks
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if warnings should block the transaction
    if (complianceResult.warnings.length > 0 && !args.overrideWarnings) {
      // Get warning tolerance level (we'll implement this later)
      const warningToleranceLevel = "Normal" as "Severe" | "Normal" | "Relax"; // Default to Normal for now
      
      if (warningToleranceLevel === "Severe") {
        // Block transaction on any warning
        throw new Error(`Transaction blocked due to compliance warnings: ${complianceResult.warnings.join(", ")}`);
      } else if (warningToleranceLevel === "Normal") {
        // Allow transaction but return warnings
        // Continue to create transaction
      }
      // "Relax" mode would skip warnings entirely
    }
    
    // Check if override reason is required
    if (args.overrideWarnings) {
      const requireOverrideReason = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "requireOverrideReason"))
        .first();
      
      if (requireOverrideReason?.value && !args.overrideReason) {
        throw new Error("Override reason is required when bypassing compliance warnings");
      }
    }
    
    // Currency exchange category for all transactions in this context
    const category: "currency_exchange" = "currency_exchange";
    
    const transaction = {
      transactionId: generateTransactionId(),
      userId,
      customerId: args.customerId,
      type,
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
      requiresCompliance: complianceResult.requiresCompliance,
      notes: args.overrideReason ? `${args.notes || ""}\n\nOverride Reason: ${args.overrideReason}` : args.notes,
      createdAt: now,
      updatedAt: now,
    };
    
    const id = await ctx.db.insert("transactions", transaction);
    
    // Return transaction details along with compliance warnings
    return { 
      id, 
      transactionId: transaction.transactionId,
      warnings: complianceResult.warnings,
      requiresCompliance: complianceResult.requiresCompliance,
      success: true 
    };
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
      // Update compliance requirement based on new amount
      updates.requiresCompliance = args.fromAmount > 1000 || (args.toAmount !== undefined ? args.toAmount > 1000 : transaction.toAmount > 1000);
    }
    if (args.toCurrency !== undefined) updates.toCurrency = args.toCurrency;
    if (args.toAmount !== undefined) {
      updates.toAmount = args.toAmount;
      // Update compliance requirement based on new amount
      updates.requiresCompliance = args.toAmount > 1000 || (args.fromAmount !== undefined ? args.fromAmount > 1000 : transaction.fromAmount > 1000);
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
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Get base currency
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "base_currency"))
      .first();
    const baseCurrency = setting?.value as string || "CAD";
    
    const [fromCurrencyData, toCurrencyData] = await Promise.all([
      ctx.db.query("currencies").withIndex("by_code", (q) => q.eq("code", args.fromCurrency)).first(),
      ctx.db.query("currencies").withIndex("by_code", (q) => q.eq("code", args.toCurrency)).first()
    ]);
    
    if (!fromCurrencyData || !toCurrencyData) {
      throw new Error("Currency not found");
    }
    
    // Use sell rate for currency we're receiving, buy rate for currency we're giving
    const fromRate = args.fromCurrency === baseCurrency ? fromCurrencyData.marketRate : fromCurrencyData.sellRate;
    const toRate = args.toCurrency === baseCurrency ? toCurrencyData.marketRate : toCurrencyData.buyRate;
    const exchangeRate = toRate / fromRate;
    
    const convertedAmount = args.amount * exchangeRate;
    
    // Get service fee settings (fixed dollar amount)
    const serviceFeeSettings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "default_service_fee"))
      .first();
    
    const serviceFee = serviceFeeSettings?.value as number || 0;
    
    return {
      fromAmount: args.amount,
      toAmount: convertedAmount,
      exchangeRate,
      serviceFee,
      serviceFeeType: "flat" as const,
    };
  },
});
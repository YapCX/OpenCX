import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import defaults from "../config/defaults.json";

// Default constants from config
export const DEFAULT_BASE_CURRENCY = defaults.settings.base_currency;
export const DEFAULT_DISCOUNT_PERCENT = defaults.settings.default_discount_percent;
export const DEFAULT_MARKUP_PERCENT = defaults.settings.default_markup_percent;
export const DEFAULT_SERVICE_FEE = defaults.settings.default_service_fee;

// Authentication helpers
async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

async function requireManager(ctx: any) {
  const clerkUserId = await requireAuth(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", clerkUserId))
    .first();

  if (!user || !user.isManager) {
    throw new Error("Manager access required");
  }
  return user;
}

async function requireManagerOrCompliance(ctx: any) {
  const clerkUserId = await requireAuth(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", clerkUserId))
    .first();

  if (!user || (!user.isManager && !user.isComplianceOfficer)) {
    throw new Error("Manager or Compliance Officer access required");
  }
  return user;
}

// System initialization status check
export const getSystemInitializationStatus = query({
  args: {},
  handler: async (ctx) => {
    // Check if system has been fully initialized
    const [
      companySettings,
      complianceSettings,
      currencies,
      users
    ] = await Promise.all([
      ctx.db.query("companySettings").first(),
      ctx.db.query("complianceSettings").first(),
      ctx.db.query("currencies").first(),
      ctx.db.query("users").first()
    ]);

    // System is considered initialized if:
    // 1. At least one user exists
    // 2. Company settings have been configured (not just defaults)
    // 3. Compliance settings exist
    // 4. At least one currency is configured
    const hasUsers = !!users;
    const hasCompanySettings = companySettings && companySettings.companyName !== defaults.companySettings.companyName;
    const hasComplianceSettings = !!complianceSettings;
    const hasCurrencies = !!currencies;

    const isFullyInitialized = hasUsers && hasCompanySettings && hasComplianceSettings && hasCurrencies;

    return {
      isFullyInitialized,
      hasUsers,
      hasCompanySettings,
      hasComplianceSettings,
      hasCurrencies,
      needsInitialization: hasUsers && !isFullyInitialized // Has users but incomplete setup
    };
  },
});

export const getBaseCurrency = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Auth not required for reading base currency as it's needed for UI
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "base_currency"))
      .first();

    return setting?.value as string || DEFAULT_BASE_CURRENCY;
  },
});


export const setSetting = mutation({
  args: {
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  returns: v.id("settings"),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const existingSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.value,
        description: args.description,
        category: args.category,
        lastUpdated: Date.now(),
        updatedBy: userId,
      });
      return existingSetting._id;
    } else {
      return await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        description: args.description,
        category: args.category,
        lastUpdated: Date.now(),
        updatedBy: userId,
      });
    }
  },
});

// ===================
// GENERAL SETTINGS API
// ===================

export const getAllSettings = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (args.category) {
      return await ctx.db
        .query("settings")
        .withIndex("by_category", (q: any) => q.eq("category", args.category))
        .collect();
    }

    return await ctx.db.query("settings").collect();
  },
});

export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", args.key))
      .first();

    return setting?.value;
  },
});

// ===================
// CURRENCY SETTINGS API
// ===================


// ===================
// COMPLIANCE SETTINGS API
// ===================

export const getBasicComplianceSettings = query({
  handler: async (ctx) => {
    await requireManagerOrCompliance(ctx);

    const complianceSettings = await ctx.db.query("complianceSettings").first();

    if (!complianceSettings) {
      // Return default compliance settings from config
      return {
        ...defaults.complianceSettings,
        defaultServiceFee: DEFAULT_SERVICE_FEE,
        serviceFeeType: "flat" as const,
      };
    }

    return complianceSettings;
  },
});

export const updateBasicComplianceSettings = mutation({
  args: {
    autoScreeningEnabled: v.optional(v.boolean()),
    enabledSanctionLists: v.optional(v.array(v.string())),
    riskThresholds: v.optional(v.object({
      low: v.number(),
      medium: v.number(),
      high: v.number(),
    })),
    transactionLimits: v.optional(v.object({
      individualDaily: v.number(),
      individualTransaction: v.number(),
      corporateDaily: v.number(),
      corporateTransaction: v.number(),
    })),
    autoHoldOnMatch: v.optional(v.boolean()),
    requireOverrideReason: v.optional(v.boolean()),
    autoReportSuspicious: v.optional(v.boolean()),
    defaultServiceFee: v.optional(v.number()),
    serviceFeeType: v.optional(v.union(v.literal("flat"), v.literal("percentage"))),
    pepScreeningEnabled: v.optional(v.boolean()),
    adverseMediaScreeningEnabled: v.optional(v.boolean()),
    retentionPeriodDays: v.optional(v.number()),
    requireTwoPersonApproval: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireManagerOrCompliance(ctx);

    const existingSettings = await ctx.db.query("complianceSettings").first();
    const now = Date.now();

    const updateData = {
      lastUpdated: now,
      updatedBy: user.clerkUserId,
      ...Object.fromEntries(
        Object.entries(args).filter(([_, value]) => value !== undefined)
      ),
    };

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, updateData);
      return await ctx.db.get(existingSettings._id);
    } else {
      // Create new compliance settings with defaults from config
      const defaultSettings = {
        ...defaults.complianceSettings,
        defaultServiceFee: DEFAULT_SERVICE_FEE,
        serviceFeeType: "flat" as const,
        warningToleranceLevel: defaults.complianceSettings.warningToleranceLevel as "relax" | "normal" | "severe",
        ...updateData,
      };

      const complianceSettingsId = await ctx.db.insert("complianceSettings", defaultSettings);
      return await ctx.db.get(complianceSettingsId);
    }
  },
});

// Comprehensive compliance settings mutation - handles all settings from the spec
export const updateComplianceSettings = mutation({
  args: {
    // Core compliance settings (stored in complianceSettings table)
    performComplianceChecks: v.optional(v.boolean()),
    requireProfileThreshold: v.optional(v.number()),
    lctThreshold: v.optional(v.number()),
    requireSinThreshold: v.optional(v.number()),
    requirePepThreshold: v.optional(v.number()),
    
    // KYC and customer warnings
    warnIncompleteKyc: v.optional(v.boolean()),
    warnRepeatTransactionsDays: v.optional(v.number()),
    autoCheckCustomerBeforeInvoice: v.optional(v.boolean()),
    customerProfileReviewDays: v.optional(v.number()),
    
    // Transaction warnings and overrides
    denominationRequestThreshold: v.optional(v.number()),
    maxRateChangeAllowance: v.optional(v.number()),
    forceRegisterForChequeOrWire: v.optional(v.boolean()),
    warnNegativeCashBalance: v.optional(v.boolean()),
    
    // Global warning tolerance level
    warningToleranceLevel: v.optional(v.union(v.literal("relax"), v.literal("normal"), v.literal("severe"))),
    
    // Sanctions and screening
    enabledSanctionLists: v.optional(v.array(v.string())),
    autoScreeningEnabled: v.optional(v.boolean()),
    pepScreeningEnabled: v.optional(v.boolean()),
    adverseMediaScreeningEnabled: v.optional(v.boolean()),
    autoHoldOnMatch: v.optional(v.boolean()),
    requireOverrideReason: v.optional(v.boolean()),
    autoReportSuspicious: v.optional(v.boolean()),
    retentionPeriodDays: v.optional(v.number()),
    requireTwoPersonApproval: v.optional(v.boolean()),
    
    // Transaction limits
    transactionLimits: v.optional(v.object({
      individualDaily: v.number(),
      individualTransaction: v.number(),
      corporateDaily: v.number(),
      corporateTransaction: v.number(),
    })),
    
    // Risk thresholds
    riskThresholds: v.optional(v.object({
      low: v.number(),
      medium: v.number(),
      high: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await requireManagerOrCompliance(ctx);
    const now = Date.now();

    // All settings go to complianceSettings table based on updated schema
    const complianceFields = {
      performComplianceChecks: args.performComplianceChecks,
      requireProfileThreshold: args.requireProfileThreshold,
      lctThreshold: args.lctThreshold,
      requireSinThreshold: args.requireSinThreshold,
      requirePepThreshold: args.requirePepThreshold,
      warnIncompleteKyc: args.warnIncompleteKyc,
      warnRepeatTransactionsDays: args.warnRepeatTransactionsDays,
      autoCheckCustomerBeforeInvoice: args.autoCheckCustomerBeforeInvoice,
      customerProfileReviewDays: args.customerProfileReviewDays,
      denominationRequestThreshold: args.denominationRequestThreshold,
      maxRateChangeAllowance: args.maxRateChangeAllowance,
      forceRegisterForChequeOrWire: args.forceRegisterForChequeOrWire,
      warnNegativeCashBalance: args.warnNegativeCashBalance,
      warningToleranceLevel: args.warningToleranceLevel,
      enabledSanctionLists: args.enabledSanctionLists,
      autoScreeningEnabled: args.autoScreeningEnabled,
      pepScreeningEnabled: args.pepScreeningEnabled,
      adverseMediaScreeningEnabled: args.adverseMediaScreeningEnabled,
      autoHoldOnMatch: args.autoHoldOnMatch,
      requireOverrideReason: args.requireOverrideReason,
      autoReportSuspicious: args.autoReportSuspicious,
      retentionPeriodDays: args.retentionPeriodDays,
      requireTwoPersonApproval: args.requireTwoPersonApproval,
      transactionLimits: args.transactionLimits,
      riskThresholds: args.riskThresholds,
    };

    // Filter out undefined values
    const updateData = Object.fromEntries(
      Object.entries(complianceFields).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updateData).length > 0) {
      const existingComplianceSettings = await ctx.db.query("complianceSettings").first();
      
      if (existingComplianceSettings) {
        await ctx.db.patch(existingComplianceSettings._id, {
          ...updateData,
          lastUpdated: now,
          updatedBy: user.clerkUserId,
        });
      } else {
        // Create new compliance settings with defaults
        const defaultSettings = {
          ...defaults.complianceSettings,
          defaultServiceFee: DEFAULT_SERVICE_FEE,
          serviceFeeType: "flat" as const,
          warningToleranceLevel: defaults.complianceSettings.warningToleranceLevel as "relax" | "normal" | "severe",
          ...updateData,
          lastUpdated: now,
          updatedBy: user.clerkUserId,
        };

        await ctx.db.insert("complianceSettings", defaultSettings);
      }
    }

    return { success: true, updatedAt: now };
  },
});

// Get all compliance settings for the frontend
export const getComplianceSettings = query({
  handler: async (ctx) => {
    await requireManagerOrCompliance(ctx);

    // Get compliance settings from complianceSettings table
    const complianceSettings = await ctx.db.query("complianceSettings").first();

    if (!complianceSettings) {
      // Return defaults from config
      return defaults.complianceSettings;
    }

    return {
      // Core compliance settings
      performComplianceChecks: complianceSettings.performComplianceChecks ?? defaults.complianceSettings.performComplianceChecks,
      requireProfileThreshold: complianceSettings.requireProfileThreshold ?? defaults.complianceSettings.requireProfileThreshold,
      lctThreshold: complianceSettings.lctThreshold ?? defaults.complianceSettings.lctThreshold,
      requireSinThreshold: complianceSettings.requireSinThreshold ?? defaults.complianceSettings.requireSinThreshold,
      requirePepThreshold: complianceSettings.requirePepThreshold ?? defaults.complianceSettings.requirePepThreshold,
      
      // KYC and customer warnings
      warnIncompleteKyc: complianceSettings.warnIncompleteKyc ?? defaults.complianceSettings.warnIncompleteKyc,
      warnRepeatTransactionsDays: complianceSettings.warnRepeatTransactionsDays ?? defaults.complianceSettings.warnRepeatTransactionsDays,
      autoCheckCustomerBeforeInvoice: complianceSettings.autoCheckCustomerBeforeInvoice ?? defaults.complianceSettings.autoCheckCustomerBeforeInvoice,
      customerProfileReviewDays: complianceSettings.customerProfileReviewDays ?? defaults.complianceSettings.customerProfileReviewDays,
      
      // Transaction warnings and overrides
      denominationRequestThreshold: complianceSettings.denominationRequestThreshold ?? defaults.complianceSettings.denominationRequestThreshold,
      maxRateChangeAllowance: complianceSettings.maxRateChangeAllowance ?? defaults.complianceSettings.maxRateChangeAllowance,
      forceRegisterForChequeOrWire: complianceSettings.forceRegisterForChequeOrWire ?? defaults.complianceSettings.forceRegisterForChequeOrWire,
      warnNegativeCashBalance: complianceSettings.warnNegativeCashBalance ?? defaults.complianceSettings.warnNegativeCashBalance,
      
      // Global warning tolerance level
      warningToleranceLevel: complianceSettings.warningToleranceLevel ?? defaults.complianceSettings.warningToleranceLevel,

      // Sanctions and screening
      enabledSanctionLists: complianceSettings.enabledSanctionLists ?? defaults.complianceSettings.enabledSanctionLists,
      autoScreeningEnabled: complianceSettings.autoScreeningEnabled ?? defaults.complianceSettings.autoScreeningEnabled,
      pepScreeningEnabled: complianceSettings.pepScreeningEnabled ?? defaults.complianceSettings.pepScreeningEnabled,
      adverseMediaScreeningEnabled: complianceSettings.adverseMediaScreeningEnabled ?? defaults.complianceSettings.adverseMediaScreeningEnabled,
      autoHoldOnMatch: complianceSettings.autoHoldOnMatch ?? defaults.complianceSettings.autoHoldOnMatch,
      requireOverrideReason: complianceSettings.requireOverrideReason ?? defaults.complianceSettings.requireOverrideReason,
      autoReportSuspicious: complianceSettings.autoReportSuspicious ?? defaults.complianceSettings.autoReportSuspicious,
      retentionPeriodDays: complianceSettings.retentionPeriodDays ?? defaults.complianceSettings.retentionPeriodDays,
      requireTwoPersonApproval: complianceSettings.requireTwoPersonApproval ?? defaults.complianceSettings.requireTwoPersonApproval,
      
      // Transaction limits and risk thresholds
      transactionLimits: complianceSettings.transactionLimits ?? defaults.complianceSettings.transactionLimits,
      riskThresholds: complianceSettings.riskThresholds ?? defaults.complianceSettings.riskThresholds,
    };
  },
});

// ===================
// COMPANY SETTINGS API
// ===================

export const getCompanySettings = query({
  handler: async (ctx) => {
    await requireAuth(ctx);

    const companySettings = await ctx.db.query("companySettings").first();

    if (!companySettings) {
      // Return default company settings from config
      return defaults.companySettings;
    }

    return companySettings;
  },
});

export const updateCompanySettings = mutation({
  args: {
    companyName: v.optional(v.string()),
    businessNumber: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    businessType: v.optional(v.string()),
    establishedDate: v.optional(v.string()),
    regulatoryBody: v.optional(v.string()),
    complianceOfficer: v.optional(v.string()),
    logoImageId: v.optional(v.id("_storage")),
    branchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireManager(ctx);

    const existingSettings = await ctx.db.query("companySettings").first();
    const now = Date.now();

    const updateData = {
      lastUpdated: now,
      updatedBy: user.clerkUserId,
      ...Object.fromEntries(
        Object.entries(args).filter(([_, value]) => value !== undefined)
      ),
    };

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, updateData);
      return await ctx.db.get(existingSettings._id);
    } else {
      // Create new company settings with defaults from config
      const defaultSettings = {
        ...defaults.companySettings,
        ...updateData,
      };

      const companySettingsId = await ctx.db.insert("companySettings", defaultSettings);
      return await ctx.db.get(companySettingsId);
    }
  },
});

// Mark system as fully initialized (called after wizard completion)
export const markSystemInitialized = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireManager(ctx);

    // This mutation doesn't need to store anything specific
    // The getSystemInitializationStatus query will detect completion
    // based on the presence of company settings, AML settings, currencies, etc.

    console.log("System marked as fully initialized by:", user.clerkUserId);
    return { success: true, initializedAt: Date.now() };
  },
});


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
      amlSettings,
      currencies,
      users
    ] = await Promise.all([
      ctx.db.query("companySettings").first(),
      ctx.db.query("amlSettings").first(),
      ctx.db.query("currencies").first(),
      ctx.db.query("users").first()
    ]);

    // System is considered initialized if:
    // 1. At least one user exists
    // 2. Company settings have been configured (not just defaults)
    // 3. AML settings exist
    // 4. At least one currency is configured
    const hasUsers = !!users;
    const hasCompanySettings = companySettings && companySettings.companyName !== defaults.companySettings.companyName;
    const hasAMLSettings = !!amlSettings;
    const hasCurrencies = !!currencies;

    const isFullyInitialized = hasUsers && hasCompanySettings && hasAMLSettings && hasCurrencies;

    return {
      isFullyInitialized,
      hasUsers,
      hasCompanySettings,
      hasAMLSettings,
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
// AML SETTINGS API
// ===================

export const getAMLSettings = query({
  handler: async (ctx) => {
    await requireManagerOrCompliance(ctx);

    const amlSettings = await ctx.db.query("amlSettings").first();

    if (!amlSettings) {
      // Return default AML settings from config
      return {
        ...defaults.amlSettings,
        defaultServiceFee: DEFAULT_SERVICE_FEE,
        serviceFeeType: "flat" as const,
      };
    }

    return amlSettings;
  },
});

export const updateAMLSettings = mutation({
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

    const existingSettings = await ctx.db.query("amlSettings").first();
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
      // Create new AML settings with defaults from config
      const defaultSettings = {
        ...defaults.amlSettings,
        defaultServiceFee: DEFAULT_SERVICE_FEE,
        serviceFeeType: "flat" as const,
        ...updateData,
      };

      const amlSettingsId = await ctx.db.insert("amlSettings", defaultSettings);
      return await ctx.db.get(amlSettingsId);
    }
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


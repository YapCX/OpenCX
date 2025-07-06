import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Default constants
export const DEFAULT_BASE_CURRENCY = "USD";
export const DEFAULT_DISCOUNT_PERCENT = 2.5;
export const DEFAULT_MARKUP_PERCENT = 3.5;
export const DEFAULT_SERVICE_FEE = 2.0;

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

export const getDefaultDiscountPercent = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Auth not required for reading default settings
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "default_discount_percent"))
      .first();

    return setting?.value as number || DEFAULT_DISCOUNT_PERCENT;
  },
});

export const getDefaultMarkupPercent = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Auth not required for reading default settings
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "default_markup_percent"))
      .first();

    return setting?.value as number || DEFAULT_MARKUP_PERCENT;
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

export const getDefaultServiceFee = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "default_service_fee"))
      .first();

    return setting?.value as number || DEFAULT_SERVICE_FEE;
  },
});

export const setBaseCurrency = mutation({
  args: { currencyCode: v.string() },
  handler: async (ctx, args) => {
    const user = await requireManager(ctx);

    return await ctx.db.insert("settings", {
      key: "base_currency",
      value: args.currencyCode,
      description: "Base currency for exchange rate calculations",
      category: "currency",
      lastUpdated: Date.now(),
      updatedBy: user.clerkUserId,
    });
  },
});

export const setDefaultDiscountPercent = mutation({
  args: { percent: v.number() },
  handler: async (ctx, args) => {
    const user = await requireManager(ctx);

    const existingSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "default_discount_percent"))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.percent,
        lastUpdated: Date.now(),
        updatedBy: user.clerkUserId,
      });
      return existingSetting._id;
    } else {
      return await ctx.db.insert("settings", {
        key: "default_discount_percent",
        value: args.percent,
        description: "Default discount percentage for buying currency",
        category: "currency",
        lastUpdated: Date.now(),
        updatedBy: user.clerkUserId,
      });
    }
  },
});

export const setDefaultMarkupPercent = mutation({
  args: { percent: v.number() },
  handler: async (ctx, args) => {
    const user = await requireManager(ctx);

    const existingSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "default_markup_percent"))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.percent,
        lastUpdated: Date.now(),
        updatedBy: user.clerkUserId,
      });
      return existingSetting._id;
    } else {
      return await ctx.db.insert("settings", {
        key: "default_markup_percent",
        value: args.percent,
        description: "Default markup percentage for selling currency",
        category: "currency",
        lastUpdated: Date.now(),
        updatedBy: user.clerkUserId,
      });
    }
  },
});

export const setDefaultServiceFee = mutation({
  args: { fee: v.number() },
  handler: async (ctx, args) => {
    const user = await requireManager(ctx);

    const existingSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "default_service_fee"))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.fee,
        lastUpdated: Date.now(),
        updatedBy: user.clerkUserId,
      });
      return existingSetting._id;
    } else {
      return await ctx.db.insert("settings", {
        key: "default_service_fee",
        value: args.fee,
        description: "Default service fee for transactions",
        category: "currency",
        lastUpdated: Date.now(),
        updatedBy: user.clerkUserId,
      });
    }
  },
});

// ===================
// AML SETTINGS API
// ===================

export const getAMLSettings = query({
  handler: async (ctx) => {
    await requireManagerOrCompliance(ctx);

    const amlSettings = await ctx.db.query("amlSettings").first();

    if (!amlSettings) {
      // Return default AML settings
      return {
        autoScreeningEnabled: true,
        enabledSanctionLists: ["OFAC", "UN", "EU"],
        riskThresholds: {
          low: 30,
          medium: 70,
          high: 100,
        },
        transactionLimits: {
          individualDaily: 10000,
          individualTransaction: 3000,
          corporateDaily: 50000,
          corporateTransaction: 15000,
        },
        autoHoldOnMatch: true,
        requireOverrideReason: true,
        autoReportSuspicious: false,
        defaultServiceFee: DEFAULT_SERVICE_FEE,
        serviceFeeType: "flat" as const,
        pepScreeningEnabled: true,
        adverseMediaScreeningEnabled: false,
        retentionPeriodDays: 2555, // 7 years
        requireTwoPersonApproval: true,
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
      // Create new AML settings with defaults
      const defaultSettings = {
        autoScreeningEnabled: true,
        enabledSanctionLists: ["OFAC", "UN", "EU"],
        riskThresholds: {
          low: 30,
          medium: 70,
          high: 100,
        },
        transactionLimits: {
          individualDaily: 10000,
          individualTransaction: 3000,
          corporateDaily: 50000,
          corporateTransaction: 15000,
        },
        autoHoldOnMatch: true,
        requireOverrideReason: true,
        autoReportSuspicious: false,
        defaultServiceFee: DEFAULT_SERVICE_FEE,
        serviceFeeType: "flat" as const,
        pepScreeningEnabled: true,
        adverseMediaScreeningEnabled: false,
        retentionPeriodDays: 2555, // 7 years
        requireTwoPersonApproval: true,
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
      // Return default company settings
      return {
        companyName: "Your Exchange Company",
        businessNumber: "",
        licenseNumber: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        country: "",
        phone: "",
        email: "",
        website: "",
        businessType: "",
        establishedDate: "",
        regulatoryBody: "",
        complianceOfficer: "",
        logoUrl: "",
        primaryColor: "#000000",
        secondaryColor: "#666666",
      };
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
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
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
      // Create new company settings with defaults
      const defaultSettings = {
        companyName: "Your Exchange Company",
        businessNumber: "",
        licenseNumber: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        country: "",
        phone: "",
        email: "",
        website: "",
        businessType: "",
        establishedDate: "",
        regulatoryBody: "",
        complianceOfficer: "",
        logoUrl: "",
        primaryColor: "#000000",
        secondaryColor: "#666666",
        ...updateData,
      };

      const companySettingsId = await ctx.db.insert("companySettings", defaultSettings);
      return await ctx.db.get(companySettingsId);
    }
  },
});

// ===================
// INITIALIZATION
// ===================

export const initializeDefaultSettings = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const defaultSettings = [
      {
        key: "base_currency",
        value: DEFAULT_BASE_CURRENCY,
        description: "Base currency for exchange rate calculations",
        category: "currency",
      },
      {
        key: "default_discount_percent",
        value: DEFAULT_DISCOUNT_PERCENT,
        description: "Default discount percentage for buying currency",
        category: "currency",
      },
      {
        key: "default_markup_percent",
        value: DEFAULT_MARKUP_PERCENT,
        description: "Default markup percentage for selling currency",
        category: "currency",
      },
      {
        key: "default_service_fee",
        value: DEFAULT_SERVICE_FEE,
        description: "Default service fee for transactions",
        category: "currency",
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", setting.key))
        .first();

      if (!existing) {
        await ctx.db.insert("settings", {
          ...setting,
          lastUpdated: Date.now(),
          updatedBy: userId,
        });
      }
    }
  },
});
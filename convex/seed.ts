import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";


// Seed initial currencies with the most common ones
async function seedInitialCurrencies(ctx: any) {
  const commonCurrencies = [
    {
      code: "USD",
      name: "US Dollar",
      country: "United States",
      flag: "🇺🇸",
      symbol: "$",
    },
    {
      code: "CAD",
      name: "Canadian Dollar",
      country: "Canada",
      flag: "🇨🇦",
      symbol: "$",
    },
    {
      code: "EUR",
      name: "Euro",
      country: "European Union",
      flag: "🇪🇺",
      symbol: "€",
    }
  ];

  const discountPercent = 2.5; // Default 2.5% discount for buying
  const markupPercent = 3.5;   // Default 3.5% markup for selling
  const baseCurrency = "USD";  // Default base currency (matches seedBasicSettings)

  // First, create all currencies with placeholder rates
  for (const currency of commonCurrencies) {
    // Base currency gets rate of 1.0, others get 0 as placeholder
    const marketRate = currency.code === baseCurrency ? 1.0 : 0;
    const buyRate = marketRate * (1 - discountPercent / 100);
    const sellRate = marketRate * (1 + markupPercent / 100);

    await ctx.db.insert("currencies", {
      code: currency.code,
      name: currency.name,
      country: currency.country,
      flag: currency.flag,
      symbol: currency.symbol,
      marketRate,
      discountPercent,
      markupPercent,
      buyRate,
      sellRate,
      manualBuyRate: false,
      manualSellRate: false,
      lastUpdated: Date.now(),
    });
  }
}

// Seed basic system settings
async function seedBasicSettings(ctx: any) {
  const defaultSettings = [
    {
      key: "baseCurrency",
      value: "USD",
      description: "Base currency for exchange rate calculations",
      category: "currency",
    },
    {
      key: "defaultDiscountPercent",
      value: 2.5,
      description: "Default discount percentage for currency purchases",
      category: "currency",
    },
    {
      key: "defaultMarkupPercent",
      value: 3.5,
      description: "Default markup percentage for currency sales",
      category: "currency",
    },
    {
      key: "companyName",
      value: "Your Currency Exchange",
      description: "Company name for reports and invoices",
      category: "company",
    },
    {
      key: "maxTransactionAmount",
      value: 10000,
      description: "Maximum transaction amount without additional approval",
      category: "compliance",
    }
  ];

  for (const setting of defaultSettings) {
    await ctx.db.insert("settings", {
      key: setting.key,
      value: setting.value,
      description: setting.description,
      category: setting.category,
      lastUpdated: Date.now(),
      updatedBy: undefined, // System generated
    });
  }
}

// Seed common ID document types
async function seedCommonIdTypes(ctx: any) {
  const commonIdTypes = [
    "Driver's License",
    "Passport",
    "National ID Card",
    "State ID Card",
    "Military ID",
    "Permanent Resident Card",
    "Birth Certificate",
    "Social Security Card",
    "Health Insurance Card",
    "Student ID",
    "Work Permit",
    "Visa"
  ];

  for (const idType of commonIdTypes) {
    await ctx.db.insert("idTypes", {
      name: idType,
      isActive: true,
      createdAt: Date.now(),
    });
  }
}

// Helper query to check if initial setup is needed
export const needsInitialSetup = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    // If no users exist, initial setup is needed
    return users.length === 0;
  },
});

// Called after first user signs up to grant admin privileges and seed data
export const completeInitialSetup = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    // Check if initial setup was already completed (any manager exists)
    const existingUsers = await ctx.db.query("users").collect();
    const hasManagerUser = existingUsers.some(user => user.isManager === true);

    if (hasManagerUser) {
      // If a manager already exists, just ensure the data is seeded
      const existingCurrencies = await ctx.db.query("currencies").collect();
      if (existingCurrencies.length === 0) {
        await seedInitialCurrencies(ctx);
      }

      const existingSettings = await ctx.db.query("settings").collect();
      if (existingSettings.length === 0) {
        await seedBasicSettings(ctx);
      }

      const existingIdTypes = await ctx.db.query("idTypes").collect();
      if (existingIdTypes.length === 0) {
        await seedCommonIdTypes(ctx);
      }

      return { success: true, message: "Initial setup already completed, data seeded if needed" };
    }

    // Get the current authenticated user (just signed up via Convex Auth)
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) {
      throw new Error("Must be authenticated to complete setup");
    }

    // Get the auth user details
    const authUser = await ctx.db.get(authUserId);
    if (!authUser) {
      throw new Error("Auth user not found");
    }

    // Create the business user record with admin privileges in the users table
    await ctx.db.insert("users", {
      // Link to the auth user
      authUserId: authUserId,
      email: authUser.email,
      fullName: authUser.name,

      // Admin privileges
      isManager: true,
      isComplianceOfficer: true,
      isTemplate: false,
      isActive: true,

      // Full Financial Controls
      canModifyExchangeRates: true,
      maxModificationIndividual: 100,
      maxModificationCorporate: 100,
      canEditFeesCommissions: true,
      canTransferBetweenAccounts: true,
      canReconcileAccounts: true,

      // Full Default Privileges
      defaultPrivileges: {
        view: true,
        create: true,
        modify: true,
        delete: true,
        print: true,
      },

      moduleExceptions: [],
      invitationStatus: "accepted",
      lastUpdated: Date.now(),
    });

    // Seed the initial data
    await seedInitialCurrencies(ctx);
    await seedBasicSettings(ctx);
    await seedCommonIdTypes(ctx);

    // Fetch live exchange rates for the seeded currencies
    console.log("Fetching live exchange rates for seeded currencies...");
    const rateResult = await fetchInitialExchangeRates(ctx);

    let setupMessage = "Initial setup completed successfully";
    if (rateResult.updated > 0) {
      setupMessage += `. Live exchange rates fetched for ${rateResult.updated} currencies`;
    }
    if (rateResult.failed > 0) {
      setupMessage += `. Note: ${rateResult.failed} currencies failed to get live rates (using placeholder rates)`;
    }

    return { success: true, message: setupMessage };
  },
});

// Fetch live exchange rates for all seeded currencies
async function fetchInitialExchangeRates(ctx: any) {
  try {
    // Use the existing bulk update functionality to fetch live rates
    const result = await ctx.runAction(api.currencies.bulkUpdateRates, {});

    console.log(`Exchange rates updated: ${result.updated} successful, ${result.failed} failed`);

    if (result.errors.length > 0) {
      console.warn("Some exchange rate updates failed:", result.errors);
    }

    return result;
  } catch (error) {
    console.error("Failed to fetch initial exchange rates:", error);
    // Don't throw - seeding should continue even if rate fetching fails
    return { updated: 0, failed: 0, errors: ["Failed to fetch exchange rates: " + (error instanceof Error ? error.message : "Unknown error")] };
  }
}
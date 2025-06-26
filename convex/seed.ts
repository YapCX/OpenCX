import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";


// Seed initial currencies with the most common ones
async function seedInitialCurrencies(ctx: any) {
  const commonCurrencies = [
    {
      code: "USD",
      name: "US Dollar", 
      country: "United States",
      flag: "🇺🇸",
      symbol: "$",
      marketRate: 1.0, // Base currency
    },
    {
      code: "CAD",
      name: "Canadian Dollar",
      country: "Canada", 
      flag: "🇨🇦",
      symbol: "$",
      marketRate: 1.35,
    },
    {
      code: "EUR",
      name: "Euro",
      country: "European Union",
      flag: "🇪🇺", 
      symbol: "€",
      marketRate: 0.85,
    },
    {
      code: "GBP",
      name: "British Pound",
      country: "United Kingdom",
      flag: "🇬🇧",
      symbol: "£", 
      marketRate: 0.75,
    },
    {
      code: "JPY",
      name: "Japanese Yen",
      country: "Japan",
      flag: "🇯🇵",
      symbol: "¥",
      marketRate: 150.0,
    },
    {
      code: "AUD", 
      name: "Australian Dollar",
      country: "Australia",
      flag: "🇦🇺",
      symbol: "$",
      marketRate: 1.50,
    },
    {
      code: "CHF",
      name: "Swiss Franc", 
      country: "Switzerland",
      flag: "🇨🇭",
      symbol: "Fr",
      marketRate: 0.90,
    },
    {
      code: "MXN",
      name: "Mexican Peso",
      country: "Mexico",
      flag: "🇲🇽", 
      symbol: "$",
      marketRate: 18.0,
    }
  ];

  const discountPercent = 2.5; // Default 2.5% discount for buying
  const markupPercent = 3.5;   // Default 3.5% markup for selling

  for (const currency of commonCurrencies) {
    const buyRate = currency.marketRate * (1 - discountPercent / 100);
    const sellRate = currency.marketRate * (1 + markupPercent / 100);

    await ctx.db.insert("currencies", {
      code: currency.code,
      name: currency.name,
      country: currency.country,
      flag: currency.flag,
      symbol: currency.symbol,
      marketRate: currency.marketRate,
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
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.length === 0;
  },
});

// Called after first user signs up to grant admin privileges and seed data
export const completeInitialSetup = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if any users already exist
    const existingUsers = await ctx.db.query("users").collect();
    
    if (existingUsers.length > 0) {
      throw new Error("Initial setup already completed");
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

    // Create the extended user record with admin privileges
    // Note: We can't set _id directly in insert, so we patch the auth user record instead
    await ctx.db.patch(authUserId, {
      // Link to the auth user data
      email: authUser.email,
      name: authUser.name,
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

    return { success: true };
  },
});
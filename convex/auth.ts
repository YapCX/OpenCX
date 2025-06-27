import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query } from "./_generated/server";
import { api } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    afterUserCreatedOrUpdated: async (ctx, args) => {
      // Check if any manager users exist in our business users table
      const allUsers = await ctx.db.query("users").collect();
      const managersExist = allUsers.some(user => user.isManager === true);

      // If no managers exist, this is the first user - create their business user record with admin privileges
      if (!managersExist && args.userId) {
        // Get the auth user details from the auth system
        const authUser = await ctx.db.get(args.userId);
        if (!authUser) {
          throw new Error("Auth user not found");
        }

        // Create business user record in our users table
        await ctx.db.insert("users", {
          // Link to auth user
          authUserId: args.userId,
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

        // Seed initial currencies
        const commonCurrencies = [
          { code: "USD", name: "US Dollar", country: "United States", flag: "🇺🇸", symbol: "$" },
          { code: "CAD", name: "Canadian Dollar", country: "Canada", flag: "🇨🇦", symbol: "$" },
          { code: "EUR", name: "Euro", country: "European Union", flag: "🇪🇺", symbol: "€" },
          { code: "GBP", name: "British Pound", country: "United Kingdom", flag: "🇬🇧", symbol: "£" },
          { code: "JPY", name: "Japanese Yen", country: "Japan", flag: "🇯🇵", symbol: "¥" },
          { code: "AUD", name: "Australian Dollar", country: "Australia", flag: "🇦🇺", symbol: "$" },
          { code: "CHF", name: "Swiss Franc", country: "Switzerland", flag: "🇨🇭", symbol: "Fr" },
          { code: "MXN", name: "Mexican Peso", country: "Mexico", flag: "🇲🇽", symbol: "$" }
        ];

        const discountPercent = 2.5;
        const markupPercent = 3.5;
        const baseCurrency = "USD"; // Default base currency (matches seedBasicSettings)

        for (const currency of commonCurrencies) {
          // Base currency gets rate of 1.0, others get 0 as placeholder
          const marketRate = currency.code === baseCurrency ? 1.0 : 0;

          await ctx.db.insert("currencies", {
            code: currency.code,
            name: currency.name,
            country: currency.country,
            flag: currency.flag,
            symbol: currency.symbol,
            marketRate,
            discountPercent,
            markupPercent,
            buyRate: marketRate * (1 - discountPercent / 100),
            sellRate: marketRate * (1 + markupPercent / 100),
            manualBuyRate: false,
            manualSellRate: false,
            lastUpdated: Date.now(),
          });
        }

        // Fetch live exchange rates for the seeded currencies
        try {
          // Schedule the bulk update to fetch live rates after a short delay
          await ctx.scheduler.runAfter(1000, api.currencies.bulkUpdateRates, {});
          console.log("Scheduled live exchange rate updates for seeded currencies");
        } catch (error) {
          console.warn("Failed to schedule exchange rate updates:", error);
          // Don't throw - user creation should continue even if rate fetching fails
        }

        // Seed basic settings
        const defaultSettings = [
          { key: "baseCurrency", value: "USD", description: "Base currency for exchange rate calculations", category: "currency" },
          { key: "defaultDiscountPercent", value: 2.5, description: "Default discount percentage for currency purchases", category: "currency" },
          { key: "defaultMarkupPercent", value: 3.5, description: "Default markup percentage for currency sales", category: "currency" },
          { key: "companyName", value: "Your Currency Exchange", description: "Company name for reports and invoices", category: "company" },
          { key: "maxTransactionAmount", value: 10000, description: "Maximum transaction amount without additional approval", category: "compliance" }
        ];

        for (const setting of defaultSettings) {
          await ctx.db.insert("settings", {
            key: setting.key,
            value: setting.value,
            description: setting.description,
            category: setting.category,
            lastUpdated: Date.now(),
            updatedBy: args.userId,
          });
        }

        // Seed common ID types
        const commonIdTypes = [
          "Driver's License", "Passport", "National ID Card", "State ID Card",
          "Military ID", "Permanent Resident Card", "Birth Certificate",
          "Social Security Card", "Health Insurance Card", "Student ID",
          "Work Permit", "Visa"
        ];

        for (const idType of commonIdTypes) {
          await ctx.db.insert("idTypes", {
            name: idType,
            isActive: true,
            createdAt: Date.now(),
          });
        }
      }
    },
  },
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) {
      return null;
    }

    // Get the business user record linked to this auth user
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .first();

    if (!user) {
      return null;
    }

    // Return user with permissions info, excluding sensitive data
    return {
      ...user,
      // Include permissions for UI logic
      isManager: user.isManager || false,
      isComplianceOfficer: user.isComplianceOfficer || false,
      isActive: user.isActive !== false,
      defaultPrivileges: user.defaultPrivileges || {
        view: false,
        create: false,
        modify: false,
        delete: false,
        print: false,
      },
    };
  },
});

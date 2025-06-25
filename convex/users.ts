import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

async function requireManagerOrCompliance(ctx: any) {
  const userId = await requireAuth(ctx);
  // For now, allow all authenticated users to manage system users
  // In production, you'd check against systemUsers table or implement role checking
  return userId;
}

export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    let users = await ctx.db.query("systemUsers").collect();

    if (!args.includeInactive) {
      users = users.filter(user => user.isActive);
    }

    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      users = users.filter(user =>
        user.username.toLowerCase().includes(searchLower) ||
        (user.fullName && user.fullName.toLowerCase().includes(searchLower))
      );
    }

    return users.map(user => ({
      ...user,
      password: undefined, // Never return passwords
    }));
  },
});

export const get = query({
  args: { id: v.id("systemUsers") },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    const user = await ctx.db.get(args.id);
    if (!user) return null;

    return {
      ...user,
      password: undefined, // Never return passwords
    };
  },
});

export const create = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    passwordReminder: v.string(),
    fullName: v.optional(v.string()),
    isManager: v.boolean(),
    isComplianceOfficer: v.boolean(),
    isTemplate: v.boolean(),
    isActive: v.boolean(),

    // Financial Controls
    canModifyExchangeRates: v.boolean(),
    maxModificationIndividual: v.optional(v.number()),
    maxModificationCorporate: v.optional(v.number()),
    canEditFeesCommissions: v.boolean(),
    canTransferBetweenAccounts: v.boolean(),
    canReconcileAccounts: v.boolean(),

    // Default Privileges
    defaultPrivileges: v.object({
      view: v.boolean(),
      create: v.boolean(),
      modify: v.boolean(),
      delete: v.boolean(),
      print: v.boolean(),
    }),

    // Module-specific exceptions
    moduleExceptions: v.array(v.object({
      moduleName: v.string(),
      privileges: v.object({
        view: v.boolean(),
        create: v.boolean(),
        modify: v.boolean(),
        delete: v.boolean(),
        print: v.boolean(),
      }),
    })),
  },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    // Check if username already exists
    const existingUser = await ctx.db
      .query("systemUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUser) {
      throw new Error("Username already exists");
    }

    const userId = await ctx.db.insert("systemUsers", {
      username: args.username,
      password: args.password,
      passwordReminder: args.passwordReminder,
      fullName: args.fullName,
      isManager: args.isManager,
      isComplianceOfficer: args.isComplianceOfficer,
      isTemplate: args.isTemplate,
      isActive: args.isActive,

      // Financial Controls
      canModifyExchangeRates: args.canModifyExchangeRates,
      maxModificationIndividual: args.maxModificationIndividual,
      maxModificationCorporate: args.maxModificationCorporate,
      canEditFeesCommissions: args.canEditFeesCommissions,
      canTransferBetweenAccounts: args.canTransferBetweenAccounts,
      canReconcileAccounts: args.canReconcileAccounts,

      // Default Privileges
      defaultPrivileges: args.defaultPrivileges,

      // Module-specific exceptions
      moduleExceptions: args.moduleExceptions,

      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    return userId;
  },
});

export const update = mutation({
  args: {
    id: v.id("systemUsers"),
    username: v.string(),
    passwordReminder: v.string(),
    fullName: v.optional(v.string()),
    isManager: v.boolean(),
    isComplianceOfficer: v.boolean(),
    isTemplate: v.boolean(),
    isActive: v.boolean(),

    // Financial Controls
    canModifyExchangeRates: v.boolean(),
    maxModificationIndividual: v.optional(v.number()),
    maxModificationCorporate: v.optional(v.number()),
    canEditFeesCommissions: v.boolean(),
    canTransferBetweenAccounts: v.boolean(),
    canReconcileAccounts: v.boolean(),

    // Default Privileges
    defaultPrivileges: v.object({
      view: v.boolean(),
      create: v.boolean(),
      modify: v.boolean(),
      delete: v.boolean(),
      print: v.boolean(),
    }),

    // Module-specific exceptions
    moduleExceptions: v.array(v.object({
      moduleName: v.string(),
      privileges: v.object({
        view: v.boolean(),
        create: v.boolean(),
        modify: v.boolean(),
        delete: v.boolean(),
        print: v.boolean(),
      }),
    })),
  },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    const { id, ...updateData } = args;

    // Check if username already exists (excluding current user)
    const existingUser = await ctx.db
      .query("systemUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUser && existingUser._id !== id) {
      throw new Error("Username already exists");
    }

    await ctx.db.patch(id, {
      ...updateData,
      lastUpdated: Date.now(),
    });

    return id;
  },
});

export const resetPassword = mutation({
  args: {
    id: v.id("systemUsers"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    await ctx.db.patch(args.id, {
      password: args.newPassword,
      lastUpdated: Date.now(),
    });
  },
});

export const duplicate = mutation({
  args: {
    sourceId: v.id("systemUsers"),
    newUsername: v.string(),
    newPassword: v.string(),
    newPasswordReminder: v.string(),
    newFullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    const sourceUser = await ctx.db.get(args.sourceId);
    if (!sourceUser) {
      throw new Error("Source user not found");
    }

    // Check if new username already exists
    const existingUser = await ctx.db
      .query("systemUsers")
      .withIndex("by_username", (q) => q.eq("username", args.newUsername))
      .first();

    if (existingUser) {
      throw new Error("Username already exists");
    }

    const newUserId = await ctx.db.insert("systemUsers", {
      username: args.newUsername,
      password: args.newPassword,
      passwordReminder: args.newPasswordReminder,
      fullName: args.newFullName,
      isManager: sourceUser.isManager,
      isComplianceOfficer: sourceUser.isComplianceOfficer,
      isTemplate: false, // New users are not templates
      isActive: false, // New users start inactive

      // Copy financial controls
      canModifyExchangeRates: sourceUser.canModifyExchangeRates,
      maxModificationIndividual: sourceUser.maxModificationIndividual,
      maxModificationCorporate: sourceUser.maxModificationCorporate,
      canEditFeesCommissions: sourceUser.canEditFeesCommissions,
      canTransferBetweenAccounts: sourceUser.canTransferBetweenAccounts,
      canReconcileAccounts: sourceUser.canReconcileAccounts,

      // Copy privileges
      defaultPrivileges: sourceUser.defaultPrivileges,
      moduleExceptions: sourceUser.moduleExceptions,

      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    return newUserId;
  },
});

export const remove = mutation({
  args: { id: v.id("systemUsers") },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);
    await ctx.db.delete(args.id);
  },
});

export const getTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireManagerOrCompliance(ctx);

    const templates = await ctx.db
      .query("systemUsers")
      .withIndex("by_template", (q) => q.eq("isTemplate", true))
      .collect();

    return templates.map(template => ({
      ...template,
      password: undefined,
    }));
  },
});

export const getModules = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    // Return available modules for privilege management
    return [
      "Customers",
      "Currencies",
      "Denominations",
      "Invoices",
      "Reports",
      "AML",
      "Settings",
    ];
  },
});

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

async function requireManager(ctx: any) {
  const userId = await requireAuth(ctx);
  const user = await ctx.db.get(userId);
  if (!user?.isManager) {
    throw new Error("Manager permissions required");
  }
  return { userId, user };
}

async function requireManagerOrCompliance(ctx: any) {
  const userId = await requireAuth(ctx);
  const user = await ctx.db.get(userId);
  if (!user?.isManager && !user?.isComplianceOfficer) {
    throw new Error("Manager or Compliance Officer permissions required");
  }
  return { userId, user };
}

export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    let users = await ctx.db.query("users").collect();

    // Show all authenticated users (those with email addresses)
    // Filter out any incomplete/invalid user records
    users = users.filter(user => user.email);

    if (!args.includeInactive) {
      users = users.filter(user => user.isActive !== false);
    }

    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      users = users.filter(user =>
        (user.fullName && user.fullName.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower))
      );
    }

    return users.map(user => ({
      ...user,
      // Never return sensitive auth data
      password: undefined,
    }));
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    const user = await ctx.db.get(args.id);
    if (!user) return null;

    return {
      ...user,
      // Never return sensitive auth data
      password: undefined,
    };
  },
});

export const create = mutation({
  args: {
    email: v.string(),
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
    const { userId: creatorId } = await requireManager(ctx);

    // Check if email already exists
    const existingByEmail = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingByEmail) {
      throw new Error("Email already exists");
    }

    // Generate invitation token and expiration
    const invitationToken = crypto.randomUUID();
    const invitationExpiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user record with invitation status
    const userId = await ctx.db.insert("users", {
      // Auth fields
      email: args.email,
      
      // System user fields
      fullName: args.fullName,
      isManager: args.isManager,
      isComplianceOfficer: args.isComplianceOfficer,
      isTemplate: args.isTemplate,
      isActive: false, // User starts inactive until they accept invitation

      // Financial Controls
      canModifyExchangeRates: args.canModifyExchangeRates,
      maxModificationIndividual: args.maxModificationIndividual,
      maxModificationCorporate: args.maxModificationCorporate,
      canEditFeesCommissions: args.canEditFeesCommissions,
      canTransferBetweenAccounts: args.canTransferBetweenAccounts,
      canReconcileAccounts: args.canReconcileAccounts,

      // Default Privileges
      defaultPrivileges: args.defaultPrivileges,
      moduleExceptions: args.moduleExceptions,

      // Invitation tracking
      invitationStatus: "pending",
      invitationToken,
      invitationSentAt: Date.now(),
      invitationExpiresAt,

      // Audit fields
      createdBy: creatorId,
      lastUpdated: Date.now(),
    });


    return { userId, invitationToken };
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
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
    await requireManager(ctx);

    const { id, ...updateData } = args;

    await ctx.db.patch(id, {
      ...updateData,
      lastUpdated: Date.now(),
    });

    return id;
  },
});

export const resetPassword = mutation({
  args: {
    id: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx);

    // Password reset should be handled through Convex Auth's password reset flow
    // This mutation is a placeholder for future integration
    throw new Error("Password reset should be handled through Convex Auth's password reset flow");
  },
});

export const duplicate = mutation({
  args: {
    sourceId: v.id("users"),
    newEmail: v.string(),
    newFullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: creatorId } = await requireManager(ctx);

    const sourceUser = await ctx.db.get(args.sourceId);
    if (!sourceUser) {
      throw new Error("Source user not found");
    }

    // Check if new email already exists
    const existingByEmail = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.newEmail))
      .first();

    if (existingByEmail) {
      throw new Error("Email already exists");
    }

    // Generate invitation token and expiration for the duplicated user
    const invitationToken = crypto.randomUUID();
    const invitationExpiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    const newUserId = await ctx.db.insert("users", {
      // Auth fields
      email: args.newEmail,
      
      // New user fields
      fullName: args.newFullName,
      
      // Copy from source user
      isManager: sourceUser.isManager || false,
      isComplianceOfficer: sourceUser.isComplianceOfficer || false,
      isTemplate: false, // New users are not templates
      isActive: false, // New users start inactive until invitation accepted

      // Copy financial controls
      canModifyExchangeRates: sourceUser.canModifyExchangeRates || false,
      maxModificationIndividual: sourceUser.maxModificationIndividual,
      maxModificationCorporate: sourceUser.maxModificationCorporate,
      canEditFeesCommissions: sourceUser.canEditFeesCommissions || false,
      canTransferBetweenAccounts: sourceUser.canTransferBetweenAccounts || false,
      canReconcileAccounts: sourceUser.canReconcileAccounts || false,

      // Copy privileges
      defaultPrivileges: sourceUser.defaultPrivileges || {
        view: false,
        create: false,
        modify: false,
        delete: false,
        print: false,
      },
      moduleExceptions: sourceUser.moduleExceptions || [],

      // Invitation tracking
      invitationStatus: "pending",
      invitationToken,
      invitationSentAt: Date.now(),
      invitationExpiresAt,

      // Audit fields
      createdBy: creatorId,
      lastUpdated: Date.now(),
    });


    return { userId: newUserId, invitationToken };
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await requireManager(ctx);
    
    // Note: This will delete the entire user including auth data
    // In production, you might want to just deactivate instead
    await ctx.db.delete(args.id);
  },
});

export const getTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireManagerOrCompliance(ctx);

    const templates = await ctx.db
      .query("users")
      .withIndex("by_template", (q) => q.eq("isTemplate", true))
      .collect();

    return templates.map(template => ({
      ...template,
      // Never return sensitive data
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

// Invitation acceptance flow
export const validateInvitation = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_invitation_token", (q) => q.eq("invitationToken", args.token))
      .first();

    if (!user) {
      throw new Error("Invalid invitation token");
    }

    if (user.invitationStatus !== "pending") {
      throw new Error("Invitation has already been used or expired");
    }

    if (Date.now() > (user.invitationExpiresAt || 0)) {
      throw new Error("Invitation has expired");
    }

    return {
      email: user.email,
      fullName: user.fullName,
    };
  },
});

export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_invitation_token", (q) => q.eq("invitationToken", args.token))
      .first();

    if (!user) {
      throw new Error("Invalid invitation token");
    }

    if (user.invitationStatus !== "pending") {
      throw new Error("Invitation has already been used or expired");
    }

    if (Date.now() > (user.invitationExpiresAt || 0)) {
      throw new Error("Invitation has expired");
    }

    if (!user.email) {
      throw new Error("User email is required for account creation");
    }

    // Update user status to mark invitation as accepted
    // The actual auth account creation will be handled by the client
    // using Convex Auth's signIn with "signUp" flow
    await ctx.db.patch(user._id, {
      invitationStatus: "accepted",
      isActive: true,
      invitationToken: undefined, // Clear the token for security
      lastUpdated: Date.now(),
    });

    return { success: true, email: user.email, userId: user._id };
  },
});

export const resendInvitation = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireManager(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.invitationStatus !== "pending") {
      throw new Error("User has already accepted invitation or invitation has expired");
    }

    // Generate new token and extend expiration
    const newToken = crypto.randomUUID();
    const newExpiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    await ctx.db.patch(args.userId, {
      invitationToken: newToken,
      invitationSentAt: Date.now(),
      invitationExpiresAt: newExpiresAt,
      lastUpdated: Date.now(),
    });


    return { success: true, token: newToken };
  },
});

// New function to get current user's permissions
export const getCurrentUserPermissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const user = await ctx.db.get(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    return {
      isManager: user.isManager || false,
      isComplianceOfficer: user.isComplianceOfficer || false,
      isActive: user.isActive !== false,
      canModifyExchangeRates: user.canModifyExchangeRates || false,
      maxModificationIndividual: user.maxModificationIndividual,
      maxModificationCorporate: user.maxModificationCorporate,
      canEditFeesCommissions: user.canEditFeesCommissions || false,
      canTransferBetweenAccounts: user.canTransferBetweenAccounts || false,
      canReconcileAccounts: user.canReconcileAccounts || false,
      defaultPrivileges: user.defaultPrivileges || {
        view: false,
        create: false,
        modify: false,
        delete: false,
        print: false,
      },
      moduleExceptions: user.moduleExceptions || [],
    };
  },
});


import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import defaults from "../config/defaults.json";

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

// Generate random invitation token
function generateInvitationToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Get current logged-in user
export const getCurrentUser = query({
  handler: async (ctx) => {
    const clerkUserId = await requireAuth(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    return user;
  },
});

// Get current user permissions for UI logic
export const getCurrentUserPermissions = query({
  handler: async (ctx) => {
    try {
      const clerkUserId = await requireAuth(ctx);
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", clerkUserId))
        .first();

      if (!user) {
        return null;
      }

      return {
        isManager: user.isManager,
        isComplianceOfficer: user.isComplianceOfficer,
        isActive: user.isActive,
        defaultPrivileges: user.defaultPrivileges,
        moduleExceptions: user.moduleExceptions || [],
        canModifyExchangeRates: user.canModifyExchangeRates,
        canEditFeesCommissions: user.canEditFeesCommissions,
        canTransferBetweenAccounts: user.canTransferBetweenAccounts,
        canReconcileAccounts: user.canReconcileAccounts,
      };
    } catch {
      return null;
    }
  },
});

// List all users (Manager/Compliance access only)
export const list = query({
  args: {
    searchTerm: v.optional(v.string()),
    includeInactive: v.optional(v.boolean()),
    templatesOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    let users = await ctx.db.query("users").collect();

    // Filter by search term
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      users = users.filter(user =>
        (user.fullName?.toLowerCase().includes(searchLower)) ||
        (user.email?.toLowerCase().includes(searchLower))
      );
    }

    // Filter by active status
    if (!args.includeInactive) {
      users = users.filter(user => user.isActive);
    }

    // Filter templates only
    if (args.templatesOnly) {
      users = users.filter(user => user.isTemplate);
    }

    return users.sort((a, b) =>
      (a.fullName || a.email).localeCompare(b.fullName || b.email)
    );
  },
});

// Get single user by ID (Manager/Compliance access only)
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await requireManagerOrCompliance(ctx);

    return await ctx.db.get(args.id);
  },
});

// Create new user with invitation (Manager access only)
export const create = mutation({
  args: {
    email: v.string(),
    fullName: v.optional(v.string()),
    isManager: v.optional(v.boolean()),
    isComplianceOfficer: v.optional(v.boolean()),
    isTemplate: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    canModifyExchangeRates: v.optional(v.boolean()),
    maxModificationIndividual: v.optional(v.number()),
    maxModificationCorporate: v.optional(v.number()),
    canEditFeesCommissions: v.optional(v.boolean()),
    canTransferBetweenAccounts: v.optional(v.boolean()),
    canReconcileAccounts: v.optional(v.boolean()),
    defaultPrivileges: v.optional(v.object({
      view: v.boolean(),
      create: v.boolean(),
      modify: v.boolean(),
      delete: v.boolean(),
      print: v.boolean(),
    })),
    moduleExceptions: v.optional(v.array(v.object({
      moduleName: v.string(),
      privileges: v.object({
        view: v.boolean(),
        create: v.boolean(),
        modify: v.boolean(),
        delete: v.boolean(),
        print: v.boolean(),
      }),
    }))),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireManager(ctx);

    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const now = Date.now();
    const invitationToken = generateInvitationToken();
    const invitationExpiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days

    // Set default values
    const defaultPrivileges = args.defaultPrivileges || {
      view: true,
      create: false,
      modify: false,
      delete: false,
      print: true,
    };

    const userId = await ctx.db.insert("users", {
      // Clerk integration - initially empty until they accept invitation
      clerkUserId: "", // Will be set when invitation is accepted
      email: args.email,
      fullName: args.fullName || "",

      // Roles and permissions
      isManager: args.isManager || false,
      isComplianceOfficer: args.isComplianceOfficer || false,
      isTemplate: args.isTemplate || false,
      isActive: args.isActive !== false, // Default to active

      // Financial controls
      canModifyExchangeRates: args.canModifyExchangeRates || false,
      maxModificationIndividual: args.maxModificationIndividual,
      maxModificationCorporate: args.maxModificationCorporate,
      canEditFeesCommissions: args.canEditFeesCommissions || false,
      canTransferBetweenAccounts: args.canTransferBetweenAccounts || false,
      canReconcileAccounts: args.canReconcileAccounts || false,

      // Permissions
      defaultPrivileges,
      moduleExceptions: args.moduleExceptions || [],

      // Invitation system
      invitationStatus: "pending",
      invitationToken,
      invitationSentAt: now,
      invitationExpiresAt,

      // Metadata
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.clerkUserId,
      lastUpdatedBy: currentUser.clerkUserId,
    });

    return { userId, invitationToken };
  },
});

// Update user (Manager access only)
export const update = mutation({
  args: {
    id: v.id("users"),
    fullName: v.optional(v.string()),
    isManager: v.optional(v.boolean()),
    isComplianceOfficer: v.optional(v.boolean()),
    isTemplate: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    canModifyExchangeRates: v.optional(v.boolean()),
    maxModificationIndividual: v.optional(v.number()),
    maxModificationCorporate: v.optional(v.number()),
    canEditFeesCommissions: v.optional(v.boolean()),
    canTransferBetweenAccounts: v.optional(v.boolean()),
    canReconcileAccounts: v.optional(v.boolean()),
    defaultPrivileges: v.optional(v.object({
      view: v.boolean(),
      create: v.boolean(),
      modify: v.boolean(),
      delete: v.boolean(),
      print: v.boolean(),
    })),
    moduleExceptions: v.optional(v.array(v.object({
      moduleName: v.string(),
      privileges: v.object({
        view: v.boolean(),
        create: v.boolean(),
        modify: v.boolean(),
        delete: v.boolean(),
        print: v.boolean(),
      }),
    }))),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireManager(ctx);

    const updateData: any = {
      updatedAt: Date.now(),
      lastUpdatedBy: currentUser.clerkUserId,
    };

    // Add fields that are provided
    if (args.fullName !== undefined) updateData.fullName = args.fullName;
    if (args.isManager !== undefined) updateData.isManager = args.isManager;
    if (args.isComplianceOfficer !== undefined) updateData.isComplianceOfficer = args.isComplianceOfficer;
    if (args.isTemplate !== undefined) updateData.isTemplate = args.isTemplate;
    if (args.isActive !== undefined) updateData.isActive = args.isActive;
    if (args.canModifyExchangeRates !== undefined) updateData.canModifyExchangeRates = args.canModifyExchangeRates;
    if (args.maxModificationIndividual !== undefined) updateData.maxModificationIndividual = args.maxModificationIndividual;
    if (args.maxModificationCorporate !== undefined) updateData.maxModificationCorporate = args.maxModificationCorporate;
    if (args.canEditFeesCommissions !== undefined) updateData.canEditFeesCommissions = args.canEditFeesCommissions;
    if (args.canTransferBetweenAccounts !== undefined) updateData.canTransferBetweenAccounts = args.canTransferBetweenAccounts;
    if (args.canReconcileAccounts !== undefined) updateData.canReconcileAccounts = args.canReconcileAccounts;
    if (args.defaultPrivileges !== undefined) updateData.defaultPrivileges = args.defaultPrivileges;
    if (args.moduleExceptions !== undefined) updateData.moduleExceptions = args.moduleExceptions;

    await ctx.db.patch(args.id, updateData);

    return await ctx.db.get(args.id);
  },
});

// Delete user (Manager access only)
export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await requireManager(ctx);

    await ctx.db.delete(args.id);
  },
});

// Duplicate user for quick setup (Manager access only)
export const duplicate = mutation({
  args: {
    sourceUserId: v.id("users"),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireManager(ctx);

    // Get source user
    const sourceUser = await ctx.db.get(args.sourceUserId);
    if (!sourceUser) {
      throw new Error("Source user not found");
    }

    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const now = Date.now();
    const invitationToken = generateInvitationToken();
    const invitationExpiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days

    const userId = await ctx.db.insert("users", {
      // New user details
      clerkUserId: "", // Will be set when invitation is accepted
      email: args.email,
      fullName: args.fullName || "",

      // Copy all permissions and settings from source user
      isManager: sourceUser.isManager,
      isComplianceOfficer: sourceUser.isComplianceOfficer,
      isTemplate: sourceUser.isTemplate,
      isActive: true, // New user starts active

      // Copy financial controls
      canModifyExchangeRates: sourceUser.canModifyExchangeRates,
      maxModificationIndividual: sourceUser.maxModificationIndividual,
      maxModificationCorporate: sourceUser.maxModificationCorporate,
      canEditFeesCommissions: sourceUser.canEditFeesCommissions,
      canTransferBetweenAccounts: sourceUser.canTransferBetweenAccounts,
      canReconcileAccounts: sourceUser.canReconcileAccounts,

      // Copy permissions
      defaultPrivileges: sourceUser.defaultPrivileges,
      moduleExceptions: sourceUser.moduleExceptions || [],

      // New invitation
      invitationStatus: "pending",
      invitationToken,
      invitationSentAt: now,
      invitationExpiresAt,

      // Metadata
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.clerkUserId,
      lastUpdatedBy: currentUser.clerkUserId,
    });

    return { userId, invitationToken };
  },
});

// Get template users for quick setup
export const getTemplates = query({
  handler: async (ctx) => {
    await requireManager(ctx);

    return await ctx.db
      .query("users")
      .withIndex("by_is_template", (q: any) => q.eq("isTemplate", true))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Validate invitation token
export const validateInvitation = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_invitation_token", (q: any) => q.eq("invitationToken", args.token))
      .first();

    if (!user) {
      return { valid: false, error: "Invalid invitation token" };
    }

    if (user.invitationStatus !== "pending") {
      return { valid: false, error: "Invitation already processed" };
    }

    if (user.invitationExpiresAt && Date.now() > user.invitationExpiresAt) {
      return { valid: false, error: "Invitation has expired" };
    }

    return {
      valid: true,
      user: {
        email: user.email,
        fullName: user.fullName,
      }
    };
  },
});

// Accept invitation and link to Clerk account
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_invitation_token", (q: any) => q.eq("invitationToken", args.token))
      .first();

    if (!user) {
      throw new Error("Invalid invitation token");
    }

    if (user.invitationStatus !== "pending") {
      throw new Error("Invitation already processed");
    }

    if (user.invitationExpiresAt && Date.now() > user.invitationExpiresAt) {
      throw new Error("Invitation has expired");
    }

    // Update user with Clerk ID and accept invitation
    await ctx.db.patch(user._id, {
      clerkUserId: args.clerkUserId,
      invitationStatus: "accepted",
      updatedAt: Date.now(),
      lastUpdatedBy: args.clerkUserId,
    });

    return await ctx.db.get(user._id);
  },
});

// Resend invitation (Manager access only)
export const resendInvitation = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireManager(ctx);

    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.invitationStatus !== "pending") {
      throw new Error("User invitation not in pending status");
    }

    const now = Date.now();
    const newToken = generateInvitationToken();
    const newExpiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days

    await ctx.db.patch(args.id, {
      invitationToken: newToken,
      invitationSentAt: now,
      invitationExpiresAt: newExpiresAt,
      updatedAt: now,
      lastUpdatedBy: currentUser.clerkUserId,
    });

    return { invitationToken: newToken };
  },
});

// Get available modules for permission configuration
export const getModules = query({
  handler: async (ctx) => {
    await requireManager(ctx);

    return [
      "customers",
      "currencies",
      "transactions",
      "tills",
      "denominations",
      "users",
      "settings",
      "reports",
    ];
  },
});

// Sync user data from Clerk (for webhooks or manual sync)
export const syncFromClerk = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing user by Clerk ID
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    const now = Date.now();

    if (user) {
      // Update existing user
      await ctx.db.patch(user._id, {
        email: args.email,
        fullName: args.fullName || user.fullName,
        updatedAt: now,
        lastUpdatedBy: args.clerkUserId,
      });
      return await ctx.db.get(user._id);
    } else {
      // Check if this is a first-time setup (no users exist)
      const existingUsers = await ctx.db.query("users").collect();
      const isFirstUser = existingUsers.length === 0;

      if (isFirstUser) {
        // Create first admin user
        const userData = {
          clerkUserId: args.clerkUserId,
          email: args.email,
          fullName: args.fullName || "",

          // First user becomes admin - use defaults from config
          isManager: defaults.adminUser.isManager,
          isComplianceOfficer: defaults.adminUser.isComplianceOfficer,
          isTemplate: defaults.adminUser.isTemplate,
          isActive: defaults.adminUser.isActive,

          // Default financial controls from config
          canModifyExchangeRates: defaults.adminUser.canModifyExchangeRates,
          maxModificationIndividual: defaults.adminUser.maxModificationIndividual,
          maxModificationCorporate: defaults.adminUser.maxModificationCorporate,
          canEditFeesCommissions: defaults.adminUser.canEditFeesCommissions,
          canTransferBetweenAccounts: defaults.adminUser.canTransferBetweenAccounts,
          canReconcileAccounts: defaults.adminUser.canReconcileAccounts,

          // Default permissions from config
          defaultPrivileges: defaults.adminUser.defaultPrivileges,
          moduleExceptions: defaults.adminUser.moduleExceptions,

          // Invitation status (first user doesn't need invitation)
          invitationStatus: "accepted" as "pending" | "accepted" | "expired",
          invitationToken: undefined,
          invitationSentAt: undefined,
          invitationExpiresAt: undefined,

          // Metadata
          createdAt: now,
          updatedAt: now,
          createdBy: args.clerkUserId,
          lastUpdatedBy: args.clerkUserId,
        };

        const userId = await ctx.db.insert("users", userData);
        
        // System defaults are initialized via individual CRUD functions as needed
        console.log("First user created - system defaults available via CRUD functions");
        
        return await ctx.db.get(userId);
      } else {
        // For subsequent users, check if they have a pending invitation
        const invitedUser = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", args.email))
          .first();

        if (invitedUser && invitedUser.invitationStatus === "pending" && !invitedUser.clerkUserId) {
          // Link the invitation to this Clerk user
          await ctx.db.patch(invitedUser._id, {
            clerkUserId: args.clerkUserId,
            fullName: args.fullName || invitedUser.fullName,
            invitationStatus: "accepted",
            updatedAt: now,
            lastUpdatedBy: args.clerkUserId,
          });
          return await ctx.db.get(invitedUser._id);
        } else {
          // No invitation found - reject the signup
          throw new Error("No invitation found for this email address. Please contact an administrator for access.");
        }
      }
    }
  },
});
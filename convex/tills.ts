import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const tills = await ctx.db.query("tills").collect();
    
    // Get current user info for each till
    const tillsWithUserInfo = await Promise.all(
      tills.map(async (till) => {
        let currentUser = null;
        if (till.currentUserId) {
          // In a real app, you might want to get user info from Clerk
          // For now, we'll just store the user ID
          currentUser = { id: till.currentUserId };
        }
        return {
          ...till,
          currentUser,
        };
      })
    );

    return tillsWithUserInfo;
  },
});

export const create = mutation({
  args: {
    tillId: v.string(),
    tillName: v.string(),
    reserveForAdmin: v.boolean(),
    shareTill: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Check if tillId already exists
    const existingTill = await ctx.db
      .query("tills")
      .withIndex("by_till_id", (q) => q.eq("tillId", args.tillId))
      .unique();

    if (existingTill) {
      throw new Error(`Till with ID ${args.tillId} already exists`);
    }

    const now = Date.now();
    
    // Create the till
    const tillDocId = await ctx.db.insert("tills", {
      tillId: args.tillId,
      tillName: args.tillName,
      reserveForAdmin: args.reserveForAdmin,
      shareTill: args.shareTill,
      isActive: true,
      createdAt: now,
      lastUpdated: now,
      createdBy: userId,
    });

    // Create cash ledger accounts for all active currencies
    const currencies = await ctx.db.query("currencies").collect();
    
    for (const currency of currencies) {
      await ctx.db.insert("cashLedgerAccounts", {
        accountName: `Cash-${currency.code}-${args.tillId}`,
        tillId: args.tillId,
        currencyCode: currency.code,
        balance: 0,
        isActive: true,
        createdAt: now,
        lastUpdated: now,
      });
    }

    return tillDocId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tills"),
    tillName: v.string(),
    reserveForAdmin: v.boolean(),
    shareTill: v.boolean(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const { id, ...updates } = args;

    return await ctx.db.patch(id, {
      ...updates,
      lastUpdated: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("tills") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const till = await ctx.db.get(args.id);
    if (!till) {
      throw new Error("Till not found");
    }

    // Check if till is currently in use
    if (till.currentUserId) {
      throw new Error("Cannot delete till that is currently in use");
    }

    // Check if till has any active sessions
    const activeSessions = await ctx.db
      .query("tillSessions")
      .withIndex("by_till_id", (q) => q.eq("tillId", till.tillId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (activeSessions.length > 0) {
      throw new Error("Cannot delete till with active sessions");
    }

    // Remove associated cash ledger accounts
    const cashAccounts = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_id", (q) => q.eq("tillId", till.tillId))
      .collect();

    for (const account of cashAccounts) {
      await ctx.db.delete(account._id);
    }

    return await ctx.db.delete(args.id);
  },
});

export const signIn = mutation({
  args: { tillId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Get the till
    const till = await ctx.db
      .query("tills")
      .withIndex("by_till_id", (q) => q.eq("tillId", args.tillId))
      .unique();

    if (!till) {
      throw new Error("Till not found");
    }

    if (!till.isActive) {
      throw new Error("Till is not active");
    }

    // Check if user is already signed into another till
    const currentTill = await ctx.db
      .query("tills")
      .withIndex("by_current_user", (q) => q.eq("currentUserId", userId))
      .unique();

    if (currentTill) {
      throw new Error(`You are already signed into till ${currentTill.tillId}`);
    }

    // Check if till is available
    if (till.currentUserId && !till.shareTill) {
      throw new Error("Till is currently occupied and not shared");
    }

    // For non-shared tills, check if someone is already signed in
    if (!till.shareTill && till.currentUserId) {
      throw new Error("Till is already occupied");
    }

    const now = Date.now();

    // Create session record
    await ctx.db.insert("tillSessions", {
      tillId: args.tillId,
      userId: userId,
      signInTime: now,
      isActive: true,
    });

    // Update till with current user (for non-shared tills)
    if (!till.shareTill) {
      await ctx.db.patch(till._id, {
        currentUserId: userId,
        signInTime: now,
        lastUpdated: now,
      });
    }

    return { success: true, tillId: args.tillId };
  },
});

export const signOut = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    // Find user's current active session
    const activeSession = await ctx.db
      .query("tillSessions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .unique();

    if (!activeSession) {
      throw new Error("No active till session found");
    }

    const now = Date.now();
    const sessionDuration = now - activeSession.signInTime;

    // Close the session
    await ctx.db.patch(activeSession._id, {
      signOutTime: now,
      sessionDuration: sessionDuration,
      isActive: false,
    });

    // Update till to remove current user
    const till = await ctx.db
      .query("tills")
      .withIndex("by_till_id", (q) => q.eq("tillId", activeSession.tillId))
      .unique();

    if (till && till.currentUserId === userId) {
      await ctx.db.patch(till._id, {
        currentUserId: undefined,
        signInTime: undefined,
        lastUpdated: now,
      });
    }

    return { success: true, tillId: activeSession.tillId };
  },
});

export const getCurrentUserTill = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const activeSession = await ctx.db
      .query("tillSessions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .unique();

    if (!activeSession) {
      return null;
    }

    const till = await ctx.db
      .query("tills")
      .withIndex("by_till_id", (q) => q.eq("tillId", activeSession.tillId))
      .unique();

    return till ? { ...till, session: activeSession } : null;
  },
});

export const getTillSessions = query({
  args: { tillId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db
      .query("tillSessions")
      .withIndex("by_till_id", (q) => q.eq("tillId", args.tillId))
      .order("desc")
      .collect();
  },
});

export const getTillBalance = query({
  args: { tillId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const cashAccounts = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_id", (q) => q.eq("tillId", args.tillId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return cashAccounts.map(account => ({
      currencyCode: account.currencyCode,
      balance: account.balance,
      accountName: account.accountName,
    }));
  },
});

export const cleanupInactiveSessions = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    // Find sessions that are still active but older than 24 hours
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const staleSessions = await ctx.db
      .query("tillSessions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.lt(q.field("signInTime"), twentyFourHoursAgo))
      .collect();

    let cleanedCount = 0;
    
    for (const session of staleSessions) {
      const sessionDuration = Date.now() - session.signInTime;
      
      // Close the session
      await ctx.db.patch(session._id, {
        signOutTime: Date.now(),
        sessionDuration: sessionDuration,
        isActive: false,
      });
      
      // Clear till's current user if it matches
      const till = await ctx.db
        .query("tills")
        .withIndex("by_till_id", (q) => q.eq("tillId", session.tillId))
        .unique();
      
      if (till && till.currentUserId === session.userId) {
        await ctx.db.patch(till._id, {
          currentUserId: undefined,
          signInTime: undefined,
          lastUpdated: Date.now(),
        });
      }
      
      cleanedCount++;
    }

    return { cleanedSessions: cleanedCount };
  },
});
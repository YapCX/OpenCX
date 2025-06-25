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

export const get = query({
  args: { id: v.id("tills") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: { searchTerm: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    let tills = await ctx.db.query("tills").collect();
    
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      tills = tills.filter(till => 
        till.tillName.toLowerCase().includes(searchLower) ||
        till.tillId.toLowerCase().includes(searchLower)
      );
    }
    
    // Get current user information for each till
    const tillsWithUsers = await Promise.all(
      tills.map(async (till) => {
        let currentUserName = null;
        if (till.currentUserId) {
          const user = await ctx.db.get(till.currentUserId);
          currentUserName = user ? ((user as any).name || (user as any).email || "User") : "Unknown User";
        }
        
        return {
          ...till,
          currentUserName,
        };
      })
    );
    
    return tillsWithUsers;
  },
});

export const create = mutation({
  args: {
    tillName: v.string(),
    tillId: v.string(),
    reserveForAdmin: v.boolean(),
    shareTill: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Check if tillId already exists
    const existingTill = await ctx.db
      .query("tills")
      .withIndex("by_till_id", (q: any) => q.eq("tillId", args.tillId))
      .first();
    
    if (existingTill) {
      throw new Error("Till ID already exists");
    }
    
    const tillData = {
      tillName: args.tillName,
      tillId: args.tillId,
      reserveForAdmin: args.reserveForAdmin,
      shareTill: args.shareTill,
      currentUserId: undefined,
      isActive: true,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      createdBy: userId,
    };
    
    const tillDocId = await ctx.db.insert("tills", tillData);
    
    // Create default cash ledger accounts for this till
    const currencies = await ctx.db.query("currencies").collect();
    
    for (const currency of currencies) {
      await ctx.db.insert("cashLedgerAccounts", {
        tillId: args.tillId,
        currencyCode: currency.code,
        accountName: `Cash-${currency.code}-${args.tillId}`,
        balance: 0,
        isActive: true,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
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
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const { id, ...updateData } = args;
    
    await ctx.db.patch(id, {
      ...updateData,
      lastUpdated: Date.now(),
    });
    
    return id;
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
      throw new Error("Cannot delete a till that is currently in use");
    }
    
    // Delete associated cash ledger accounts
    const accounts = await ctx.db
      .query("cashLedgerAccounts")
      .withIndex("by_till_id", (q: any) => q.eq("tillId", (till as any).tillId))
      .collect();
    
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const signIn = mutation({
  args: { tillId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Check if user is already signed into a till
    const currentTill = await ctx.db
      .query("tills")
      .withIndex("by_current_user", (q: any) => q.eq("currentUserId", userId))
      .first();
    
    if (currentTill) {
      throw new Error("You are already signed into a till. Please sign out first.");
    }
    
    // Get the target till
    const till = await ctx.db
      .query("tills")
      .withIndex("by_till_id", (q: any) => q.eq("tillId", args.tillId))
      .first();
    
    if (!till) {
      throw new Error("Till not found");
    }
    
    // Check if till is available or shared
    if (till.currentUserId && !till.shareTill) {
      throw new Error("This till is currently occupied and not shared");
    }
    
    // For shared tills, we'll track multiple users differently
    // For now, we'll update the currentUserId to the latest user
    // In a production system, you might want to track multiple active users
    await ctx.db.patch(till._id, {
      currentUserId: userId,
      signInTime: Date.now(),
      lastUpdated: Date.now(),
    });
    
    // Create a till session record
    await ctx.db.insert("tillSessions", {
      tillId: args.tillId,
      userId,
      signInTime: Date.now(),
      signOutTime: undefined,
      sessionDuration: undefined,
      isActive: true,
    });
    
    return till._id;
  },
});

export const signOut = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    
    // Find the till the user is currently signed into
    const currentTill = await ctx.db
      .query("tills")
      .withIndex("by_current_user", (q: any) => q.eq("currentUserId", userId))
      .first();
    
    if (!currentTill) {
      throw new Error("You are not currently signed into any till");
    }
    
    // For shared tills, we need to check if other users are still signed in
    // For now, we'll just clear the currentUserId
    // In a production system, you'd want more sophisticated tracking
    await ctx.db.patch(currentTill._id, {
      currentUserId: undefined,
      signInTime: undefined,
      lastUpdated: Date.now(),
    });
    
    // Close the active till session
    const activeSession = await ctx.db
      .query("tillSessions")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .filter((q: any) => q.eq(q.field("tillId"), (currentTill as any).tillId))
      .first();
    
    if (activeSession) {
      const sessionDuration = Date.now() - activeSession.signInTime;
      await ctx.db.patch(activeSession._id, {
        signOutTime: Date.now(),
        sessionDuration,
        isActive: false,
      });
    }
    
    return currentTill._id;
  },
});

export const getCurrentUserTill = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const till = await ctx.db
      .query("tills")
      .withIndex("by_current_user", (q: any) => q.eq("currentUserId", userId))
      .first();
    
    return till;
  },
});

export const getTillSessions = query({
  args: { tillId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const sessions = await ctx.db
      .query("tillSessions")
      .withIndex("by_till_id", (q: any) => q.eq("tillId", args.tillId))
      .order("desc")
      .take(50);
    
    // Get user information for each session
    const sessionsWithUsers = await Promise.all(
      sessions.map(async (session) => {
        const user = await ctx.db.get(session.userId);
        return {
          ...session,
          user: user ? {
            _id: user._id,
            name: (user as any).name || "Unknown User",
            email: (user as any).email,
          } : null,
        };
      })
    );
    
    return sessionsWithUsers;
  },
});

// Cleanup function to automatically sign out users who are no longer authenticated
export const cleanupInactiveSessions = mutation({
  args: {},
  handler: async (ctx) => {
    // This would typically be called by a cron job or when users log out
    // For now, we'll make it available to be called manually
    
    const activeSessions = await ctx.db
      .query("tillSessions")
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();
    
    for (const session of activeSessions) {
      // Check if the user still exists and is active
      const user = await ctx.db.get(session.userId);
      if (!user) {
        // User no longer exists, close the session
        await ctx.db.patch(session._id, {
          signOutTime: Date.now(),
          isActive: false,
        });
        
        // Clear the till if this user was the current user
        const till = await ctx.db
          .query("tills")
          .withIndex("by_till_id", (q: any) => q.eq("tillId", session.tillId))
          .first();
        
        if (till && (till as any).currentUserId === session.userId) {
          await ctx.db.patch(till._id, {
            currentUserId: undefined,
            signInTime: undefined,
            lastUpdated: Date.now(),
          });
        }
      }
    }
  },
});

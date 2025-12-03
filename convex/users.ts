import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const profiles = await ctx.db
      .query("userProfiles")
      .order("asc")
      .collect()

    const profilesWithDetails = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId)
        const branch = profile.branchId ? await ctx.db.get(profile.branchId) : null
        return {
          ...profile,
          email: user?.email || "",
          branchName: branch?.name || null,
          branchCode: branch?.code || null,
        }
      })
    )

    return profilesWithDetails
  },
})

export const getById = query({
  args: { id: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const profile = await ctx.db.get(args.id)
    if (!profile) return null

    const user = await ctx.db.get(profile.userId)
    const branch = profile.branchId ? await ctx.db.get(profile.branchId) : null

    return {
      ...profile,
      email: user?.email || "",
      branchName: branch?.name || null,
      branchCode: branch?.code || null,
    }
  },
})

export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx)
    if (!authUserId) return null

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    return profile
  },
})

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    if (!profile) return null

    const branch = profile.branchId ? await ctx.db.get(profile.branchId) : null
    const user = await ctx.db.get(userId)

    return {
      ...profile,
      email: user?.email || "",
      branchName: branch?.name || null,
      branchCode: branch?.code || null,
    }
  },
})

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    role: v.string(),
    branchId: v.optional(v.id("branches")),
    userAlias: v.optional(v.string()),
    userPin: v.optional(v.string()),
    transactionLimitPerDay: v.optional(v.number()),
    enable2FA: v.optional(v.boolean()),
    isVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existingUserByEmail = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first()

    let targetUserId = existingUserByEmail?._id

    if (!targetUserId) {
      targetUserId = await ctx.db.insert("users", {
        email: args.email,
      })
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId!))
      .first()

    if (existingProfile) {
      throw new Error(`User profile for ${args.email} already exists`)
    }

    if (args.branchId) {
      const branch = await ctx.db.get(args.branchId)
      if (!branch) throw new Error("Branch not found")
    }

    const now = Date.now()
    return await ctx.db.insert("userProfiles", {
      userId: targetUserId,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      branchId: args.branchId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("userProfiles"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    isActive: v.optional(v.boolean()),
    userAlias: v.optional(v.string()),
    userPin: v.optional(v.string()),
    transactionLimitPerDay: v.optional(v.number()),
    enable2FA: v.optional(v.boolean()),
    isVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const { id, ...updates } = args
    const profile = await ctx.db.get(id)
    if (!profile) throw new Error("User profile not found")

    if (updates.branchId) {
      const branch = await ctx.db.get(updates.branchId)
      if (!branch) throw new Error("Branch not found")
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )

    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const profile = await ctx.db.get(args.id)
    if (!profile) throw new Error("User profile not found")

    const transactions = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("createdBy"), profile.userId))
      .first()

    if (transactions) {
      throw new Error("Cannot delete user with existing transactions. Deactivate instead.")
    }

    await ctx.db.delete(args.id)
  },
})

export const toggleActive = mutation({
  args: { id: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const profile = await ctx.db.get(args.id)
    if (!profile) throw new Error("User profile not found")

    return await ctx.db.patch(args.id, {
      isActive: !profile.isActive,
      updatedAt: Date.now(),
    })
  },
})

export const seedCurrentUser = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    if (existingProfile) {
      return { created: false, message: "Profile already exists", profileId: existingProfile._id }
    }

    const now = Date.now()
    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    return { created: true, message: "Profile created", profileId }
  },
})

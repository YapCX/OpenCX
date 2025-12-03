import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {
    limit: v.optional(v.number()),
    kycStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    let customers = await ctx.db
      .query("customers")
      .order("desc")
      .collect()

    if (args.kycStatus) {
      customers = customers.filter((c) => c.kycStatus === args.kycStatus)
    }

    if (args.limit) {
      customers = customers.slice(0, args.limit)
    }

    return customers
  },
})

export const getById = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    return await ctx.db.get(args.id)
  },
})

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const searchLower = args.searchTerm.toLowerCase()

    const allCustomers = await ctx.db.query("customers").collect()

    return allCustomers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(searchLower) ||
        c.lastName.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(searchLower)
    )
  },
})

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    idType: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    idExpiryDate: v.optional(v.string()),
    nationality: v.optional(v.string()),
    occupation: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const now = Date.now()

    const customerId = await ctx.db.insert("customers", {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      address: args.address,
      dateOfBirth: args.dateOfBirth,
      idType: args.idType,
      idNumber: args.idNumber,
      idExpiryDate: args.idExpiryDate,
      nationality: args.nationality,
      occupation: args.occupation,
      notes: args.notes,
      kycStatus: "pending",
      sanctionScreeningStatus: "pending",
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    })

    return customerId
  },
})

export const update = mutation({
  args: {
    id: v.id("customers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    idType: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    idExpiryDate: v.optional(v.string()),
    nationality: v.optional(v.string()),
    occupation: v.optional(v.string()),
    notes: v.optional(v.string()),
    kycStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const { id, ...updates } = args
    const customer = await ctx.db.get(id)
    if (!customer) throw new Error("Customer not found")

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
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.id))
      .first()

    if (transactions) {
      throw new Error("Cannot delete customer with existing transactions")
    }

    await ctx.db.delete(args.id)
  },
})

export const getCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return 0

    const customers = await ctx.db.query("customers").collect()
    return customers.length
  },
})

export const getTransactions = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .collect()
  },
})

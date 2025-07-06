import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  currencies: defineTable({
    code: v.string(),
    name: v.string(),
    country: v.string(),
    flag: v.string(),
    symbol: v.string(),
    marketRate: v.number(),
    discountPercent: v.number(),
    markupPercent: v.number(),
    buyRate: v.number(),
    sellRate: v.number(),
    manualBuyRate: v.boolean(),
    manualSellRate: v.boolean(),
    lastUpdated: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"])
    .index("by_country", ["country"]),

  denominations: defineTable({
    currencyCode: v.string(),
    value: v.number(),
    isCoin: v.boolean(),
    imageId: v.optional(v.id("_storage")),
  })
    .index("by_currency", ["currencyCode"])
    .index("by_currency_and_value", ["currencyCode", "value"])
    .index("by_value", ["value"]),

  // Currency exchange transactions/orders
  transactions: defineTable({
    transactionId: v.string(),
    userId: v.string(), // Clerk user ID
    customerId: v.optional(v.string()), // Customer ID for walk-in customers
    
    // Transaction types
    type: v.union(
      v.literal("currency_buy"),    // Order type: Buy
      v.literal("currency_sell"),   // Order type: Sell
      v.literal("cash_in"),
      v.literal("cash_out"),
      v.literal("transfer"),
      v.literal("adjustment")
    ),
    
    // Currency exchange specific fields
    fromCurrency: v.string(),
    fromAmount: v.number(),
    toCurrency: v.string(),
    toAmount: v.number(),
    exchangeRate: v.number(),
    
    // Fee structure
    serviceFee: v.optional(v.number()),
    serviceFeeType: v.optional(v.union(v.literal("flat"), v.literal("percentage"))),
    
    // Payment and processing
    paymentMethod: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    // Customer information
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    
    // Compliance and notes
    requiresAML: v.boolean(),
    notes: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_transaction_id", ["transactionId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_created_at", ["createdAt"])
    .index("by_customer", ["customerId"]),

  // Settings for global configuration
  settings: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    lastUpdated: v.number(),
    updatedBy: v.optional(v.string()), // Clerk user ID
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),
};

export default defineSchema({
  ...applicationTables,
});

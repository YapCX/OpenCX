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

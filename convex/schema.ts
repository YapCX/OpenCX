import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

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

  customers: defineTable({
    customerId: v.string(),
    customerType: v.union(v.literal("individual"), v.literal("corporate")),

    // Individual customer fields
    fullName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    fullAddress: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    occupation: v.optional(v.string()),

    // Corporate customer fields
    legalBusinessName: v.optional(v.string()),
    typeOfBusiness: v.optional(v.string()),
    incorporationNumber: v.optional(v.string()),
    businessAddress: v.optional(v.string()),
    businessPhone: v.optional(v.string()),

    // Corporate classification flags
    isWholesalerOrBank: v.optional(v.boolean()),
    isMSB: v.optional(v.boolean()),
    msbRegistrationNumber: v.optional(v.string()),
    msbExpirationDate: v.optional(v.string()),

    // Contact person for corporate customers
    contactPersonName: v.optional(v.string()),
    contactPersonTitle: v.optional(v.string()),
    contactPersonEmail: v.optional(v.string()),
    contactPersonPhone: v.optional(v.string()),

    // Sanctions screening
    sanctionsScreeningStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("clear"),
      v.literal("flagged"),
      v.literal("error")
    )),
    sanctionsScreeningDate: v.optional(v.number()),
    sanctionsScreeningDetails: v.optional(v.string()),

    // AML & Risk Management
    riskLevel: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
    amlStatus: v.optional(v.union(
      v.literal("clear"),
      v.literal("on_hold"),
      v.literal("under_review"),
      v.literal("approved")
    )),
    complianceNotes: v.optional(v.string()),
    lastRiskAssessment: v.optional(v.number()),

    idDocuments: v.optional(v.array(v.object({
      idNumber: v.string(),
      idType: v.string(),
      expirationDate: v.string(),
      issuingAuthority: v.string(),
      imageId: v.id("_storage"),
      originalFileName: v.string(),
    }))),
    status: v.string(),
    createdAt: v.number(),
    lastUpdated: v.number(),
    createdBy: v.id("users"), // Properly typed user ID
  })
    .index("by_customer_id", ["customerId"])
    .index("by_name", ["fullName"])
    .index("by_business_name", ["legalBusinessName"])
    .index("by_phone", ["phoneNumber"])
    .index("by_business_phone", ["businessPhone"])
    .index("by_status", ["status"])
    .index("by_customer_type", ["customerType"])
    .index("by_msb_status", ["isMSB"])
    .index("by_sanctions_status", ["sanctionsScreeningStatus"])
    .index("by_risk_level", ["riskLevel"])
    .index("by_aml_status", ["amlStatus"]),

  idTypes: defineTable({
    name: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_active", ["isActive"]),


  // AML Settings
  amlSettings: defineTable({
    autoScreeningEnabled: v.boolean(),
    enabledSanctionLists: v.array(v.string()), // ["OFAC", "OSFI", "UN", "EU"]
    riskThresholds: v.object({
      lowRiskScore: v.number(),
      mediumRiskScore: v.number(),
      highRiskScore: v.number(),
    }),
    autoHoldOnMatch: v.boolean(),
    requireOverrideReason: v.boolean(),
    lastUpdated: v.number(),
    updatedBy: v.id("users"),
  }),

  // Sanction List Entries (cached from APIs)
  sanctionEntries: defineTable({
    listSource: v.string(), // "OFAC", "OSFI", "UN", etc.
    entityType: v.union(v.literal("individual"), v.literal("entity")),
    primaryName: v.string(),
    aliases: v.optional(v.array(v.string())),
    dateOfBirth: v.optional(v.string()),
    placeOfBirth: v.optional(v.string()),
    nationality: v.optional(v.string()),
    sanctionType: v.string(),
    sanctionReason: v.optional(v.string()),
    listingDate: v.optional(v.number()),
    lastUpdated: v.number(),
    isActive: v.boolean(),
  })
    .index("by_source", ["listSource"])
    .index("by_name", ["primaryName"])
    .index("by_entity_type", ["entityType"])
    .index("by_active", ["isActive"]),

  // AML Screening History
  amlScreeningHistory: defineTable({
    customerId: v.id("customers"),
    screeningType: v.union(
      v.literal("automatic"),
      v.literal("manual"),
      v.literal("periodic")
    ),
    screeningDate: v.number(),
    listsChecked: v.array(v.string()),
    matchesFound: v.array(v.object({
      sanctionEntryId: v.id("sanctionEntries"),
      matchScore: v.number(),
      matchType: v.union(v.literal("exact"), v.literal("fuzzy"), v.literal("alias")),
      isFalsePositive: v.boolean(),
      falsePositiveReason: v.optional(v.string()),
      reviewedBy: v.optional(v.string()), // Auth user ID
      reviewedAt: v.optional(v.number()),
    })),
    overallResult: v.union(
      v.literal("clear"),
      v.literal("potential_match"),
      v.literal("confirmed_match")
    ),
    performedBy: v.optional(v.string()), // Auth user ID
    notes: v.optional(v.string()),
  })
    .index("by_customer", ["customerId"])
    .index("by_date", ["screeningDate"])
    .index("by_result", ["overallResult"]),

  // Risk Assessment History
  riskAssessments: defineTable({
    customerId: v.id("customers"),
    assessmentDate: v.number(),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    riskScore: v.number(),
    riskFactors: v.array(v.object({
      factor: v.string(),
      weight: v.number(),
      description: v.string(),
    })),
    assessedBy: v.string(), // Auth user ID
    notes: v.string(),
    previousRiskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  })
    .index("by_customer", ["customerId"])
    .index("by_date", ["assessmentDate"])
    .index("by_risk_level", ["riskLevel"]),

  // AML Actions & Overrides
  amlActions: defineTable({
    customerId: v.id("customers"),
    actionType: v.union(
      v.literal("hold_placed"),
      v.literal("hold_removed"),
      v.literal("false_positive_marked"),
      v.literal("risk_level_changed"),
      v.literal("manual_override")
    ),
    actionDate: v.number(),
    performedBy: v.string(), // Auth user ID
    reason: v.string(),
    previousValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    requiresApproval: v.boolean(),
    approvedBy: v.optional(v.string()), // Auth user ID
    approvedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_customer", ["customerId"])
    .index("by_action_type", ["actionType"])
    .index("by_date", ["actionDate"])
    .index("by_performed_by", ["performedBy"]),

  // Global Settings
  settings: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    lastUpdated: v.number(),
    updatedBy: v.optional(v.id("users")), // Properly typed user ID
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),

  // Till Management
  tills: defineTable({
    tillId: v.string(),
    tillName: v.string(),
    reserveForAdmin: v.boolean(),
    shareTill: v.boolean(),
    isActive: v.boolean(),
    currentUserId: v.optional(v.id("users")), // Properly typed user ID
    signInTime: v.optional(v.number()),
    createdAt: v.number(),
    lastUpdated: v.number(),
    createdBy: v.id("users"), // Properly typed user ID
  })
    .index("by_till_id", ["tillId"])
    .index("by_current_user", ["currentUserId"])
    .index("by_active", ["isActive"]),

  // Cash Ledger Accounts
  cashLedgerAccounts: defineTable({
    accountName: v.string(), // e.g., "Cash-USD-01"
    tillId: v.string(),
    currencyCode: v.string(),
    balance: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_till_id", ["tillId"])
    .index("by_currency", ["currencyCode"])
    .index("by_till_and_currency", ["tillId", "currencyCode"])
    .index("by_account_name", ["accountName"])
    .index("by_active", ["isActive"]),

  // Till Sessions (for audit trail)
  tillSessions: defineTable({
    tillId: v.string(),
    userId: v.id("users"),
    signInTime: v.number(),
    signOutTime: v.optional(v.number()),
    sessionDuration: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_till_id", ["tillId"])
    .index("by_user_id", ["userId"])
    .index("by_sign_in_time", ["signInTime"])
    .index("by_active", ["isActive"]),

  // Unified transaction table for all transaction types
  transactions: defineTable({
    transactionId: v.string(),
    tillId: v.string(),
    userId: v.id("users"),
    customerId: v.union(v.id("customers"), v.null()),

    // Transaction type and category
    type: v.union(
      v.literal("cash_in"),
      v.literal("cash_out"),
      v.literal("currency_buy"),
      v.literal("currency_sell"),
      v.literal("transfer"),
      v.literal("adjustment")
    ),
    category: v.union(
      v.literal("cash_movement"),
      v.literal("currency_exchange"),
      v.literal("internal")
    ),

    // Basic transaction fields
    amount: v.number(),
    currency: v.string(),

    // Currency exchange specific fields (optional)
    foreignCurrency: v.optional(v.string()),
    foreignAmount: v.optional(v.number()),
    localCurrency: v.optional(v.string()),
    localAmount: v.optional(v.number()),
    exchangeRate: v.optional(v.number()),
    flatFee: v.optional(v.number()),

    // Payment and processing
    paymentMethod: v.optional(v.string()),
    status: v.string(),
    notes: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_till", ["tillId"])
    .index("by_user", ["userId"])
    .index("by_customer", ["customerId"])
    .index("by_date", ["createdAt"])
    .index("by_transaction_id", ["transactionId"])
    .index("by_type", ["type"])
    .index("by_category", ["category"])
    .index("by_status", ["status"]),
};

// Use Convex Auth tables and add our business-specific fields
const extendedAuthTables = {
  ...authTables,
  users: defineTable({
    // Convex Auth built-in fields (from authTables.users)
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // Link to auth user
    authUserId: v.optional(v.id("users")),

    // System user fields
    fullName: v.optional(v.string()),

    // Roles & Status
    isManager: v.optional(v.boolean()),
    isComplianceOfficer: v.optional(v.boolean()),
    isTemplate: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),

    // Financial Controls
    canModifyExchangeRates: v.optional(v.boolean()),
    maxModificationIndividual: v.optional(v.number()),
    maxModificationCorporate: v.optional(v.number()),
    canEditFeesCommissions: v.optional(v.boolean()),
    canTransferBetweenAccounts: v.optional(v.boolean()),
    canReconcileAccounts: v.optional(v.boolean()),

    // Default Privileges
    defaultPrivileges: v.optional(v.object({
      view: v.boolean(),
      create: v.boolean(),
      modify: v.boolean(),
      delete: v.boolean(),
      print: v.boolean(),
    })),

    // Module-specific exceptions
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

    // Invitation tracking
    invitationStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired")
    )),
    invitationToken: v.optional(v.string()),
    invitationSentAt: v.optional(v.number()),
    invitationExpiresAt: v.optional(v.number()),

    // Audit fields
    createdBy: v.optional(v.id("users")),
    lastUpdated: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_active", ["isActive"])
    .index("by_template", ["isTemplate"])
    .index("by_manager", ["isManager"])
    .index("by_compliance", ["isComplianceOfficer"])
    .index("by_invitation_token", ["invitationToken"])
    .index("by_invitation_status", ["invitationStatus"])
    .index("by_auth_user", ["authUserId"]),
};

export default defineSchema({
  ...extendedAuthTables,
  ...applicationTables,
});

import { query, mutation, action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal, api } from "./_generated/api";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

// AML Settings Management
export const getAMLSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    
    const settings = await ctx.db.query("amlSettings").first();
    
    // Return default settings if none exist
    if (!settings) {
      return {
        autoScreeningEnabled: true,
        enabledSanctionLists: ["OFAC", "UN"],
        riskThresholds: {
          lowRiskScore: 30,
          mediumRiskScore: 60,
          highRiskScore: 80,
        },
        autoHoldOnMatch: true,
        requireOverrideReason: true,
      };
    }
    
    return settings;
  },
});

export const updateAMLSettings = mutation({
  args: {
    autoScreeningEnabled: v.boolean(),
    enabledSanctionLists: v.array(v.string()),
    riskThresholds: v.object({
      lowRiskScore: v.number(),
      mediumRiskScore: v.number(),
      highRiskScore: v.number(),
    }),
    autoHoldOnMatch: v.boolean(),
    requireOverrideReason: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    const existingSettings = await ctx.db.query("amlSettings").first();
    
    if (existingSettings) {
      return await ctx.db.patch(existingSettings._id, {
        ...args,
        lastUpdated: Date.now(),
        updatedBy: userId,
      });
    } else {
      return await ctx.db.insert("amlSettings", {
        ...args,
        lastUpdated: Date.now(),
        updatedBy: userId,
      });
    }
  },
});

// Sanction List Management
export const performSanctionScreening = internalAction({
  args: {
    customerId: v.id("customers"),
    customerName: v.string(),
    screeningType: v.union(v.literal("automatic"), v.literal("manual"), v.literal("periodic")),
    performedBy: v.optional(v.string()), // Auth user ID
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const settings: any = await ctx.runQuery(api.aml.getAMLSettings, {});
      
      if (!settings.autoScreeningEnabled && args.screeningType === "automatic") {
        return { success: false, reason: "Auto screening disabled" };
      }
      
      // Simulate multiple sanction list checks
      const screeningResults = await Promise.all(
        settings.enabledSanctionLists.map((listSource: string) => 
          simulateSanctionListCheck(args.customerName, listSource)
        )
      );
      
      const allMatches = screeningResults.flatMap(result => result.matches);
      const overallResult = allMatches.length > 0 ? "potential_match" : "clear";
      
      // Record screening history
      const historyId: any = await ctx.runMutation(internal.aml.recordScreeningHistory, {
        customerId: args.customerId,
        screeningType: args.screeningType,
        listsChecked: settings.enabledSanctionLists,
        matches: allMatches,
        overallResult,
        performedBy: args.performedBy,
      });
      
      // Auto-hold if matches found and setting enabled
      if (allMatches.length > 0 && settings.autoHoldOnMatch) {
        await ctx.runMutation(internal.aml.updateCustomerAMLStatus, {
          customerId: args.customerId,
          amlStatus: "on_hold",
          reason: "Automatic hold due to sanction list match",
          performedBy: args.performedBy,
        });
      }
      
      return {
        success: true,
        historyId,
        matchesFound: allMatches.length,
        overallResult,
        autoHoldApplied: allMatches.length > 0 && settings.autoHoldOnMatch,
      };
      
    } catch (error) {
      console.error("Sanction screening failed:", error);
      return { success: false, reason: "Screening service error" };
    }
  },
});

export const recordScreeningHistory = internalMutation({
  args: {
    customerId: v.id("customers"),
    screeningType: v.union(v.literal("automatic"), v.literal("manual"), v.literal("periodic")),
    listsChecked: v.array(v.string()),
    matches: v.array(v.object({
      sanctionEntryId: v.string(),
      matchScore: v.number(),
      matchType: v.union(v.literal("exact"), v.literal("fuzzy"), v.literal("alias")),
      listSource: v.string(),
      primaryName: v.string(),
      aliases: v.optional(v.array(v.string())),
      dateOfBirth: v.optional(v.string()),
      placeOfBirth: v.optional(v.string()),
      sanctionType: v.string(),
    })),
    overallResult: v.union(v.literal("clear"), v.literal("potential_match"), v.literal("confirmed_match")),
    performedBy: v.optional(v.string()), // Auth user ID
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    // Convert matches to proper format for storage
    const formattedMatches = args.matches.map(match => ({
      sanctionEntryId: match.sanctionEntryId as any, // Will be properly typed in real implementation
      matchScore: match.matchScore,
      matchType: match.matchType,
      isFalsePositive: false,
    }));
    
    return await ctx.db.insert("amlScreeningHistory", {
      customerId: args.customerId,
      screeningType: args.screeningType,
      screeningDate: Date.now(),
      listsChecked: args.listsChecked,
      matchesFound: formattedMatches,
      overallResult: args.overallResult,
      performedBy: args.performedBy,
      notes: args.notes,
    });
  },
});

export const updateCustomerAMLStatus = internalMutation({
  args: {
    customerId: v.id("customers"),
    amlStatus: v.union(v.literal("clear"), v.literal("on_hold"), v.literal("under_review"), v.literal("approved")),
    reason: v.string(),
    performedBy: v.optional(v.string()), // Auth user ID
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    
    const previousStatus = customer.amlStatus;
    
    // Update customer AML status
    await ctx.db.patch(args.customerId, {
      amlStatus: args.amlStatus,
      lastUpdated: Date.now(),
    });
    
    // Log the action
    await ctx.db.insert("amlActions", {
      customerId: args.customerId,
      actionType: args.amlStatus === "on_hold" ? "hold_placed" : "hold_removed",
      actionDate: Date.now(),
      performedBy: args.performedBy || (customer._id as any), // Fallback for system actions
      reason: args.reason,
      previousValue: previousStatus,
      newValue: args.amlStatus,
      requiresApproval: false,
    });
    
    return { success: true };
  },
});

// Customer AML Data Queries
export const getCustomerAMLData = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return null;
    
    // Get screening history
    const screeningHistory = await ctx.db
      .query("amlScreeningHistory")
      .withIndex("by_customer", q => q.eq("customerId", args.customerId))
      .order("desc")
      .take(10);
    
    // Get risk assessments
    const riskAssessments = await ctx.db
      .query("riskAssessments")
      .withIndex("by_customer", q => q.eq("customerId", args.customerId))
      .order("desc")
      .take(5);
    
    // Get AML actions
    const amlActions = await ctx.db
      .query("amlActions")
      .withIndex("by_customer", q => q.eq("customerId", args.customerId))
      .order("desc")
      .take(20);
    
    return {
      customer: {
        _id: customer._id,
        customerId: customer.customerId,
        customerType: customer.customerType,
        fullName: customer.fullName,
        legalBusinessName: customer.legalBusinessName,
        riskLevel: customer.riskLevel,
        amlStatus: customer.amlStatus,
        complianceNotes: customer.complianceNotes,
        lastRiskAssessment: customer.lastRiskAssessment,
      },
      screeningHistory,
      riskAssessments,
      amlActions,
    };
  },
});

export const updateCustomerRiskLevel = mutation({
  args: {
    customerId: v.id("customers"),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    riskScore: v.number(),
    riskFactors: v.array(v.object({
      factor: v.string(),
      weight: v.number(),
      description: v.string(),
    })),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    
    const previousRiskLevel = customer.riskLevel;
    
    // Update customer risk level
    await ctx.db.patch(args.customerId, {
      riskLevel: args.riskLevel,
      lastRiskAssessment: Date.now(),
      lastUpdated: Date.now(),
    });
    
    // Record risk assessment
    await ctx.db.insert("riskAssessments", {
      customerId: args.customerId,
      assessmentDate: Date.now(),
      riskLevel: args.riskLevel,
      riskScore: args.riskScore,
      riskFactors: args.riskFactors,
      assessedBy: userId,
      notes: args.notes,
      previousRiskLevel,
    });
    
    // Log the action
    await ctx.db.insert("amlActions", {
      customerId: args.customerId,
      actionType: "risk_level_changed",
      actionDate: Date.now(),
      performedBy: userId,
      reason: `Risk level changed from ${previousRiskLevel || 'unassigned'} to ${args.riskLevel}`,
      previousValue: previousRiskLevel,
      newValue: args.riskLevel,
      requiresApproval: false,
      notes: args.notes,
    });
    
    return { success: true };
  },
});

export const markFalsePositive = mutation({
  args: {
    customerId: v.id("customers"),
    screeningHistoryId: v.id("amlScreeningHistory"),
    matchIndex: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    const screeningRecord = await ctx.db.get(args.screeningHistoryId);
    if (!screeningRecord) {
      throw new Error("Screening record not found");
    }
    
    // Update the specific match as false positive
    const updatedMatches = [...screeningRecord.matchesFound];
    if (updatedMatches[args.matchIndex]) {
      updatedMatches[args.matchIndex] = {
        ...updatedMatches[args.matchIndex],
        isFalsePositive: true,
        falsePositiveReason: args.reason,
        reviewedBy: userId,
        reviewedAt: Date.now(),
      };
      
      await ctx.db.patch(args.screeningHistoryId, {
        matchesFound: updatedMatches,
      });
    }
    
    // Log the action
    await ctx.db.insert("amlActions", {
      customerId: args.customerId,
      actionType: "false_positive_marked",
      actionDate: Date.now(),
      performedBy: userId,
      reason: args.reason,
      requiresApproval: false,
    });
    
    return { success: true };
  },
});

export const removeHoldWithOverride = mutation({
  args: {
    customerId: v.id("customers"),
    overrideReason: v.string(),
    newStatus: v.union(v.literal("clear"), v.literal("under_review"), v.literal("approved")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    
    if (customer.amlStatus !== "on_hold") {
      throw new Error("Customer is not currently on hold");
    }
    
    // Update customer status
    await ctx.db.patch(args.customerId, {
      amlStatus: args.newStatus,
      lastUpdated: Date.now(),
    });
    
    // Log the override action
    await ctx.db.insert("amlActions", {
      customerId: args.customerId,
      actionType: "manual_override",
      actionDate: Date.now(),
      performedBy: userId,
      reason: args.overrideReason,
      previousValue: "on_hold",
      newValue: args.newStatus,
      requiresApproval: true, // May require supervisor approval
      notes: `Hold removed with override: ${args.overrideReason}`,
    });
    
    return { success: true };
  },
});

export const updateComplianceNotes = mutation({
  args: {
    customerId: v.id("customers"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    return await ctx.db.patch(args.customerId, {
      complianceNotes: args.notes,
      lastUpdated: Date.now(),
    });
  },
});

// Simulate sanction list API calls (replace with real APIs in production)
async function simulateSanctionListCheck(customerName: string, listSource: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate different sanction lists with test data
  const testSanctionData = {
    "OFAC": [
      {
        primaryName: "ACME TERROR CORP",
        aliases: ["ACME TERROR", "TERROR CORP"],
        sanctionType: "SDN",
        listSource: "OFAC"
      },
      {
        primaryName: "John Terrorist",
        aliases: ["J. Terrorist", "Johnny T"],
        dateOfBirth: "1980-01-01",
        placeOfBirth: "Unknown",
        sanctionType: "SDN",
        listSource: "OFAC"
      }
    ],
    "UN": [
      {
        primaryName: "BAD COMPANY INC",
        aliases: ["BAD CO", "BADCO INC"],
        sanctionType: "UN Security Council",
        listSource: "UN"
      }
    ],
    "OSFI": [
      {
        primaryName: "SANCTIONS TEST",
        aliases: ["SANCTION TEST", "TEST SANCTIONS"],
        sanctionType: "OSFI Listed",
        listSource: "OSFI"
      }
    ]
  };
  
  const listData = testSanctionData[listSource as keyof typeof testSanctionData] || [];
  const matches = [];
  
  for (const entry of listData) {
    // Check for exact match
    if (entry.primaryName.toLowerCase() === customerName.toLowerCase()) {
      matches.push({
        sanctionEntryId: `${listSource}_${entry.primaryName.replace(/\s+/g, '_')}`,
        matchScore: 100,
        matchType: "exact" as const,
        ...entry
      });
    }
    // Check for fuzzy match
    else if (entry.primaryName.toLowerCase().includes(customerName.toLowerCase()) ||
             customerName.toLowerCase().includes(entry.primaryName.toLowerCase())) {
      matches.push({
        sanctionEntryId: `${listSource}_${entry.primaryName.replace(/\s+/g, '_')}`,
        matchScore: 85,
        matchType: "fuzzy" as const,
        ...entry
      });
    }
    // Check aliases
    else if (entry.aliases?.some(alias => 
      alias.toLowerCase() === customerName.toLowerCase() ||
      alias.toLowerCase().includes(customerName.toLowerCase())
    )) {
      matches.push({
        sanctionEntryId: `${listSource}_${entry.primaryName.replace(/\s+/g, '_')}`,
        matchScore: 90,
        matchType: "alias" as const,
        ...entry
      });
    }
  }
  
  return { listSource, matches };
}

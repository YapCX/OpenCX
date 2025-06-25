import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    
    // Return user with permissions info, excluding sensitive data
    return {
      ...user,
      // Include permissions for UI logic
      isManager: user.isManager || false,
      isComplianceOfficer: user.isComplianceOfficer || false,
      isActive: user.isActive !== false,
      defaultPrivileges: user.defaultPrivileges || {
        view: false,
        create: false,
        modify: false,
        delete: false,
        print: false,
      },
    };
  },
});

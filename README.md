# OpenCX App

A comprehensive currency exchange management system built with Convex and React.

## Getting Started

To set up your own instance of this project:

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up Convex**: Create your own [Convex](https://convex.dev) deployment
4. **Configure environment**: Run `npm run dev` to set up your environment variables
5. **Start development**: `npm run dev`

### First-Time Setup

**Two Initialization Paths:**

**Path 1: Automatic Setup (Recommended)**
When you first start the application and sign up:
1. **Convex Auth** handles user signup automatically
2. **Auto-seeding** triggers in background via `afterUserCreatedOrUpdated` callback
3. **Immediate access** - you're signed in and ready to use the system

**Path 2: Manual Setup (Alternative)**
If using the `completeInitialSetup` mutation manually:
1. **Sign up** through normal Convex Auth flow
2. **Call mutation** `completeInitialSetup` to create business user and seed data
3. **Manual trigger** for seeding currencies, settings, and ID types

**What Gets Created Automatically:**
- Your admin account with full manager privileges
- 3 most common currencies (USD, CAD, EUR) with proper symbols
- **Live exchange rates**: Automatically fetched from API after seeding
- Basic system settings and compliance limits
- Common ID document types for customer onboarding

**No manual database configuration required!**

## Features

### 👥 User Management System

**Role-Based Access Control:**
- **Manager**: Full system access, can create/edit users and manage all modules
- **Compliance Officer**: Access to AML/compliance features and user oversight
- **Template Users**: Reusable user configurations for quick setup
- **Active/Inactive Status**: Control user access without deletion

**Invitation-Based User Creation:**
- Users created via secure invitation system (no upfront passwords)
- **Copy-paste invitation links** - managers get shareable URLs
- Share invitation links via any method (email, SMS, Slack, etc.)
- Users set their own passwords when accepting invitations
- 7-day token expiration with one-time use security

**Granular Permissions:**
- **Default Privileges**: Base permissions applied to all modules (view, create, modify, delete, print)
- **Module Exceptions**: Override default permissions for specific modules
- **Financial Controls**: Separate permissions for exchange rates, fees, account transfers, reconciliation

### 💱 Currency Management System

**Database-Only Architecture:**
- Currency symbols and data stored exclusively in database (single source of truth)
- No hardcoded currency values anywhere in the codebase
- Manual currency management for complete control over displayed data

OpenCX includes a comprehensive currency management system with live exchange rates and database-driven currency data.

#### Live Exchange Rate Integration
- **API Provider**: [ExchangeRate-API.com](https://exchangerate-api.com/) free tier
- **Manual Rate Fetching**: Market rates can be fetched manually for individual currencies
- **Bulk Rate Updates**: Refresh all currency rates at once via the "Refresh Rates" button
- **Rate-Only Updates**: Exchange rate refreshes do NOT modify currency symbols or metadata
- **Base Currency Support**: Configurable base currency (default: USD) for all exchange rate calculations

#### Rate Configuration
- **Market Rate**: Automatically fetched live spot rate (read-only)
- **Buy/Sell Rates**: Calculated automatically based on discount/markup percentages
- **Manual Override**: Option to manually set buy/sell rates if needed
- **Percentage-based Pricing**: Configure discount percentage for buying and markup percentage for selling

#### Currency Creation Workflow
1. **Manual Entry**: Enter all currency details manually:
   - Currency code (e.g., "CAD")
   - Currency name (e.g., "Canadian Dollar")
   - Country (e.g., "Canada")
   - Symbol (e.g., "$")
   - Flag emoji (e.g., 🇨🇦)
2. **Fetch Market Rate**: Optionally fetch live exchange rate from API
3. **Configure Rates**: Set discount/markup percentages
4. **Save**: Buy/sell rates calculated automatically based on market rate and percentages
5. **Auto-Population**: Denominations automatically created for supported currencies (see below)

#### Pre-seeded Currencies
The system comes with 4 common currencies pre-configured:
- USD ($), CAD ($), EUR (€), MXN ($)
- **USD base rate**: Set to 1.0 (base currency)
- **Other rates**: Automatically fetched live from ExchangeRate-API.com during initial setup
- **No hardcoded rates**: All market rates come from live API data

### 🪙 Denomination Management System

**Database-First Architecture with External Library Assistance:**
All denominations are stored in the database as the single source of truth, with the external library serving only as a creation assistant.

#### Core Architecture
- **Database**: Single source of truth for all app functionality
- **External Library**: Creation assistant only (never used by app features)
- **User Control**: Full customization after creation

#### Supported Creation Templates (153+ currencies)
The system includes standard denomination templates for 153+ world currencies, including:
- **USD**: 7 coins (penny to dollar) + 7 banknotes ($1 to $100)
- **EUR**: 8 coins (1 cent to 2 euros) + 7 banknotes (€5 to €500)
- **GBP**: 8 coins (1p to £2) + 4 banknotes (£5 to £50)
- **JPY**: 6 coins (¥1 to ¥500) + 4 banknotes (¥1,000 to ¥10,000)
- **CAD**: 5 coins (nickel to toonie) + 5 banknotes ($5 to $100)
- **AUD**: 6 coins (5c to $2) + 5 banknotes ($5 to $100)
- **CHF**: 7 coins (5 centimes to 5 francs) + 6 banknotes (10 to 1000 francs)
- **CNY**: 5 coins (1 fen to 1 yuan) + 6 banknotes (¥1 to ¥100)
- **INR**: 6 coins (50 paise to ₹20) + 7 banknotes (₹10 to ₹2000)
- **MXN**: 9 coins (5 centavos to $20) + 6 banknotes ($20 to $1000)
- And 143+ additional currencies with standard denominations

#### User Workflow
1. **Preview**: View standard denominations available from external library
2. **Import**: Choose to import standard denominations into database
3. **Customize**: Edit, add, or remove denominations in database as needed
4. **Reset**: Option to restore to standard values (destructive action)
5. **Usage**: All app features use only database denominations

#### Database-First Benefits
- **Single Source of Truth**: All app features reference database only
- **Full Customization**: Users can modify any denomination
- **Consistency**: No mixed data sources causing conflicts
- **Auditability**: Clear record of what denominations are actually used
- **Offline Operation**: No external dependencies during normal use

#### Technical Implementation
- **External Library**: `world-currencies` NPM package for reference data
- **Database Storage**: All active denominations stored in Convex database
- **Import Functions**: Selective import from external library to database
- **Reset Capability**: Replace database with fresh external library data
- **App Integration**: All calculations, tills, orders use database exclusively

## Architecture

### Database Schema

**Users Table:**
- Extends Convex Auth with business-specific fields
- Stores roles, permissions, financial controls, and invitation tracking
- Proper indexing for efficient queries by role, status, and invitation tokens

**Currencies Table:**
- Comprehensive currency data with symbols, rates, and configuration
- Database-only storage (no external auto-population)
- Live exchange rate integration for market rates only

**Application Tables:**
- `customers`: Individual and corporate customer management
- `transactions`: Unified transaction tracking
- `amlSettings`: AML compliance configuration
- `settings`: Global application configuration

### Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   ├── UserModule.tsx  # User management interface
│   ├── UserForm.tsx    # User creation/editing form
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useCurrency.ts  # Database-driven currency hooks
│   └── ...
├── lib/                # Utility functions
│   ├── validation.ts   # Validation constants and helpers
│   └── ...
└── ...

convex/
├── schema.ts           # Database schema definition
├── users.ts           # User management mutations/queries
├── currencies.ts      # Currency operations
├── auth.ts            # Authentication setup
└── ...
```

`npm run dev` will start the frontend and backend servers.

## Authentication & Security

This app uses [Convex Auth](https://auth.convex.dev/) with email-based password authentication:

- **Email-Only Authentication**: Simplified login using email + password (no usernames)
- **Initial Setup Flow**: First-time setup creates admin account via proper Convex Auth signup
- **Invitation System**: Users created via secure shareable invitation links
- **Role-Based Access**: Manager and Compliance Officer roles with different permissions
- **Session Management**: Handled by Convex Auth with proper token management
- **Secure by Default**: No browser-based privilege escalation

## Authentication Architecture

### Table Structure & Linking

The authentication system uses **two separate but linked table structures**:

#### 1. **Auth Tables** (Managed by Convex Auth)
- `authAccounts` - Stores login credentials, email verification, etc.
- `authSessions` - Manages user sessions and tokens
- Other auth-related tables for security

#### 2. **Business User Table** (Our Application Logic)
- `users` - Stores business-specific data (roles, permissions, settings)

#### 3. **How They're Linked**

The tables are connected via a **foreign key relationship**:

```typescript
// Business users table schema
users: defineTable({
  // Link to auth user
  authUserId: v.optional(v.id("users")),  // Points to auth table record

  // Business-specific fields
  isManager: v.optional(v.boolean()),
  isComplianceOfficer: v.optional(v.boolean()),
  // ... other business fields
})
.index("by_auth_user", ["authUserId"])  // Efficient lookup index
```

#### 4. **Automatic Linking Process**

When a user signs up, the system automatically:

1. **Convex Auth** creates record in auth tables (credentials, email, etc.)
2. **Our callback** creates linked record in business `users` table
3. **First user** gets automatic admin privileges and triggers data seeding

```typescript
// In convex/auth.ts
afterUserCreatedOrUpdated: async (ctx, args) => {
  // args.userId = ID from auth tables

  await ctx.db.insert("users", {
    authUserId: args.userId,  // Create the link
    email: authUser.email,    // Copy auth data
    isManager: isFirstUser,   // Add business logic
    // ... other business fields
  });
}
```

#### 5. **Retrieving Linked Data**

To get business user data from auth context:

```typescript
export const loggedInUser = query({
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);  // Get auth user ID

    // Find linked business user
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .first();

    return user;  // Business user with roles, permissions, etc.
  },
});
```

### Benefits of This Architecture

- **Separation of Concerns**: Auth security separate from business logic
- **Flexibility**: Add business fields without affecting authentication
- **Performance**: Indexed lookups for efficient user data retrieval
- **Security**: Convex Auth handles sensitive auth operations
- **Maintainability**: Clear separation between auth and application data

### Visual Representation

```
┌─────────────────────┐       ┌──────────────────────┐
│   Auth Tables       │       │   Business Users     │
│   (Convex Auth)     │       │   Table              │
├─────────────────────┤       ├──────────────────────┤
│ _id: "auth123"      │◄──────┤ authUserId: "auth123"│
│ email: "user@ex.com"│       │ isManager: true      │
│ name: "John Doe"    │       │ isActive: true       │
│ passwordHash: "..." │       │ defaultPrivileges: {}│
│ emailVerified: true │       │ moduleExceptions: [] │
│ (other auth data)   │       │ (business fields...) │
└─────────────────────┘       └──────────────────────┘
          ▲                            │
          │                            │
          └────────── Linked via authUserId
```

## Developing and Deploying Your App

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve your app further

## HTTP API

User-defined HTTP routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.

## Dependencies

### Core Dependencies
- **Convex**: Backend-as-a-Service platform with real-time data
- **React**: Frontend framework with TypeScript
- **Vite**: Build tool and development server
- **Convex Auth**: Authentication and user management
- **shadcn/ui**: Modern UI component library

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Sonner**: Toast notifications


### External APIs
- **ExchangeRate-API.com**: Live exchange rate data provider
  - Free tier: ~1,500 requests/month
  - Real-time rate updates (when manually requested)
  - No API key required for basic usage
  - Supports all major world currencies
  - **Used only for exchange rates** - no currency metadata

### External Libraries
- **world-currencies**: NPM package for denomination reference data
  - 153+ currencies with standard coin and banknote denominations
  - Used as **creation assistant only** - never by app functionality
  - Community-maintained denomination data with proper TypeScript support
  - Offline operation - no API calls during normal use
  - **Database remains single source of truth** for all app operations

## Development Notes

### Single Source of Truth
- **Currency symbols and metadata**: Stored exclusively in database, no hardcoded fallbacks
- **Denominations**: Stored exclusively in database, external library used only for creation assistance
- **User permissions**: Managed through database configuration only
- **System settings**: Configurable via settings table, not environment variables
- **Exchange rates**: Fetched from APIs but stored in database as cache

### Security Considerations
- No browser-based privilege escalation allowed
- All user management requires proper authentication
- Invitation tokens have expiration and single-use policies
- Financial permissions separated from general user permissions

## Environment Configuration

No additional environment variables are required:
- Free tier APIs that don't require API keys
- Public endpoints for exchange rate data only
- All currency metadata managed through database
- Initial setup creates all necessary configuration

For production deployments with higher volume needs, consider upgrading to paid API tiers.

## License

This project is licensed under the MIT License.

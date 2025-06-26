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

**Automatic Initial Setup:**
When you first start the application with an empty database, you'll see an automatic setup screen:

1. **Initial Setup Form**: The app detects when no users exist and shows a setup wizard
2. **Create Admin Account**: Fill in your email, full name, and password
3. **Automatic Seeding**: The system will automatically create:
   - Your admin account with full manager privileges
   - 8 common currencies (USD, CAD, EUR, GBP, JPY, AUD, CHF, MXN) with proper symbols
   - Basic system settings and compliance limits
   - Common ID document types for customer onboarding
4. **Ready to Use**: You'll be automatically signed in and ready to start using the system

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

#### Pre-seeded Currencies
The system comes with 8 common currencies pre-configured:
- USD ($), CAD ($), EUR (€), GBP (£), JPY (¥), AUD ($), CHF (Fr), MXN ($)

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

## Development Notes

### Single Source of Truth
- **Currency symbols and metadata**: Stored exclusively in database, no hardcoded fallbacks
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

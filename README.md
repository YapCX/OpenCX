# OpenCX App

This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.

## Getting Started

To set up your own instance of this project:

1. **Clone the repository**
2. **Set up Convex**: Create your own [Convex](https://convex.dev) deployment
3. **Configure environment**: Run `npm run dev` to set up your environment variables
4. **Install dependencies**: `npm install`
5. **Start development**: `npm run dev`

## Features

### 💱 Currency Management System

OpenCX includes a comprehensive currency management system with automatic data population and live exchange rates.

#### Auto-Population of Currency Data
- **Comprehensive Database**: Supports 162+ world currencies using the [world-countries](https://www.npmjs.com/package/world-countries) package
- **Automatic Details**: When entering a 3-letter currency code (e.g., CAD, EUR, JPY), the system automatically populates:
  - Currency name (e.g., "Canadian Dollar")
  - Country/region (e.g., "Canada")
  - Flag emoji (e.g., 🇨🇦)
  - Live market exchange rate

#### Live Exchange Rate Integration
- **API Provider**: [ExchangeRate-API.com](https://exchangerate-api.com/) free tier
- **Automatic Fetching**: Market rates are automatically fetched when currency codes are entered
- **Real-time Updates**: Rates update automatically with timestamps showing last fetch time
- **Manual Refresh**: Users can manually refresh rates using the "Refresh" button
- **Base Currency Support**: Configurable base currency (default: USD) for all exchange rate calculations

#### Rate Configuration
- **Market Rate**: Automatically fetched live spot rate (read-only)
- **Buy/Sell Rates**: Calculated automatically based on discount/markup percentages
- **Manual Override**: Option to manually set buy/sell rates if needed
- **Percentage-based Pricing**: Configure discount percentage for buying and markup percentage for selling

#### API Details
```
Endpoint: https://api.exchangerate-api.com/v4/latest/{baseCurrency}
Method: GET
Rate Limit: ~1,500 requests/month (free tier)
Update Frequency: Daily
Response Format: JSON with currency rates object
```

Example API response:
```json
{
  "rates": {
    "CAD": 1.3456,
    "EUR": 0.8234,
    "GBP": 0.7891
  },
  "base": "USD",
  "date": "2024-01-15"
}
```

#### Usage Example
1. **Enter Currency Code**: Type "CAD" in the currency code field
2. **Auto-Population**: System automatically fills:
   - Name: "Canadian Dollar"
   - Country: "Canada"
   - Flag: 🇨🇦
   - Market Rate: 1.3456 (live from API)
3. **Configure Rates**: Set discount/markup percentages
4. **Save**: Buy/sell rates calculated automatically

## Project Structure

The frontend code is in the `src` directory and is built with [Vite](https://vitejs.dev/).

The backend code is in the `convex` directory.

`npm run dev` will start the frontend and backend servers.

## App Authentication

This app uses [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and Deploying Your App

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve your app further

## HTTP API

User-defined HTTP routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.

## Dependencies

### Core Dependencies
- **Convex**: Backend-as-a-Service platform
- **React**: Frontend framework with TypeScript
- **Vite**: Build tool and development server

### Currency System Dependencies
- **world-countries**: Comprehensive country and currency data package
  - Provides 162+ currencies with names, countries, and flag emojis
  - Maintained and up-to-date with recent changes (e.g., Croatia adopting Euro)
  - Zero dependencies, TypeScript support included

### External APIs
- **ExchangeRate-API.com**: Live exchange rate data provider
  - Free tier: ~1,500 requests/month
  - Daily rate updates
  - No API key required for basic usage
  - Supports all major world currencies

## Environment Configuration

No additional environment variables are required for the currency system as it uses:
- Free tier APIs that don't require API keys
- Public endpoints for currency and exchange rate data

For production deployments with higher volume needs, consider upgrading to paid API tiers.

## License

This project is licensed under the MIT License.

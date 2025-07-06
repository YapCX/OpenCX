# OpenCX

A comprehensive currency exchange management system built with modern web technologies.

## Features

### Core System
- **Customer Management**: Complete customer database with KYC/AML compliance
- **Currency Exchange**: Real-time exchange rates and transaction processing
- **Till Management**: Cash drawer tracking and reconciliation
- **Transaction History**: Detailed audit trails and reporting

### Settings Module
- **Currency Settings**: Base currency configuration, exchange rate defaults, and service fee management
- **Company Settings**: Business information, contact details, regulatory compliance, and branding
- **Compliance & AML**: Anti-money laundering controls, risk thresholds, sanctions screening, and automated reporting

### Technology Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, and Tailwind CSS
- **Backend**: Convex serverless platform with real-time database
- **Authentication**: Clerk for secure user management
- **UI Components**: shadcn/ui with modern design system
- **Data**: World currencies and countries integration

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Convex account
- Clerk account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nextjs-clerk-shadcn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```

4. **Configure Clerk Authentication**
   - Create a Clerk application
   - Set up JWT templates in Clerk dashboard
   - Configure environment variables:
     ```bash
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
     CLERK_SECRET_KEY=your_clerk_secret_key
     CLERK_JWT_ISSUER_DOMAIN=your_clerk_jwt_issuer_domain
     ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

### Initial Setup
1. Access the application at `http://localhost:3000`
2. Sign up/sign in using Clerk authentication
3. Configure your settings in the Settings module
4. Start managing currency exchanges

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── settings/          # Settings module pages
│   │   ├── currency/      # Currency configuration
│   │   ├── company/       # Company information
│   │   └── compliance/    # AML/Compliance settings
│   ├── customers/         # Customer management
│   ├── orders/           # Transaction processing
│   └── tills/            # Cash drawer management
├── components/           # Reusable UI components
├── convex/              # Convex backend functions
├── lib/                 # Utility functions
└── types/               # TypeScript type definitions
```

## Settings Module

### Currency Settings
- **Base Currency**: Configure the primary currency for your exchange
- **Exchange Rate Defaults**: Set default discount/markup percentages
- **Service Fees**: Configure transaction fees
- **Rate Calculation Preview**: Real-time preview of buy/sell rates

### Company Settings
- **Business Information**: Company name, registration numbers, business type
- **Contact Details**: Address, phone, email, website
- **Regulatory Information**: Compliance officer, regulatory body
- **Branding**: Logo, color scheme customization

### Compliance & AML
- **Screening Configuration**: Automated sanctions list checking
- **Risk Thresholds**: Low/medium/high risk score ranges
- **Transaction Limits**: Daily and per-transaction limits
- **Automated Actions**: Auto-hold, reporting, approval workflows
- **Data Retention**: Compliance data retention periods

## Role-Based Access Control

- **Manager**: Full access to all settings and system configuration
- **Compliance Officer**: Access to AML/compliance settings
- **User**: Limited access based on assigned permissions

## Security Features

- **Clerk Authentication**: Secure user management and session handling
- **Role-Based Permissions**: Granular access control
- **Audit Trails**: All setting changes are logged
- **Data Validation**: Comprehensive input validation and sanitization

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=

# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [Convex documentation](https://docs.convex.dev/)
- Review [Clerk documentation](https://clerk.com/docs)

# OpenCX

A currency exchange management system built with modern web technologies.

## Technology Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, and Tailwind CSS
- **Backend**: Convex serverless platform with real-time database
- **Authentication**: Clerk for secure user management
- **UI Components**: shadcn/ui with modern design system

## Quick Start

### Prerequisites
- Node.js 18+
- Convex account
- Clerk account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Convex**
   ```bash
   npx convex dev
   ```

3. **Configure environment variables**
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   CONVEX_DEPLOYMENT=your_convex_deployment
   NEXT_PUBLIC_CONVEX_URL=your_convex_url
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── app/                    # Next.js App Router pages
├── components/           # Reusable UI components
├── convex/              # Convex backend functions
├── lib/                 # Utility functions
└── types/               # TypeScript type definitions
```

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

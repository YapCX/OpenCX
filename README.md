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
- [Convex account](https://convex.dev) (free tier available)
- [Clerk account](https://clerk.com) (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd OpenCX
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up external services**
   
   **Clerk Authentication:**
   - Create a new application at [Clerk Dashboard](https://dashboard.clerk.com)
   - Copy your publishable key and secret key
   
   **Convex Backend:**
   - Create an account at [Convex](https://convex.dev)
   - The Convex deployment will be automatically created when you run the dev server

4. **Configure environment variables**
   
   Create a `.env.local` file in the root directory with your Clerk credentials:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```
   
   > **Note**: Convex environment variables (`CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`) are automatically generated and saved to `.env.local` when you run the development server.

5. **Run the development server**
   ```bash
   npm run dev
   ```
   
   This command will:
   - Automatically provision a Convex deployment
   - Start the Convex backend
   - Start the Next.js frontend
   - Open the Convex dashboard in your browser

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000) in your browser
   - The system will guide you through the initial setup wizard on first visit

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

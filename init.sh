#!/bin/bash

# OpenCX Development Environment Setup Script
# This script sets up the development environment for the OpenCX currency exchange management system

set -e

echo "=================================================="
echo "   OpenCX - Currency Exchange Management System   "
echo "   Development Environment Setup                  "
echo "=================================================="
echo ""

# Check for required tools
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✓ Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed."
    exit 1
fi
echo "✓ npm $(npm -v)"

# Check for npx (needed for Convex)
if ! command -v npx &> /dev/null; then
    echo "ERROR: npx is not installed."
    exit 1
fi
echo "✓ npx available"

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Setting up Convex..."
# Initialize Convex if not already initialized
if [ ! -f "convex/_generated/api.d.ts" ]; then
    echo "Initializing Convex project..."
    npx convex dev --once --configure=new
else
    echo "Convex already configured."
fi

echo ""
echo "=================================================="
echo "   Starting Development Servers                   "
echo "=================================================="
echo ""

# Start Convex dev server in background
echo "Starting Convex backend..."
npx convex dev &
CONVEX_PID=$!
echo "Convex dev server started (PID: $CONVEX_PID)"

# Give Convex a moment to start
sleep 3

# Start Vite dev server
echo ""
echo "Starting Vite frontend server..."
npm run dev &
VITE_PID=$!
echo "Vite dev server started (PID: $VITE_PID)"

# Wait a moment for servers to fully start
sleep 5

echo ""
echo "=================================================="
echo "   OpenCX Development Environment Ready!          "
echo "=================================================="
echo ""
echo "Access the application:"
echo "  Frontend:  http://localhost:5173"
echo "  Convex:    https://dashboard.convex.dev"
echo ""
echo "Running processes:"
echo "  Convex Dev Server: PID $CONVEX_PID"
echo "  Vite Dev Server:   PID $VITE_PID"
echo ""
echo "To stop the servers, run:"
echo "  kill $CONVEX_PID $VITE_PID"
echo ""
echo "Or press Ctrl+C to stop all processes."
echo "=================================================="

# Wait for interrupt
wait

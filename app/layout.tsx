import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenCX - Currency Exchange Management",
  description: "Open-source currency exchange management platform",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider 
          dynamic
          appearance={{
            elements: {
              formFooter: { display: "none" },
              footerAction: { display: "none" },
              footerActionLink: { display: "none" },
              footer: { display: "none" },
              socialButtonsBlockButton: { display: "none" },
              dividerRow: { display: "none" },
              formButtonPrimary: "bg-primary hover:bg-primary/90",
              card: "shadow-none border",
              headerTitle: "text-2xl font-bold",
              headerSubtitle: "text-muted-foreground"
            },
            layout: {
              socialButtonsPlacement: "bottom",
              showOptionalFields: false,
            }
          }}
        >
          <ThemeProvider
            defaultTheme="system"
            storageKey="opencx-theme"
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}

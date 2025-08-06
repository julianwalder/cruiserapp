import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DateFormatProvider } from "@/contexts/DateFormatContext";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cruiser Aviation Management System",
  description: "Modern flight school management with user management, aircraft tracking, and scheduling",
  metadataBase: new URL('https://app.cruiseraviation.com'),
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    title: "Cruiser Aviation Management System",
    description: "Modern flight school management with user management, aircraft tracking, and scheduling",
    url: 'https://app.cruiseraviation.com',
    siteName: 'Cruiser Aviation',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Cruiser Aviation Management System - Flight Hours, Landings, Pilots, and Students Statistics',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Cruiser Aviation Management System",
    description: "Modern flight school management with user management, aircraft tracking, and scheduling",
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Cruiser Aviation Management System - Flight Hours, Landings, Pilots, and Students Statistics',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DateFormatProvider>
            <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
              {children}
              <Toaster />
            </div>
            <SpeedInsights />
          </DateFormatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

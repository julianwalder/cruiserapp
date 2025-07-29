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

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TripSync — shared trip calendar, no login",
  description:
    "Paste a day-by-day itinerary, get a shared visual hourly calendar. Anyone with the link can view and edit. No login, no app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#FAF7F2] text-[#1a1a1a]">
        {children}
      </body>
    </html>
  );
}

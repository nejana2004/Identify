import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Identify - Boards, posts, cards, and trust",
  description: "Identify is a knowledge-first platform for boards, posts, cards, search, and transparent trust signals.",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetBrainsMono.variable} antialiased min-h-screen bg-[#050508] text-[#F0F0F5]`}
      >
        <Header />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}

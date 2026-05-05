import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retrolog",
  description: "AI-powered retroactive time tracker",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900">{children}</body>
    </html>
  );
}

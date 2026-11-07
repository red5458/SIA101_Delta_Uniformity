import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
  variable: "--font-poppins",
  preload: true,
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Uniformity | BU Polangui Campus Marketplace",
  description:
    "Buy and sell pre-loved uniforms, department shirts, and course equipment within Bicol University Polangui. Meet on campus, pay in cash.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}

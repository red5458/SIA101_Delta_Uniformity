import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Poppins } from "next/font/google";
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { Toaster } from "sonner";
import { NavigationTransition } from "@/components/layout/navigation-transition";
import { ServiceWorkerRegistration } from "@/components/pwa/register-sw";
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
  applicationName: "Uniformity",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Uniformity",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#235823",
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
        <ServiceWorkerRegistration />
        <Suspense fallback={children}>
          <NavigationTransition>{children}</NavigationTransition>
        </Suspense>
        <Toaster
          theme="light"
          position="top-center"
          closeButton
          duration={3800}
          gap={10}
          offset="16px"
          mobileOffset="12px"
          toastOptions={{
            classNames: {
              toast: "!rounded-2xl !border-line !bg-white !text-ink !shadow-card",
              title: "!text-sm !font-semibold !text-ink",
              description: "!text-xs !text-muted",
              closeButton: "!border-line !bg-white !text-muted hover:!bg-brand-50",
              success: "!border-brand-200",
              info: "!border-brand-200",
              warning: "!border-gold-200",
              error: "!border-red-200",
            },
          }}
          icons={{
            success: <CheckCircle2 className="h-5 w-5 text-brand-700" />,
            info: <Info className="h-5 w-5 text-brand-600" />,
            warning: <TriangleAlert className="h-5 w-5 text-gold-700" />,
            error: <CircleAlert className="h-5 w-5 text-red-600" />,
            close: <X className="h-3.5 w-3.5" />,
          }}
        />
      </body>
    </html>
  );
}

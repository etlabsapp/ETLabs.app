import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./site.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0f1c",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://etlabs.app"),
  title: "ET Labs | Software Should Support Life, Not Consume It",
  description:
    "ET Labs builds calm, thoughtful software—including SleepTight: DreamWrite for sleep and nap guidance—designed to help people accomplish something meaningful, then return to their lives.",
  openGraph: {
    type: "website",
    title: "ET Labs | Software Should Support Life, Not Consume It",
    description:
      "Intentional software from a small studio. SleepTight: DreamWrite is on the App Store—with more calm, finishable tools to come.",
    images: ["/apps/sleeptight/images/hero-phone.webp"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

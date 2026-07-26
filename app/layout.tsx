import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  const origin = host
    ? `${protocol}://${host}`
    : "https://affinity-india.local";
  const title = "Affinity India — AI Affiliate Commerce";
  const description =
    "Rank affiliate product opportunities across India’s leading marketplaces and generate promotion-ready content.";

  return {
    metadataBase: new URL(origin),
    title: {
      default: title,
      template: "%s · Affinity India",
    },
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: [
        {
          url: new URL("/og.png", origin).toString(),
          width: 1733,
          height: 907,
          alt: "Affinity India product opportunity dashboard",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/og.png", origin).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

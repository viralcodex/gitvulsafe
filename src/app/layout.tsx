import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/providers/themeProvider";
import { NetworkStatusProvider } from "@/providers/networkStatusProvider";
import RepoBranchProvider from "@/providers/repoBranchProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "auto", // Improves font loading performance
});

export const metadata: Metadata = {
  title: "GitVulSafe",
  description: "A tool for analysing dependencies for security vulnerabilities",
  openGraph: {
    title: "GitVulSafe",
    description:
      "A tool for analysing dependencies for security vulnerabilities",
    url: "https://GitVulSafe.com",
    siteName: "GitVulSafe",
  },
  keywords: [
    "dependency analysis",
    "security vulnerabilities",
    "open source",
    "software security",
    "vulnerability scanning",
    "package management",
    "ai insights",
    "generative ai",
    "software development",
    "devsecops",
    "cybersecurity",
    "npm",
    "yarn",
    "pip",
    "maven",
    "gradle",
    "ruby gems",
    "cargo",
    "nuget",
  ],
  authors: [{ name: "Aviral Shukla", url: "https://github.com/viralcodex" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} `}>
      <head>
        <link rel="preload" href="/bg.svg" as="image" type="image/svg+xml" />
        <link rel="preload" href="/file.svg" as="image" type="image/svg+xml" />
      </head>
      <body className="flex h-screen flex-col bg-background bg-repeat bg-[size:300px_300px] bg-[url('/bg.svg')] bg-blend-multiply relative">
        <SpeedInsights/>
        <ThemeProvider>
          <RepoBranchProvider>
            <NetworkStatusProvider>
                <Header />
                <main className="flex-grow pt-16">{children}</main>
                <Toaster />
            </NetworkStatusProvider>
          </RepoBranchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

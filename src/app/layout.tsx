import type { Metadata, Viewport } from "next";
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
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "GitVulSafe - Dependency Vulnerability Scanner & Security Analysis Tool",
  description: "Visualize, detect and fix dependency vulnerabilities in your codebase with AI-powered insights. Analyze GitHub repositories and manifest files for security risks across npm, pip, Maven, and more. Free open-source dependency scanner.",
  openGraph: {
    title: "GitVulSafe - Dependency Vulnerability Scanner & Security Analysis Tool",
    description:
      "Visualize, detect and fix dependency vulnerabilities in your codebase with AI-powered insights. Analyze GitHub repositories and manifest files for security risks across npm, pip, Maven, and more.",
    url: "https://GitVulSafe.com",
    siteName: "GitVulSafe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitVulSafe - Dependency Vulnerability Scanner",
    description: "Visualize, detect and fix dependency vulnerabilities in your codebase with AI-powered insights.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL("https://GitVulSafe.com"),
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
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

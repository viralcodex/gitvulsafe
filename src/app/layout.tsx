import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/providers/theme-provider";
import { TextSelectionProvider } from "@/providers/text-selection-provider";
import FloatingAiForm from "@/components/floating-ai-form";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Dep Hound",
  description: "A tool for analysing dependencies for security vulnerabilities",
  openGraph: {
    title: "Dep Hound",
    description:
      "A tool for analysing dependencies for security vulnerabilities",
    url: "https://dephound.com", 
    siteName: "Dep Hound",
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
  authors: [
    {name: "Aviral Shukla",
      url: "https://github.com/viralcodex"
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} `}>
      <body className="flex h-screen flex-col bg-background bg-repeat bg-[size:300px_300px] bg-[url('/bg.svg')] bg-blend-multiply relative">
        <ThemeProvider>
          <TextSelectionProvider>
            <Header />
            <main className="flex-grow pt-16">{children}</main>
            <FloatingAiForm />
            <Toaster />
          </TextSelectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

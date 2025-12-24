import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | GitVulSafe",
  description: "The page you're looking for doesn't exist. Return to GitVulSafe to analyze your dependencies for security vulnerabilities.",
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center space-y-6 p-8 flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-semibold">Repository Not Found</h2>
        <p className="max-w-md">
          Oops! The repository you&apos;re looking for doesn&apos;t exist or may
          have been moved.
        </p>
        <Button className="gap-0 bg-muted-foreground text-accent-foreground font-semibold sm:text-lg text-md hover:bg-accent">
          <Link href="/">Go Home</Link>
          <div></div>
        </Button>
      </div>
    </div>
  );
}

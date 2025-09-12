"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import Link from "next/link";

interface GithubDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pat: string) => void;
}

export function GithubDialog({
  isOpen,
  onClose,
  onSubmit,
}: GithubDialogProps) {
  const [pat, setPat] = useState<string>("");

  useEffect(() => {
    const storedPat = localStorage.getItem("github_pat");
    if (storedPat) {
      setPat(storedPat);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(pat);
    setPat("");
  };

  const handleClear = () => {
    localStorage.removeItem("github_pat");
    setPat("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-[2px] border-accent bg-background p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary-foreground">
            Enter GitHub Personal Access Token
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm">
            To enable private repositories, you&apos;ll need to provide a GitHub
            Personal Access Token with repo scope. The token will be stored
            locally in your browser. Find out how{" "}
            <Link
              href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
              className="underline text-primary-foreground transition-colors duration-200 hover:text-muted-foreground"
            >
              here
            </Link>
            .
          </div>
          <details className="group text-sm [&>summary:focus-visible]:outline-none">
            <summary className="cursor-pointer font-medium text-primary-foreground hover:text-muted-foreground">
              Data storage disclaimer
            </summary>
            <div className="animate-accordion-down mt-2 space-y-2 overflow-hidden pl-2">
              <p>
                Take note that the diagram data will be stored in my database
                (not that I would use it for anything anyways). You can also
                self-host this app by following the instructions in the{" "}
                <Link
                  href="https://github.com/viralcodex/depsec"
                  className="underline text-primary-foreground dark:text-[hsl(var(--text-color-link))] transition-colors duration-200 hover:text-muted-foreground"
                >
                  README
                </Link>
                .
              </p>
            </div>
          </details>
          <Input
            type="password"
            placeholder="github_pat..."
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            className="flex-1 rounded-md border-[3px] border-black px-3 py-2 text-base font-bold shadow-[4px_4px_0_0_#000000] placeholder:text-base placeholder:font-normal"
            required
          />
          <div className="flex w-full flex-row justify-center items-center">
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleClear}
                className="border-[3px] bg-primary-foreground border-black px-4 py-2 text-black shadow-[4px_4px_0_0_#000000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-gray-200"
              >
                Clear Token
              </Button>
              <Button
                type="submit"
                disabled={!pat.startsWith("github_pat")}
                className="border-[3px] bg-muted text-accent border-black px-4 py-2 shadow-[4px_4px_0_0_#000000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-background disabled:opacity-50"
              >
                Save Token
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

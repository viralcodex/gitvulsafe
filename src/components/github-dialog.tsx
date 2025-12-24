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

export function GithubDialog({ isOpen, onClose, onSubmit }: GithubDialogProps) {
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
      <DialogContent className="border-[2px] border-accent bg-background shadow-[1px_1px_10px_2px_#000000] p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary-foreground">
            Enter GitHub Personal Access Token
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="GitHub Personal Access Token configuration">
          <div className="text-sm" role="note" id="pat-description">
            To enable private repositories and increased request limits (5000
            req/hour), you&apos;ll need to provide a GitHub Personal Access
            Token with repo scope. This token is only used for making API calls
            to Github API and it is stored locally in your browser.
          </div>
          <details className="group text-sm [&>summary:focus-visible]:outline-none" aria-label="Data storage information">
            <summary className="cursor-pointer font-medium text-primary-foreground hover:text-muted-foreground" tabIndex={0}>
              Data storage disclaimer
            </summary>
            <div className="animate-accordion-down mt-2 space-y-2 overflow-hidden pl-2">
              <p>
                The Github PAT you provide is stored locally in your browser and
                not used by me in any manner. If you still don&apos;t feel like
                sharing your token, You can also self-host this app by following
                the instructions here...{" "}
                <Link
                  href="https://github.com/viralcodex/gitvulsafe#readme"
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
            aria-label="GitHub Personal Access Token"
            aria-describedby="pat-description"
          />
          <div className="flex w-full flex-row justify-center items-center">
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleClear}
                className="border-[3px] bg-primary-foreground border-black px-4 py-2 text-black shadow-[4px_4px_0_0_#000000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-gray-200"
                aria-label="Clear stored GitHub token"
              >
                Clear Token
              </Button>
              <Button
                type="submit"
                disabled={!pat.startsWith("github_pat")}
                className="border-[3px] bg-muted text-accent border-black px-4 py-2 shadow-[4px_4px_0_0_#000000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-background disabled:opacity-50"
                aria-label="Save GitHub token"
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

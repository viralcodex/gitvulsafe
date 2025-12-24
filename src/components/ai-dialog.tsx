"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import Link from "next/link";

interface AiDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (apiKey: string) => void;
}

export function AiDialog({ isOpen, onClose, onSubmit }: AiDialogProps) {
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    const storedKey = localStorage.getItem("openai_key");
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(apiKey);
    setApiKey("");
  };

  const handleClear = () => {
    localStorage.removeItem("openai_key");
    setApiKey("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-[3px] border-accent bg-background p-6 shadow-[1px_1px_10px_2px_#000000] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary-foreground">
            Enter Gemini API Key
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Gemini API key configuration">
          <div className="text-sm" role="note">
            You can provide an Gemini API key to generate AI insights and Fix
            Plans. The key will be stored locally in your browser.
            <br />
            <br />
            <span className="font-medium">Get your Gemini API key </span>
            <Link
              href="https://aistudio.google.com/app/apikey"
              className="underline text-primary-foreground transition-colors duration-200 hover:text-muted-foreground"
              aria-label="Get Gemini API key (opens in new window)"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </Link>
            .
          </div>
          <details className="group text-sm [&>summary:focus-visible]:outline-none" aria-label="Data storage information">
            <summary className="cursor-pointer font-medium text-primary-foreground hover:text-muted-foreground" tabIndex={0}>
              Data storage disclaimer
            </summary>
            <div className="animate-accordion-down mt-2 space-y-2 overflow-hidden pl-2">
              <p>
                All your API keys are stored locally in your browser and not
                used by me in any manner. If you still don&apos;t feel like
                sharing your key, you can also <b>self-host</b> this app by
                following the instructions here...{" "}
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
            placeholder="AI..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 rounded-md border-[3px] border-black px-3 py-2 text-base font-bold shadow-[4px_4px_0_0_#000000] placeholder:text-base placeholder:font-normal"
            required
            aria-label="Gemini API key"
            aria-describedby="api-key-description"
          />
          <div className="flex items-center justify-center">
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleClear}
                className="border-[3px] bg-primary-foreground border-black px-4 py-2 text-black shadow-[4px_4px_0_0_#000000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-gray-200"
                aria-label="Clear stored API key"
              >
                Clear Key
              </Button>
              <Button
                type="submit"
                disabled={!apiKey.startsWith("AI")}
                className="border-[3px] bg-muted text-accent border-black px-4 py-2 shadow-[4px_4px_0_0_#000000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-background disabled:opacity-50"
                aria-label="Save API key"
              >
                Save Key
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

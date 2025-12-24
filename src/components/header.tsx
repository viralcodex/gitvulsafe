"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AiDialog } from "./ai-dialog";
import { GithubDialog } from "./github-dialog";
import { useIsMobile } from "@/hooks/useMobile";
import { KeyRound, Menu, Sparkle, X } from "lucide-react";
import { GithubIcon } from "@/components/icons";

const Header = () => {
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [aiDialogOpen, setAIDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleResize = () => {
      if (!isMobile) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  return (
    <header
      className="absolute top-0 w-full border-primary border-b shadow-sm z-100"
      aria-label="Main site header"
    >
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center space-x-2"
          aria-label="Home Page - GitVulSafe"
        >
          <span className="text-lg font-bold">
            <span className="text-gray-200">Git</span>
            <span className="text-blue-500">Vulsafe</span>
          </span>
        </Link>
        <nav role="navigation" aria-label="Main navigation">
          {isMobile ? (
            <div className="relative">
              {isMenuOpen ? (
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="cursor-pointer text-white border-none bg-transparent"
                  aria-label="Close menu"
                  aria-expanded="true"
                >
                  <X />
                </button>
              ) : (
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="cursor-pointer text-white border-none bg-transparent"
                  aria-label="Open menu"
                  aria-expanded="false"
                >
                  <Menu />
                </button>
              )}
            </div>
          ) : (
            <ul className="flex space-x-4" role="list">
              <li>
                <Link
                  href="https://github.com/viralcodex/"
                  className="flex flex-row items-center space-x-1"
                  aria-label="Visit my GitHub profile"
                >
                  <GithubIcon className="text-white h-6 w-6" />
                  <span className="text-white">My Github</span>
                </Link>
              </li>
              <li className="flex flex-row items-center space-x-1">
                <KeyRound className="text-white" aria-hidden="true" />
                <button
                  onClick={() => setGithubDialogOpen(true)}
                  className="cursor-pointer border-none bg-transparent text-white"
                  aria-label="Set GitHub Personal Access Token"
                >
                  Github PAT
                </button>
              </li>
              <li className="flex flex-row items-center space-x-1">
                <Sparkle className="text-white" aria-hidden="true" />
                <button
                  onClick={() => setAIDialogOpen(true)}
                  className="cursor-pointer border-none bg-transparent text-white"
                  aria-label="Set AI API Key"
                >
                  AI API Key
                </button>
              </li>
            </ul>
          )}
        </nav>
        <GithubDialog
          isOpen={githubDialogOpen}
          onClose={() => setGithubDialogOpen(false)}
          onSubmit={(pat) => {
            localStorage.setItem("github_pat", pat);
            setGithubDialogOpen(false);
          }}
        />
        <AiDialog
          isOpen={aiDialogOpen}
          onClose={() => setAIDialogOpen(false)}
          onSubmit={(aiKey) => {
            localStorage.setItem("aiApiKey", aiKey);
            setAIDialogOpen(false);
          }}
        />
        {isMenuOpen && (
          <div
            className="flex flex-col absolute right-4 top-18 bg-background border rounded-md shadow-lg py-2"
            role="menu"
            aria-label="Mobile navigation menu"
          >
            <ul className="" role="list">
              <li
                className="flex flex-row items-center space-x-2 hover:bg-white/20 pt-2 pb-2 px-4"
                role="menuitem"
              >
                <Link
                  href="https://github.com/viralcodex/"
                  className="cursor-pointer"
                  aria-label="Visit my GitHub profile"
                >
                  <button>
                    <GithubIcon className="text-white h-6 w-6" />
                    My Github
                  </button>
                </Link>
              </li>
              <li
                className="flex flex-row items-center space-x-2 hover:bg-white/20 py-2 px-4"
                role="menuitem"
              >
                <KeyRound className="text-white" aria-hidden="true" />
                <button
                  onClick={() => setGithubDialogOpen(true)}
                  className="cursor-pointer border-none bg-transparent text-white"
                  aria-label="Set GitHub Personal Access Token"
                >
                  Github PAT
                </button>
              </li>
              <li
                className="flex flex-row items-center space-x-2 hover:bg-white/20 pt-2 pb-2 px-4"
                role="menuitem"
              >
                <Sparkle className="text-white" aria-hidden="true" />
                <button
                  onClick={() => setAIDialogOpen(true)}
                  className="cursor-pointer border-none bg-transparent text-white"
                  aria-label="Set AI API Key"
                >
                  AI API Key
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

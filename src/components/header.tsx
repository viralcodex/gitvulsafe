"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AiDialog } from "./ai-dialog";
import { GithubDialog } from "./github-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { KeyRound, Menu, Sparkle, X } from "lucide-react";
import { FaGithub } from "react-icons/fa";

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

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  return (
    <header className="absolute top-0 w-full border-primary border-b shadow-sm z-100">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-lg font-bold">
            <span className="text-gray-200">Git</span>
            <span className="text-blue-500">Vulsafe</span>
          </span>
        </Link>
        <nav>
          {isMobile ? (
            <div className="relative">
              {isMenuOpen ? (
                <X onClick={() => setIsMenuOpen(false)} className="cursor-pointer text-white"/>
              ) : (
                <Menu onClick={() => setIsMenuOpen(true)} className="cursor-pointer text-white"/>
              )}
            </div>
          ) : (
            <ul className="flex space-x-4">
              <li className="flex flex-row items-center space-x-1">
                <FaGithub color="white" size={24} />
                <Link href="https://github.com/viralcodex/" className=" ">
                  My Github
                </Link>
              </li>
              <li className="flex flex-row items-center space-x-1">
                <KeyRound className="text-white" />
                <span
                  onClick={() => setGithubDialogOpen(true)}
                  className=" cursor-pointer "
                >
                  Github PAT
                </span>
              </li>
              <li className="flex flex-row items-center space-x-1">
                <Sparkle className="text-white" />
                <span
                  onClick={() => setAIDialogOpen(true)}
                  className="cursor-pointer "
                >
                  AI API Key
                </span>
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
          <div className="flex flex-col absolute right-4 top-18 bg-background border rounded-md shadow-lg py-2">
            <ul className="">
              <li className="flex flex-row items-center space-x-2 hover:bg-white/20 pt-2 pb-2 px-4">
                <FaGithub color="white" size={24} />
                <Link href="https://github.com/viralcodex/" className=" ">
                  My Github
                </Link>
              </li>
              <li className="flex flex-row items-center space-x-2 hover:bg-white/20 py-2 px-4">
                <KeyRound className="text-white" />
                <span
                  onClick={() => setGithubDialogOpen(true)}
                  className=" cursor-pointer "
                >
                  Github PAT
                </span>
              </li>
              <li className="flex flex-row items-center space-x-2 hover:bg-white/20 pt-2 pb-2 px-4">
                <Sparkle className="text-white" />
                <span
                  onClick={() => setAIDialogOpen(true)}
                  className="cursor-pointer "
                >
                  AI API Key
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

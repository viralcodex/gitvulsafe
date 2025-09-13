"use client";
import Link from "next/link";
import React, { useState } from "react";
import { AiDialog } from "./ai-dialog";
import { GithubDialog } from "./github-dialog";
import Image from "next/image";

const Header = () => {
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [aiDialogOpen, setAIDialogOpen] = useState(false);

  return (
    <header className="absolute top-0 w-full border-primary border-b shadow-sm z-100">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-lg font-bold">
            <span className="text-gray-200">Dep</span>
            <span className="text-blue-500">Sec</span>
          </span>
        </Link>
        <nav>
          <ul className="flex space-x-4">
            <li className="flex flex-row items-center space-x-1">
              <Image
                src="github.svg"
                alt="DepSec Logo"
                width={20}
                height={20}
                className="rounded-full bg-accent p-0.5"
              />
              <Link
                href="https://github.com/viralcodex/"
                className=" hover:text-blue-500"
              >
                My Github
              </Link>
            </li>
            <li>
              <span
                onClick={() => setGithubDialogOpen(true)}
                className=" cursor-pointer hover:text-blue-500"
              >
                Github PAT
              </span>
            </li>
            <li>
              <span
                onClick={() => setAIDialogOpen(true)}
                className="cursor-pointer hover:text-blue-500"
              >
                AI API Key
              </span>
            </li>
          </ul>
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
      </div>
    </header>
  );
};

export default Header;

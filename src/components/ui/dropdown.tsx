"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DropdownProps {
  branches: string[];
  selectedBranch: string | null;
  onSelectBranch: (branch: string) => void;
  loadingBranches: boolean;
  setError: (error: string) => void;
  className?: string;
  isBranchDropdown?: boolean;
  hasMore: boolean;
  totalBranches: number;
  loadNextPage: () => void;
}

export function Dropdown({
  branches,
  selectedBranch,
  loadingBranches,
  hasMore,
  loadNextPage,
  onSelectBranch,
  setError,
  className,
  isBranchDropdown = true,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [shouldOpen, setShouldOpen] = useState(false);

  // Effect to determine if the dropdown should open based on branches
  useEffect(() => {
    if (branches.length) {
      setShouldOpen(true);
      setError("");
    } else {
      setShouldOpen(false);
      setOpen(false);
    }
  }, [branches, setError]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (loadingBranches) return;
    if (nextOpen && !shouldOpen) {
      setError("Please enter a valid GitHub repository URL first.");
      setOpen(false);
      return;
    }
    setOpen(nextOpen);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Trigger pagination when user is near the bottom (within 100px)
    if (distanceFromBottom <= 500 && hasMore && !loadingBranches) {
      console.log("Triggering loadNextPage");
      loadNextPage();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={loadingBranches || !shouldOpen}
          className={cn(
            "text-md w-full text-input justify-between overflow-y-hidden overflow-x-scroll scrollbar-background-hidden border-[3px] border-black p-4 transition-transform hover:text-secondary-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:transform hover:bg-gray-300 max-sm:w-full sm:p-6 group",
            !branches || branches.length === 0 ? "opacity-60 cursor-not-allowed" : "",
            className
          )}
        >
          {loadingBranches && !branches.length
            ? "Loading branches..."
            : selectedBranch
              ? selectedBranch
              : isBranchDropdown
                ? "Select Branch..."
                : "Select ecosystem"}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 border-black border-[3px]", className)}
      >
        <Command className="max-h-[400px] rounded-md">
          <CommandInput
            placeholder={
              isBranchDropdown ? "Search Branch..." : "Search Ecosystem..."
            }
            className="h-9"
          />
          <CommandList
            onScroll={handleScroll}
            className="max-h-[350px] scrollbar-background-bg scrollbar-background-thumb"
          >
            {!branches.length && !loadingBranches ? (
              <CommandEmpty>No branch found</CommandEmpty>
            ) : (
              <CommandGroup>
                {branches.map((branch) => (
                  <CommandItem
                    key={branch}
                    value={branch}
                    onSelect={(value: string) => {
                      onSelectBranch(value);
                      setOpen(false);
                    }}
                    className="whitespace-normal break-all cursor-pointer"
                  >
                    {branch}
                    <Check
                      className={cn(
                        "ml-auto",
                        selectedBranch === branch ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
                {/* Loading indicator for pagination */}
                {loadingBranches && branches.length > 0 && (
                  <CommandItem disabled className="justify-center">
                    <div className="flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin" />
                    </div>
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
          {!hasMore && branches.length > 0 && (
            <div className="p-2 text-center text-xs text-accent border-t">
              All {branches.length} branches loaded
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { FixedSizeList as List } from "react-window";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface VirtualDropdownProps {
  branches: string[];
  selectedBranch: string | null;
  onSelectBranch: (branch: string) => void;
  loadingBranches: boolean;
  setError: (error: string) => void;
  className?: string;
  isBranchDropdown?: boolean;
}

// Individual item component for virtualized list
interface VirtualizedItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    filteredBranches: string[];
    selectedBranch: string | null;
    onSelectBranch: (branch: string) => void;
    onClose: () => void;
  };
}

const VirtualizedItem = ({ index, style, data }: VirtualizedItemProps) => {
  const { filteredBranches, selectedBranch, onSelectBranch, onClose } = data;
  const branch = filteredBranches[index];

  return (
    <div
      style={style}
      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted-foreground hover:text-accent-foreground whitespace-normal break-all"
      onClick={() => {
        onSelectBranch(branch);
        onClose();
      }}
    >
      <span className="flex-1 truncate">{branch}</span>
      <Check
        className={cn(
          "ml-auto h-4 w-4 flex-shrink-0",
          selectedBranch === branch ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
};

export function VirtualDropdown({
  branches,
  selectedBranch,
  onSelectBranch,
  loadingBranches,
  setError,
  className,
  isBranchDropdown = true,
}: VirtualDropdownProps) {
  const [open, setOpen] = useState(false);
  const [shouldOpen, setShouldOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Debounced search to improve performance
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 200); // Increased debounce for better performance with large lists

    return () => clearTimeout(timer);
  }, [searchValue]);

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

  // Memoized filtered branches
  const filteredBranches = useMemo(() => {
    if (!debouncedSearchValue) return branches;

    return branches.filter((branch) =>
      branch.toLowerCase().includes(debouncedSearchValue.toLowerCase())
    );
  }, [branches, debouncedSearchValue]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (loadingBranches) return;
    if (nextOpen && !shouldOpen) {
      setError("Please enter a valid GitHub repository URL first.");
      setOpen(false);
      return;
    }
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchValue("");
    }
  };

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const itemData = useMemo(
    () => ({
      filteredBranches,
      selectedBranch,
      onSelectBranch,
      onClose: handleClose,
    }),
    [filteredBranches, selectedBranch, onSelectBranch, handleClose]
  );

  // Calculate optimal height based on number of items
  const listHeight = Math.min(300, filteredBranches.length * 36);

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
        className={cn("p-0 border-black border-[3px] w-full", className)}
        style={{
          width: "var(--radix-popover-trigger-width)",
          minWidth: "200px",
        }}
      >
        <Command className="max-h-[400px] rounded-md" shouldFilter={false}>
          <CommandInput
            placeholder={isBranchDropdown ? "Search branches..." : "Search"}
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[340px] overflow-hidden">
            {!filteredBranches.length ? (
              <CommandEmpty>
                {debouncedSearchValue
                  ? "No branches found"
                  : "No branches available"}
              </CommandEmpty>
            ) : (
              <CommandGroup className="p-0">
                <List
                  height={listHeight}
                  width="100%"
                  itemCount={filteredBranches.length}
                  itemSize={36}
                  itemData={itemData}
                  overscanCount={5} // Render 5 extra items for smooth scrolling
                  className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                >
                  {VirtualizedItem}
                </List>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

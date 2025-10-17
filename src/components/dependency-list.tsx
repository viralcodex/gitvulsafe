import { useEffect, useState, useRef } from "react";
import {
  GitGraphIcon,
  LucideLoader2,
  LucideMinus,
  LucidePlus,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Dependency } from "@/constants/model";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  dependencies: { [technology: string]: Dependency[] };
  isLoading?: boolean;
  error?: string;
}

export function AppSidebar({
  dependencies,
  isLoading,
  ...props
}: AppSidebarProps) {
  const [openGroups, setOpenGroups] = useState<{ [tech: string]: boolean }>({});
  const [search, setSearch] = useState("");
  const prevOpenGroups = useRef<{ [tech: string]: boolean }>({});

  useEffect(() => {
    if (search) {
      // Only open all groups if not already all open (prevents infinite loop)
      if (Object.keys(prevOpenGroups.current).length === 0) {
        prevOpenGroups.current = openGroups;
        const allOpen: { [tech: string]: boolean } = {};
        Object.keys(dependencies).forEach((tech) => {
          allOpen[tech] = true;
        });
        setOpenGroups(allOpen);
      }
    } else {
      // Restore previous state when search is cleared
      if (Object.keys(prevOpenGroups.current).length > 0) {
        setOpenGroups(prevOpenGroups.current);
        prevOpenGroups.current = {};
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const toggleGroup = (tech: string) => {
    setOpenGroups((prev) => ({ ...prev, [tech]: !prev[tech] }));
  };

  // Always expand all groups when searching
  const isSearching = !!search;

  return (
    <Sidebar {...props} className="">
      <SidebarHeader>
        <div className="flex flex-row items-center justify-items-start gap-x-3 text-foreground p-2">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <GitGraphIcon className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-medium">Dependencies</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="rounded-b-lg">
        <Command className="p-2 border-t-1 border-accent ">
          <CommandInput
            placeholder="Select Dependency..."
            className="h-full"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="scrollbar-background-bg scrollbar-background-thumb">
            {!isLoading &&
            dependencies &&
            Object.keys(dependencies).length > 0 ? (
              Object.entries(dependencies).map(([tech, deps]) => (
                <CommandGroup key={tech} className="w-full my-2 gap-x-2">
                  <div
                    className="flex items-center cursor-pointer text-lg font-bold select-none mb-1"
                    onClick={() => toggleGroup(tech)}
                  >
                    <span className="mr-2 text-lg">
                      {isSearching || openGroups[tech] ? (
                        <LucideMinus />
                      ) : (
                        <LucidePlus />
                      )}
                    </span>
                    {tech}
                  </div>
                  {(isSearching || openGroups[tech]) &&
                    deps.map((dep) => (
                      <CommandItem
                        key={`@${dep.name}@${dep.version}@${dep.ecosystem}`}
                      >
                        <span>{dep.name}</span>
                        <span className="ml-auto text-xs pr-2">
                          {dep.version}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))
            ) : isLoading ? (
              <div className="flex flex-row items-center justify-center gap-x-2 -translate-x-2">
                <CommandEmpty>
                  <LucideLoader2 className="animate-spin" strokeWidth={3} />
                </CommandEmpty>
                <CommandEmpty>Loading Dependencies...</CommandEmpty>
              </div>
            ) : (
              <CommandEmpty>No Dependencies found</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

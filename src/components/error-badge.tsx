import React from "react";
import { Badge } from "./ui/badge";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ErrorBadgeProps {
  errorMsgs: string[];
  isMobile?: boolean;
}

const ErrorBadge = (props: ErrorBadgeProps) => {
  const { errorMsgs, isMobile } = props;

  const [errorClicked, setErrorClicked] = useState(false);

  if (!errorMsgs || !errorMsgs.length) return null;

  const hasMultipleErrors = errorMsgs.length > 1;
  const badgeHeight =
    errorClicked && hasMultipleErrors
      ? `${Math.min(errorMsgs.length * 2.5 + 2, 12)}rem`
      : "2rem";

  return (
    <button
      className={cn(
        "absolute bottom-4 flex flex-col justify-end px-4 cursor-pointer z-100 border-none bg-transparent",
        isMobile ? "w-[70%]" : "w-fit max-w-[75%]"
      )}
      onMouseEnter={() => setErrorClicked(true)}
      onMouseLeave={() => setErrorClicked(false)}
      onClick={() => setErrorClicked(!errorClicked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setErrorClicked(!errorClicked);
        }
      }}
      style={{
        height: errorClicked && hasMultipleErrors ? badgeHeight : "2rem",
      }}
      aria-label={`${errorMsgs.length} error${errorMsgs.length > 1 ? 's' : ''} found. Click to ${errorClicked ? 'collapse' : 'expand'}`}
      aria-expanded={errorClicked}
      role=""
    >
      <Badge
        className={cn(
          errorClicked ? "w-full gap-0 space-x-2" : "w-8 gap-0",
          hasMultipleErrors && errorClicked
            ? "flex-col items-start"
            : "flex-row items-center",
          "flex bg-red-700 text-white justify-center border-white transition-all duration-500 ease-in-out py-2 shadow-[256px_256px_256px_rgba(0,0,0,0.5)]"
        )}
        style={{
          height: errorClicked && hasMultipleErrors ? "" : "2rem",
          minHeight: "2rem",
        }}
      >
        <div
          className={cn(
            "flex flex-row justify-start items-center gap-x-2",
            hasMultipleErrors && errorClicked && "w-full justify-start pb-2"
          )}
        >
          <CircleAlert className={cn(isMobile ? "w-4 h-4" : "w-6 h-6")} />
          {hasMultipleErrors && errorClicked && (
            <span className="text-xs font-medium">
              {errorMsgs.length} Error{errorMsgs.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div
          className={cn(
            "transition-all duration-100 ease-in-out overflow-x-scroll scrollbar-hide",
            errorClicked ? "opacity-100" : "opacity-0 w-0 max-w-0",
            hasMultipleErrors && errorClicked && "w-full"
          )}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {errorMsgs.map((error, idx) => {
            return (
              <div
                key={idx}
                className={cn(
                  "text-xs xl:text-sm block py-1 px-2",
                  hasMultipleErrors && errorClicked &&
                     "border-l-2 border-red-400 mb-1 last:mb-0"
                )}
              >
                {hasMultipleErrors && errorClicked && (
                  <span className="mr-1">•</span>
                )}
                {error}
              </div>
            );
          })}
        </div>
      </Badge>
    </button>
  );
};

export default ErrorBadge;

"use client";
import { Vulnerability } from "@/constants/model";
import { getInlineAiResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTextSelection } from "@/providers/textSelectionProvider";
import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

const FloatingAiForm = () => {
  const { selectedText, setSelectedText, mousePosition, selectedDependency } = useTextSelection();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isFormActive, setIsFormActive] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedText && selectedText.trim().length > 0) {
      setShowForm(true);
      setSelectedText(selectedText);
    } else {
      setShowForm(false);
      setSelectedText("");
    }
  }, [selectedText, setSelectedText]);

  //handle click outside the form + esc key to close the form
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!showForm || isFormActive || !formRef.current || isSelecting) return;

      const formRect = formRef.current.getBoundingClientRect();
      const clickX = event.clientX;
      const clickY = event.clientY;

      const isClickInside =
        clickX >= formRect.left &&
        clickX <= formRect.right &&
        clickY >= formRect.top &&
        clickY <= formRect.bottom;

      const target = event.target as Element;
      const isTargetInside = formRef.current.contains(target);

      if (isClickInside || isTargetInside) {
        return;
      }

      setShowForm(false);
      setSelectedText("");
      setPrompt("");

      if (window.getSelection) {
        window.getSelection()?.removeAllRanges();
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowForm(false);
        // setSelectedText("");
        // setPrompt("");
        if (window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
      }
    }

    if (showForm) {
      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside, true);
        document.addEventListener("keydown", handleEscapeKey);
      }, 50);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside, true);
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }
  }, [showForm, setSelectedText, isFormActive, isSelecting]);

  //handle text selection and selection changes
  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        setIsSelecting(true);
      } else {
        setTimeout(() => {
          setIsSelecting(false);
        }, 100);
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [isSelecting, setIsSelecting]);

  // console.log("isSelecting:", isSelecting);
  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Calculate position based on mouse position
  const getPosition = (mousePosition: {
    x: number;
    y: number;
  }): React.CSSProperties => {
    if (!mousePosition) return { display: "none" };
    let top = 0;
    let left = 0;

    if (mousePosition.y > height / 2) {
      if (mousePosition.x <= (2 * width) / 3) {
        top = mousePosition.y - 100;
        left = mousePosition.x;
      } else {
        top = mousePosition.y - 100;
        left = mousePosition.x - 200;
      }
    } else {
      if (mousePosition.x <= (2 * width) / 3) {
        top = mousePosition.y + 50;
        left = mousePosition.x;
      } else {
        top = mousePosition.y + 50;
        left = mousePosition.x - 300;
      }
    }
    return {
      top,
      left,
      display: "inline-flex",
      zIndex: 9999,
    };
  };

  const style: React.CSSProperties = showForm
    ? getPosition(mousePosition)
    : { display: "none" };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Prompt cannot be empty");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const context = {
        name: selectedDependency?.name,
        version: selectedDependency?.version,
        vulnerabilities: selectedDependency?.vulnerabilities?.map(
          (vuln: Vulnerability) => {
            return {
              ...vuln,
              affected: vuln.affected?.map((affected) => ({
                ...affected,
                versions: [],
              })),
            };
          }
        ),
      };
      const response = await getInlineAiResponse(prompt, selectedText, context);
      setResponse(response);
      setError("");
      setPrompt("");
    } catch {
      setError("Failed to submit prompt");
      toast.error("Failed to submit prompt. Please try again later.");
      return;
    } finally {
      setLoading(false);
    }
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  };

  // Function to parse the AI response and display it
  const parseResponse = (response: string) => {
    const parsedSummary = JSON.parse(response);
    return (
      <div className="">
        {parsedSummary.summary && (
          <div className="mb-2">
            <strong className="text-accent mb-2">Summary:</strong>
            <p className="text-xs text-muted-foreground">
              {parsedSummary.summary}
            </p>
          </div>
        )}
        {parsedSummary.explaination && (
          <div className="mb-2">
            <strong className="text-accent mb-2">Explaination:</strong>
            <p className="text-xs text-muted-foreground">
              {parsedSummary.explaination}
            </p>
          </div>
        )}
        <div>
          <strong className="text-accent mb-2">Actions to Take:</strong>
          {
            <ul className="list-disc pl-3 text-muted-foreground">
              {parsedSummary.actionable_items?.map(
                (item: string, index: number) => (
                  <li key={index} className="wrap-normal text-xs mb-1">
                    <p>{item}</p>
                  </li>
                )
              )}
            </ul>
          }
        </div>
      </div>
    );
  };

  return (
    <div
      id="floating-ai-form"
      ref={formRef}
      style={style}
      className={cn(
        "opacity-70 z-9999 hover:opacity-100 fixed bg-sidebar-accent-foreground p-2 shadow-[2px_2px_10px_rgba(0,0,0,0.80)] w-[350px] rounded-sm border-1 border-accent"
      )}
      onMouseDown={(e) => {
        e.stopPropagation();
        setIsFormActive(true);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setIsFormActive(true);
      }}
      onMouseEnter={() => setIsFormActive(true)}
      onMouseLeave={() => {
        setTimeout(() => setIsFormActive(false), 150);
      }}
      role="dialog"
      aria-label="AI assistance for selected text"
      aria-modal="false"
    >
      <div className="relative w-full bg-sidebar-accent-foreground">
        <form onSubmit={handleSubmit} aria-label="AI query form">
          <div className="flex flex-row items-center justify-center gap-x-2 w-full">
            <input
              type="text"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setError("");
              }}
              placeholder="Ask anything..."
              className={cn(
                error ? "border-2 border-red-500" : "border-1",
                "p-3.5 rounded w-4/5 text-accent text-sm"
              )}
              autoFocus
              aria-label="AI prompt"
              aria-describedby={error ? "ai-form-error" : undefined}
              aria-invalid={!!error}
            />
            <button
              disabled={loading || !prompt.trim()}
              type="submit"
              className={cn(
                "flex flex-row items-center justify-center bg-accent-foreground rounded w-1/6 transition cursor-pointer",
                !prompt.trim() && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Submit AI query"
            >
              {loading ? (
                <LoaderCircle
                  className="animate-spin text-white my-3 mx-3"
                  size={24}
                  strokeWidth={3}
                  aria-hidden="true"
                />
              ) : (
                <Image
                  priority
                  src="/genaibutton.svg"
                  alt="Generate AI response"
                  width={60}
                  height={60}
                  className=""
                />
              )}
            </button>
          </div>
        </form>
      </div>
      {response && (
        <div className={cn(
          mousePosition.y < window.innerHeight / 2 
            ? "top-full border-x-1 border-b-1 rounded-b-sm rounded-t-none" 
            : "bottom-full border-x-1 border-t-1 rounded-t-sm rounded-b-none",
          "w-full py-3 px-3 absolute left-0 z-9999 bg-accent-foreground text-sm wrap-normal overflow-y-auto max-h-[200px] scrollbar-background-thumb scrollbar-background-bg-2"
        )}
        role="region"
        aria-live="polite"
        aria-label="AI response"
        >
          {parseResponse(response)}
        </div>
      )}
    </div>
  );
};

export default FloatingAiForm;

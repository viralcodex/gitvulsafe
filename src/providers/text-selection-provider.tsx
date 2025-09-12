"use client";
import React, { useContext, useEffect, useState } from "react";
    import { Dependency } from "@/constants/constants";

interface TextSelectionContextType {
  selectedText: string;
  setSelectedText: (text: string) => void;
  mousePosition: { x: number; y: number };
  selectedDependency: Dependency | undefined;
  setSelectedDependency: (dependency: Dependency | undefined) => void;
}

const TextSelectionContext = React.createContext<
  TextSelectionContextType | undefined
>(undefined);

export const TextSelectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedText, setSelectedText] = useState<string>("");
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [selectedDependency, setSelectedDependency] = useState<
    Dependency | undefined
  >(undefined);

  const handleMouseUp = (event: MouseEvent) => {
    // Check if we're clicking inside the floating AI form
    const target = event.target as Element;
    if (target.closest("#floating-ai-form")) {
      return; // Don't update selection if clicking inside the form
    }

    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
    else {
      setSelectedText("");
    }
  };

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  console.log("Selected Text:", selectedText);

  return (
    <TextSelectionContext.Provider
      value={{
        selectedText,
        setSelectedText,
        mousePosition,
        selectedDependency,
        setSelectedDependency,
      }}
    >
      {children}
    </TextSelectionContext.Provider>
  );
};

export const useTextSelection = () => {
  const context = useContext(TextSelectionContext);
  if (!context) {
    throw new Error(
      "useTextSelection must be used within a TextSelectionProvider"
    );
  }
  return context;
};

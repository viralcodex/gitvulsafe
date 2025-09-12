/**
 * Utility function to parse AI response parts and extract text content
 * @param parts - Array of response parts from the AI model
 * @returns Combined text content from all parts
 */
export function parseAiResponseParts(parts: any[]): string {
  console.log(`Response has ${parts.length} part(s)`);

  // Scenario differentiation
  if (parts.length === 1 && parts[0].text) {
    console.log("✓ Single complete response");
    return parts[0].text;
  }

  const textParts = parts.filter((part) => part.text);
  const hasOtherTypes = parts.some(
    (part) => part.functionCall || part.executableCode || part.functionResponse
  );

  if (textParts.length > 1 && !hasOtherTypes) {
    console.log("✓ Multiple text parts - response was split across parts");
    const combinedText = textParts.map((part) => part.text).join("");
    console.log(`Combined ${textParts.length} text parts into single response`);
    return combinedText;
  }

  if (hasOtherTypes) {
    console.log("✓ Mixed content types detected:");
    let fullTextResponse = "";

    for (const [index, part] of parts.entries()) {
      if (part.text) {
        console.log(`  Part ${index + 1}: Text (${part.text.length} chars)`);
        fullTextResponse += part.text;
      } else if (part.functionCall) {
        console.log(`  Part ${index + 1}: Function call -`, part.functionCall);
      } else if (part.executableCode) {
        console.log(
          `  Part ${index + 1}: Executable code -`,
          part.executableCode
        );
      } else if (part.functionResponse) {
        console.log(
          `  Part ${index + 1}: Function response -`,
          part.functionResponse
        );
      }
    }

    return fullTextResponse;
  }

  // Fallback for any other scenarios
  return textParts.map((part) => part.text).join("") || "{}";
}

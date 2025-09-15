import { AiResponsePart } from "../constants/constants";

/**
 * Utility function to parse AI response parts and extract text content
 * @param parts - Array of response parts from the AI model
 * @returns Combined text content from all parts
 */
export function parseAiResponseParts(parts: AiResponsePart[]): string {
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


// Define types for sanitization
type SanitizableValue = string | number | boolean | null | undefined | SanitizableValue[] | SanitizableObject;
type SanitizableObject = { [key: string]: SanitizableValue };

export const sanitize = (input: SanitizableObject): SanitizableObject => {
  const sanitizedInput: SanitizableObject = {};
  
  Object.entries(input).forEach(([key, value]) => {
    // Sanitize the key itself
    const sanitizedKey = sanitizeString(key);
    
    // Sanitize the value based on its type
    if (typeof value === 'string') {
      sanitizedInput[sanitizedKey] = sanitizeString(value);
    } else if (typeof value === 'number') {
      sanitizedInput[sanitizedKey] = sanitizeNumber(value);
    } else if (typeof value === 'boolean') {
      sanitizedInput[sanitizedKey] = Boolean(value);
    } else if (Array.isArray(value)) {
      sanitizedInput[sanitizedKey] = sanitizeArray(value);
    } else if (value && typeof value === 'object') {
      sanitizedInput[sanitizedKey] = sanitize(value as SanitizableObject); // Recursive for nested objects
    } else {
      // For null, undefined, or other types, keep as is or set to null
      sanitizedInput[sanitizedKey] = value === undefined ? null : value;
    }
  });
  
  return sanitizedInput;
};

/**
 * Sanitize string inputs to prevent various attacks
 */
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') {
    return String(str);
  }
  
  return str
    // Trim whitespace
    .trim()
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove or escape HTML/XML tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    // Remove javascript: and data: protocols
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    // Remove SQL injection patterns
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi, '')
    // Remove command injection patterns
    .replace(/[;&|`$(){}[\]\\]/g, '')
    // Remove LDAP injection patterns
    .replace(/[()=,+<>#;\\]/g, '')
    // Limit length to prevent DoS
    .slice(0, 1000);
};

/**
 * Sanitize numeric inputs
 */
const sanitizeNumber = (num: unknown): number => {
  const parsed = Number(num);
  
  // Check for valid number
  if (isNaN(parsed) || !isFinite(parsed)) {
    return 0;
  }
  
  // Prevent extremely large numbers that could cause issues
  const MAX_SAFE_NUMBER = 1e10;
  const MIN_SAFE_NUMBER = -1e10;
  
  if (parsed > MAX_SAFE_NUMBER) return MAX_SAFE_NUMBER;
  if (parsed < MIN_SAFE_NUMBER) return MIN_SAFE_NUMBER;
  
  return parsed;
};

/**
 * Sanitize array inputs
 */
const sanitizeArray = (arr: SanitizableValue[]): SanitizableValue[] => {
  if (!Array.isArray(arr)) {
    return [];
  }
  
  // Limit array size to prevent DoS
  const MAX_ARRAY_SIZE = 1000;
  const limitedArray = arr.slice(0, MAX_ARRAY_SIZE);
  
  return limitedArray.map(item => {
    if (typeof item === 'string') {
      return sanitizeString(item);
    } else if (typeof item === 'number') {
      return sanitizeNumber(item);
    } else if (typeof item === 'boolean') {
      return Boolean(item);
    } else if (Array.isArray(item)) {
      return sanitizeArray(item);
    } else if (item && typeof item === 'object') {
      return sanitize(item as SanitizableObject);
    }
    return item;
  });
};

/**
 * Specific sanitizer for GitHub usernames and repository names
 */
export const sanitizeGitHubIdentifiers = (input: { username?: string; repo?: string }) => {
  const result: { sanitizedUsername?: string; sanitizedRepo?: string } = {};
  
  if (input.username) {
    result.sanitizedUsername = input.username
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '') // Only allow alphanumeric and hyphens
      .slice(0, 39); // GitHub username max length
  }
  
  if (input.repo) {
    result.sanitizedRepo = input.repo
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow alphanumeric, dots, underscores, hyphens
      .slice(0, 100); // GitHub repo name max length
  }
  
  return result;
};

/**
 * Sanitize file names
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .toString()
    .trim()
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Remove dangerous characters
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    // Limit length
    .slice(0, 255);
};

/**
 * Sanitize email addresses
 */
export const sanitizeEmail = (email: string): string => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const sanitized = email.toString().trim().toLowerCase().slice(0, 254);
  
  return emailRegex.test(sanitized) ? sanitized : '';
};

/**
 * Sanitize URLs
 */
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    
    // Only allow certain protocols
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(parsed.hostname)) {
      return '';
    }
    
    return parsed.toString().slice(0, 2048); // Limit URL length
  } catch {
    return '';
  }
};

/**
 * Helper function to safely extract string values from sanitized objects
 */
export const extractSanitizedString = (value: SanitizableValue, fallback: string = ''): string => {
  if (typeof value === 'string') {
    return value;
  }
  return fallback;
};

/**
 * Helper function to safely extract number values from sanitized objects
 */
export const extractSanitizedNumber = (value: SanitizableValue, fallback: number = 0): number => {
  if (typeof value === 'number') {
    return value;
  }
  return fallback;
};

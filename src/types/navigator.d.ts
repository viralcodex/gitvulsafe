declare global {
  interface Navigator {
    connection?: {
      effectiveType?: string;
      rtt?: string;
      downLink?: string;
    };
  }
}

export {};
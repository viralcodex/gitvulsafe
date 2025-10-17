"use client";

import React, { useEffect } from "react";

const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [wasOffline, setWasOffline] = React.useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline, wasOffline]);

  return { isOnline, wasOffline };
};

export default useNetworkStatus;

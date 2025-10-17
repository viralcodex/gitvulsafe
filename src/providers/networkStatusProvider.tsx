"use client";

import useNetworkStatus from "@/hooks/useNetworkStatus";
import { Wifi, WifiLow, WifiOff } from "lucide-react";
import { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";

interface NetworkContextType {
  isOnline: boolean;
  wasOffline: boolean;
  connectionQuality: "good" | "poor" | "offline";
}

interface NetworkProviderProps {
  children: React.ReactNode;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};

export const NetworkStatusProvider = ({ children }: NetworkProviderProps) => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [connectionQuality, setConnectionQuality] = useState<
    "good" | "poor" | "offline"
  >("good");

  useEffect(() => {
    if (!isOnline) {
      setConnectionQuality("offline");
      toast.error("No Network Connection Found...", {
        icon: <WifiOff className="h-5 w-5" strokeWidth={3}/>,
        duration: Infinity,
        id: "network-status",
        style:{
            backgroundColor: "red",
            color:"white",
            paddingLeft: 15
        }
      });
    } else {
      if (navigator.connection) {
        const connection = navigator.connection;
        const slowConnections = ["slow-2g", "2g"];

        if (slowConnections.includes(connection.effectiveType || "")) {
          setConnectionQuality("poor");
          if (wasOffline) {
            console.log("Slow connection", isOnline, wasOffline);
            toast.dismiss("network-status");
            toast.custom("Slow Connection", {
              icon: <WifiLow className="h-4 w-4" />,
              duration: 5000,
              id: "network-status",
              style: {
                color: "white",
                backgroundColor: "yellow"
              },
            });
          }
        } else {
          setConnectionQuality("good");
          if (wasOffline) {
            toast.dismiss("network-status");
            toast.success("Connection Restored!", {
              icon: <Wifi className="h-4 w-4" />,
              duration: 3000,
              id: "network-status",
              style: {
                backgroundColor: "green",
                color: "white",
                paddingLeft: 15,
              },
            });
          }
        }
      } else {
        setConnectionQuality("good");
        if (wasOffline) {
          toast.dismiss("network-status");
          toast.success("Back Online!", {
            icon: <Wifi className="h-4 w-4" />,
            duration: 3000,
            id: "network-status",
            style: {
              backgroundColor: "green",
              color: "white",
              paddingLeft: 15,
            },
          });
        }
      }
    }
  }, [wasOffline, isOnline]);

  return (
    <NetworkContext.Provider
      value={{ isOnline, wasOffline, connectionQuality }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

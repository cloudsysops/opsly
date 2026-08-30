"use client";

import { useEffect, useState } from "react";
import { NotificationsBell } from "../dashboard";

type AlertsData = Record<string, number>;

interface NotificationsBellWrapperProps {
  variant?: "light" | "dark";
}

export default function NotificationsBellWrapper({
  variant = "dark",
}: NotificationsBellWrapperProps) {
  const [alerts, setAlerts] = useState<AlertsData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch("/api/admin/alerts");
        if (response.ok) {
          const data = await response.json();
          setAlerts(data.summary);
        }
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAlerts();

    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="p-2">
        <div className={`h-5 w-5 rounded-full ${variant === "dark" ? "bg-white/20" : "bg-gray-200"}`} />
      </div>
    );
  }

  return <NotificationsBell alerts={alerts} variant={variant} />;
}

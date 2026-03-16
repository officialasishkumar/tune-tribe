import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { trackPageview } from "@/lib/telemetry";

export const TelemetryRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageview();
  }, [location.pathname, location.search, location.hash]);

  return null;
};

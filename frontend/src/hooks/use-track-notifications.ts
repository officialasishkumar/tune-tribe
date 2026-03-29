import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const useTrackNotifications = () => {
  const { user } = useAuth();
  const maxTrackIdRef = useRef<number | null>(null);

  useQuery({
    queryKey: ["tracksFeed"],
    queryFn: async () => {
      const tracks = await api.getTracksFeed();
      
      if (tracks && tracks.length > 0) {
        const maxId = Math.max(...tracks.map((t) => Number(t.id)));
        
        if (maxTrackIdRef.current !== null && maxId > maxTrackIdRef.current) {
          const newTracks = tracks.filter((t) => Number(t.id) > maxTrackIdRef.current!);
          
          const isEnabled = typeof localStorage !== "undefined" && typeof localStorage.getItem === "function" ? localStorage.getItem("tuneTribe_notificationsEnabled") !== "false" : true;
          if ("Notification" in window && Notification.permission === "granted" && isEnabled) {
            newTracks.forEach((track) => {
              if (track.sharedBy !== user?.username) {
                new Notification("New track shared!", {
                  body: `${track.sharedBy} shared "${track.title}" by ${track.artist}`,
                  icon: track.albumArtUrl || "/favicon.ico",
                });
              }
            });
          }
        }
        
        if (maxTrackIdRef.current === null || maxId > maxTrackIdRef.current) {
          maxTrackIdRef.current = maxId;
        }
      }
      
      return tracks;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });
};

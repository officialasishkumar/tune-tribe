import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AddTrackInputProps = {
  onSubmit: (url: string) => Promise<void>;
};

export const AddTrackInput = ({ onSubmit }: AddTrackInputProps) => {
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isFetching) return;

    setIsFetching(true);
    try {
      await onSubmit(url);
      setUrl("");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 p-2 rounded-lg bg-card shadow-card">
        <Link2 className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a Spotify, Apple Music, or YouTube URL..."
          className="border-0 shadow-none focus-visible:ring-0 text-sm bg-transparent px-0 h-8"
        />
        <AnimatePresence mode="wait">
          {isFetching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="font-mono">Fetching...</span>
            </motion.div>
          ) : url.trim() ? (
            <motion.div
              key="submit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ ease: [0.2, 0, 0, 1] }}
            >
              <Button type="submit" size="sm" className="h-7 px-3 text-xs gap-1">
                Post <ArrowRight className="w-3 h-3" />
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
};

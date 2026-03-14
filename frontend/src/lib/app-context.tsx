import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AppContextType {
  activeGroup: number | null;
  setActiveGroup: (id: number | null) => void;
  showCreateGroup: boolean;
  setShowCreateGroup: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [activeGroup, setActiveGroup] = useState<number | null>(() => {
    const stored = localStorage.getItem("tunetribe-active-group");
    return stored ? Number(stored) : null;
  });
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    if (activeGroup) {
      localStorage.setItem("tunetribe-active-group", String(activeGroup));
    } else {
      localStorage.removeItem("tunetribe-active-group");
    }
  }, [activeGroup]);

  return (
    <AppContext.Provider value={{ activeGroup, setActiveGroup, showCreateGroup, setShowCreateGroup }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

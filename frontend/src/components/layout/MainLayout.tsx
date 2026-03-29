import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Disc3, Search, Plus, BarChart3, LogOut, Moon, Sun, UserCircle, UserPlus, Bell, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FriendsManager } from "@/components/FriendsManager";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAppContext } from "@/lib/app-context";
import { useTrackNotifications } from "@/hooks/use-track-notifications";

export const MainLayout = () => {
  useTrackNotifications();

  const [friendsManagerTab, setFriendsManagerTab] = useState<"friends" | "requests" | "search" | null>(null);
  
  const { isDark, toggle: toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { activeGroup, setActiveGroup, showCreateGroup, setShowCreateGroup } = useAppContext();

  const friendRequestsQuery = useQuery({
    queryKey: ["friendRequests"],
    queryFn: api.listFriendRequests,
    refetchInterval: 10000,
  });

  const pendingRequestCount = friendRequestsQuery.data?.length ?? 0;

  const createGroupMutation = useMutation({
    mutationFn: ({ name, memberIds }: { name: string; memberIds: number[] }) =>
      api.createGroup({ name, memberIds }),
    onSuccess: (group) => {
      toast.success(`Group "${group.name}" created`);
      setActiveGroup(group.id);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      navigate("/dashboard");
      setShowCreateGroup(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Group creation failed.");
    },
  });

  const navItems = [
    { icon: Disc3, label: "Feed", path: "/dashboard" },
    { icon: Search, label: "Search", action: () => setFriendsManagerTab("search") },
    { icon: Plus, label: "Add", action: () => setShowCreateGroup(true) },
    {
      icon: BarChart3,
      label: "Analytics",
      path: activeGroup ? `/analytics?groupId=${activeGroup}` : "/analytics",
      matchPath: "/analytics"
    },
    { 
      label: "Profile", 
      path: "/profile",
      icon: user?.avatarUrl ? () => (
        <div className="w-5 h-5 rounded-full overflow-hidden border border-primary/20 bg-secondary flex items-center justify-center">
          <img src={user.avatarUrl!} alt={user.displayName} className="w-full h-full object-cover" />
        </div>
      ) : UserCircle
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-background via-background to-primary/5 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            data-telemetry-click="true"
            data-telemetry-name="header-logo"
            onClick={() => navigate("/dashboard")}
          >
            <Disc3 className="w-6 h-6 text-primary" />
            <span className="text-base font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">TuneTribe</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              aria-label="Open friend requests"
              variant="ghost"
              size="sm"
              className={`h-9 w-9 p-0 relative ${friendsManagerTab === 'requests' ? 'bg-accent text-accent-foreground' : ''}`}
              onClick={() => setFriendsManagerTab("requests")}
            >
              <Bell className="w-5 h-5" />
              {pendingRequestCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {pendingRequestCount}
                </span>
              )}
            </Button>
            <Button
              aria-label="Open friends list"
              variant="ghost"
              size="sm"
              className={`h-9 w-9 p-0 ${friendsManagerTab === 'friends' ? 'bg-accent text-accent-foreground' : ''}`}
              onClick={() => setFriendsManagerTab("friends")}
            >
              <Users className="w-4.5 h-4.5" />
            </Button>
            <Button
              aria-label="Search users"
              variant="ghost"
              size="sm"
              className={`h-9 w-9 p-0 ${friendsManagerTab === 'search' ? 'bg-accent text-accent-foreground' : ''}`}
              onClick={() => setFriendsManagerTab("search")}
            >
              <UserPlus className="w-4.5 h-4.5" />
            </Button>
            <Button
              aria-label="Open analytics"
              variant="ghost"
              size="sm"
              className={`h-9 w-9 p-0 ${location.pathname.startsWith('/analytics') ? 'bg-accent text-accent-foreground' : ''}`}
              onClick={() => navigate(activeGroup ? `/analytics?groupId=${activeGroup}` : "/analytics")}
            >
              <BarChart3 className="w-4.5 h-4.5" />
            </Button>
            <Button aria-label="Toggle theme" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={toggleTheme}>
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </Button>
            <Button
              aria-label="Open profile"
              variant="ghost"
              size="sm"
              className={`h-9 w-9 p-0 ${location.pathname.startsWith('/profile') ? 'bg-accent text-accent-foreground' : ''}`}
              onClick={() => navigate("/profile")}
            >
              {user?.avatarUrl ? (
                <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary flex items-center justify-center">
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <UserCircle className="w-4.5 h-4.5" />
              )}
            </Button>
            <Button
              aria-label="Log out"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => {
                logout();
                navigate("/auth");
              }}
            >
              <LogOut className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full pb-14 md:pb-0 flex flex-col">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 border-t">
        <div className="flex items-center justify-around h-14">
          {navItems.map((tab) => {
            const isActive = tab.path ? location.pathname === tab.path || (tab.matchPath && location.pathname.startsWith(tab.matchPath)) : false;
            return (
              <button
                key={tab.label}
                onClick={() => {
                  if (tab.action) tab.action();
                  else if (tab.path) navigate(tab.path);
                }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <AnimatePresence>
        {friendsManagerTab && (
          <FriendsManager
            initialTab={friendsManagerTab}
            onClose={() => setFriendsManagerTab(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupModal
            onClose={() => setShowCreateGroup(false)}
            onCreate={(name, memberIds) => createGroupMutation.mutateAsync({ name, memberIds }).then(() => undefined)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

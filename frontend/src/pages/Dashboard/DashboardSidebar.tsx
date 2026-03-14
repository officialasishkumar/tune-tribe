import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupCard, type Group } from "@/components/GroupCard";

type DashboardSidebarProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setShowCreateGroup: (show: boolean) => void;
  filteredGroups: Group[];
  activeGroup: number | null;
  setActiveGroup: (id: number) => void;
  setGroupToDelete: (group: Group) => void;
};

export const DashboardSidebar = ({
  searchQuery,
  setSearchQuery,
  setShowCreateGroup,
  filteredGroups,
  activeGroup,
  setActiveGroup,
  setGroupToDelete,
}: DashboardSidebarProps) => {
  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col h-[calc(100vh-56px)] sticky top-14">
      <div className="p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm border-0 bg-secondary shadow-none"
          />
        </div>
        <Button variant="outline" size="sm" className="w-full h-9 text-sm gap-1.5" onClick={() => setShowCreateGroup(true)}>
          <Plus className="w-4 h-4" />
          Create Group
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground px-3 py-2 block">
          Your Tribes ({filteredGroups.length})
        </span>
        {filteredGroups.map((group, index) => (
          <GroupCard
            key={group.id}
            group={group}
            isActive={activeGroup === group.id}
            onClick={() => setActiveGroup(Number(group.id))}
            onDelete={() => setGroupToDelete(group)}
            index={index}
          />
        ))}
      </div>
    </aside>
  );
};

import { LayoutDashboard, Globe, GitCompareArrows, Star } from "lucide-react";

export type ViewType = "dashboard" | "market" | "compare" | "watchlist";

const NAV_ITEMS: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "market", label: "Market Overview", icon: Globe },
  { id: "compare", label: "Compare Stocks", icon: GitCompareArrows },
  { id: "watchlist", label: "Watchlist", icon: Star },
];

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar md:block">
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              activeView === id
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

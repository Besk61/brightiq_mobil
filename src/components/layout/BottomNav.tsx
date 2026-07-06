import { FileText, Home, LayoutGrid, Settings, Video } from "lucide-react";
import { cn } from "../../utils";

type Tab = "modules" | "home" | "cameras" | "reports" | "settings";

interface BottomNavProps {
  currentTab: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ currentTab, onChange }: BottomNavProps) {
  const tabs = [
    { id: "home", label: "Ana Menü", icon: Home },
    { id: "cameras", label: "Kameralar", icon: Video },
    { id: "modules", label: "Modüller", icon: LayoutGrid },
    { id: "reports", label: "Raporlar", icon: FileText },
    { id: "settings", label: "Ayarlar", icon: Settings },
  ] as const;

  return (
    <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-1.5 py-2 pb-6 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex flex-1 flex-col items-center justify-center py-2 space-y-1 relative min-w-0"
          >
            {isActive && <div className="absolute -top-2 w-9 h-1 bg-accent rounded-b-md" />}
            <Icon className={cn("w-5 h-5 transition-colors duration-200", isActive ? "text-primary" : "text-gray-400")} />
            <span className={cn("text-[9px] font-medium transition-colors duration-200 truncate", isActive ? "text-primary" : "text-gray-400")}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

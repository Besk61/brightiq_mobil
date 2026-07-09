import { useEffect, useState } from "react";
import AlertsModule from "./Modules/Alerts";
import ProductivityModule from "./Modules/Productivity";
import { cn } from "../utils";

type ModuleTab = "alerts" | "productivity";

interface ModulesProps {
  authToken?: string;
  showProductivityFeature: boolean;
  requestedTab: ModuleTab;
  onRequestedTabChange: (tab: ModuleTab) => void;
}

export default function Modules({ authToken, showProductivityFeature, requestedTab, onRequestedTabChange }: ModulesProps) {
  const [activeTab, setActiveTab] = useState<ModuleTab>(requestedTab);

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const tabs: Array<{ id: ModuleTab; label: string }> = [{ id: "alerts", label: "Alarm ve Uyarılar" }];
  if (showProductivityFeature) {
    tabs.push({ id: "productivity", label: "Personel Verimlilik" });
  }

  return (
    <div className="flex flex-col h-full border-t border-gray-100/50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="flex overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                onRequestedTabChange(tab.id);
              }}
              className={cn(
                "whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex-1 pb-[100px]">
        {activeTab === "alerts" && <AlertsModule authToken={authToken} />}
        {activeTab === "productivity" && showProductivityFeature && <ProductivityModule authToken={authToken} />}
        {activeTab === "productivity" && !showProductivityFeature && (
          <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
            Personel Verimlilik modülü için lisansınız aktif değil. Lütfen yetkili kişilerle iletişime geçin.
          </div>
        )}
      </div>
    </div>
  );
}

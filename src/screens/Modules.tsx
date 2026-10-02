import { useEffect, useMemo, useState } from "react";
import AlertsModule from "./Modules/Alerts";
import ProductivityModule from "./Modules/Productivity";
import CustomerQueueMetricModule from "./Modules/CustomerQueueMetric";
import { Coffee, Timer, UserMinus } from "lucide-react";
import { cn } from "../utils";

type ModuleTab = "alerts" | "productivity" | "queueWait" | "coffeePickup" | "queueAbandonment";

interface ModulesProps {
  authToken?: string;
  showProductivityFeature: boolean;
  showCustomerQueueMetricsFeature: boolean;
  requestedTab: ModuleTab;
  onRequestedTabChange: (tab: ModuleTab) => void;
}

export default function Modules({
  authToken,
  showProductivityFeature,
  showCustomerQueueMetricsFeature,
  requestedTab,
  onRequestedTabChange,
}: ModulesProps) {
  const [activeTab, setActiveTab] = useState<ModuleTab>(requestedTab);

  const tabs = useMemo(() => {
    const visibleTabs: Array<{ id: ModuleTab; label: string }> = [{ id: "alerts", label: "Alarm ve Uyarılar" }];

    if (showProductivityFeature) {
      visibleTabs.push({ id: "productivity", label: "Personel Verimlilik" });
    }

    if (showCustomerQueueMetricsFeature) {
      visibleTabs.push(
        { id: "queueWait", label: "Sıra Bekleme" },
        { id: "coffeePickup", label: "Kahve Süresi" },
        { id: "queueAbandonment", label: "Kuyruktan Çıkan" }
      );
    }

    return visibleTabs;
  }, [showProductivityFeature, showCustomerQueueMetricsFeature]);

  useEffect(() => {
    if (tabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
      return;
    }

    setActiveTab("alerts");
    onRequestedTabChange("alerts");
  }, [requestedTab, tabs, onRequestedTabChange]);

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
        {activeTab === "queueWait" && showCustomerQueueMetricsFeature && (
          <CustomerQueueMetricModule
            authToken={authToken}
            metricType="queue_wait_duration"
            title="Sıra Bekleme Süresi"
            subtitle="Saatlik min, ortalama ve max bekleme"
            icon={Timer}
            mode="duration"
          />
        )}
        {activeTab === "coffeePickup" && showCustomerQueueMetricsFeature && (
          <CustomerQueueMetricModule
            authToken={authToken}
            metricType="coffee_pickup_duration"
            title="Kahveyi Alma Süresi"
            subtitle="Siparişten kahve teslimine kadar geçen süre"
            icon={Coffee}
            mode="duration"
          />
        )}
        {activeTab === "queueAbandonment" && showCustomerQueueMetricsFeature && (
          <CustomerQueueMetricModule
            authToken={authToken}
            metricType="queue_abandonment_count"
            title="Kuyruktan Çıkan Müşteri"
            subtitle="Saatlik kuyruk terk sayısı"
            icon={UserMinus}
            mode="count"
          />
        )}
        {activeTab === "productivity" && !showProductivityFeature && (
          <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
            Personel Verimlilik modülü için lisansınız aktif değil. Lütfen yetkili kişilerle iletişime geçin.
          </div>
        )}
      </div>
    </div>
  );
}

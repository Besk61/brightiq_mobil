import React from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";

type Tab = "modules" | "home" | "cameras" | "reports" | "settings";

type HealthStatus = {
  isHealthy: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  category: "health" | "alarm" | "warning" | "info";
  timestamp: string;
};

interface AppLayoutProps {
  children: React.ReactNode;
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  onNotificationClick: () => void;
  onNotificationItemClick: (notification: NotificationItem) => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  healthStatus: HealthStatus | null;
}

export default function AppLayout({
  children,
  currentTab,
  onTabChange,
  onNotificationClick,
  onNotificationItemClick,
  onLogout,
  notifications,
  healthStatus,
}: AppLayoutProps) {
  return (
    <div className="w-full h-screen flex justify-center bg-gray-900 overflow-hidden">
      <div className="w-full max-w-md h-full bg-bg-light relative flex flex-col shadow-2xl">
        <Header
          onNotificationClick={onNotificationClick}
          onNotificationItemClick={onNotificationItemClick}
          onLogout={onLogout}
          notifications={notifications}
          healthStatus={healthStatus}
        />
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[84px] custom-scrollbar relative">
          {children}
        </div>

        <BottomNav currentTab={currentTab} onChange={onTabChange} />
      </div>
    </div>
  );
}

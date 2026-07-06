import { Bell, User, FileText, LogOut } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BrightIqLogo } from "../BrandLogo";

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

interface HeaderProps {
  onNotificationClick: () => void;
  onNotificationItemClick: (notification: NotificationItem) => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  healthStatus: HealthStatus | null;
}

export default function Header({
  onNotificationClick,
  onNotificationItemClick,
  onLogout,
  notifications,
  healthStatus,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHealthInfo, setShowHealthInfo] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadCount = notifications.length;
  const statusText = healthStatus
    ? healthStatus.isHealthy
      ? "Sağlıklı"
      : "Sağlıksız"
    : "Bilinmiyor";
  const statusDescription = healthStatus
    ? healthStatus.description || (healthStatus.isHealthy ? "Sistem sağlıklı." : "Sistem sağlıksız.")
    : "Durum bilgisi mevcut değil.";
  const statusDotClass = healthStatus
    ? healthStatus.isHealthy
      ? "bg-emerald-500"
      : "bg-rose-500"
    : "bg-white border border-gray-300";

  return (
    <div className="bg-white px-4 pt-[max(env(safe-area-inset-top),2.5rem)] pb-3 flex items-center justify-between border-b border-gray-100 shadow-sm z-40 relative">
      <div className="flex items-center gap-3 mt-2">
        <BrightIqLogo className="w-28" />
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className="relative">
          <button
            onClick={() => {
              setShowHealthInfo((prev) => !prev);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            className="relative w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100"
            aria-label="Sağlık durumu"
          >
            <span className={`w-3 h-3 rounded-full ${statusDotClass}`} />
          </button>

          <AnimatePresence>
            {showHealthInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-50 text-left"
              >
                <div className="text-sm font-semibold text-text-dark mb-2">Sağlık Durumu</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${statusDotClass}`} />
                  <span className="text-sm font-medium text-text-dark">{statusText}</span>
                </div>
                <p className="text-xs text-text-muted">{statusDescription}</p>
                {healthStatus && (
                  <p className="text-[10px] text-slate-400 mt-2">Güncellendi: {new Date(healthStatus.updatedAt).toLocaleString()}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowHealthInfo(false);
              setShowProfileMenu(false);
              onNotificationClick();
            }}
            className="relative p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-4 rounded-full bg-danger text-white text-[10px] font-semibold flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-50 text-left"
              >
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-text-muted">Henüz yeni bildirim yok.</div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        setShowNotifications(false);
                        onNotificationItemClick(notification);
                      }}
                      className="p-3 mb-2 last:mb-0 bg-gray-50 hover:bg-gray-100 cursor-pointer rounded-xl flex gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-text-dark">{notification.title}</div>
                        <div className="text-[11px] text-text-muted mt-1">{notification.body}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{new Date(notification.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu((prev) => !prev);
              setShowHealthInfo(false);
              setShowNotifications(false);
            }}
            className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-gray-200 flex items-center justify-center"
            aria-label="Profil menüsü"
          >
            <User className="w-5 h-5 text-gray-700" />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-44 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-50"
              >
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-dark rounded-xl hover:bg-gray-100"
                >
                  <LogOut className="w-4 h-4" />
                  Çıkış Yap
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

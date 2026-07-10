import { Activity, Bell, Camera, Copy, FileText, LogOut, MessageSquare, Monitor, Moon, RefreshCw, Shield, Siren, Sun } from "lucide-react";
import type { ElementType } from "react";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { FCM } from "@capacitor-community/fcm";
import { apiGet, apiPost } from "../api";
import {
  loadNotificationPreferences,
  NotificationFrequency,
  NotificationPreferenceKey,
  NotificationPreferences,
  saveNotificationPreferences,
} from "../notificationPreferences";
import { cn } from "../utils";

interface SettingsProps {
  authToken?: string;
  onLogout?: () => void;
}

interface CompanyFeatureRelation {
  expireDate?: string;
  createdAt?: string;
  startDate?: string;
}

interface CompanyFeature {
  id: number;
  name: string;
  CompanyFeatures?: CompanyFeatureRelation[] | CompanyFeatureRelation;
  companyFeatures?: CompanyFeatureRelation[] | CompanyFeatureRelation;
}

const notificationRows: Array<{
  key: NotificationPreferenceKey;
  title: string;
  description: string;
  icon: ElementType;
}> = [
  { key: "push", title: "Push Bildirimleri", description: "Mobil cihaz bildirimlerini genel olarak açar veya kapatır.", icon: Bell },
  { key: "alarms", title: "Alarm Bildirimleri", description: "Yeni alarm ve uyarı olayları için bildirim gönderir.", icon: Siren },
  { key: "comments", title: "Yorum Bildirimleri", description: "Alarm yorumları ve takip mesajları için bildirim gönderir.", icon: MessageSquare },
  { key: "systemHealth", title: "Sistem Sağlık Bildirimleri", description: "Sistem sağlık durumu değiştiğinde bildirim gönderir.", icon: Activity },
  { key: "cameraHealth", title: "Kamera Sağlık Bildirimleri", description: "Kamera çevrimdışı veya sağlık problemlerini bildirir.", icon: Camera },
  { key: "dailyReports", title: "Günlük Rapor Bildirimleri", description: "Günlük özet ve rapor hazır olduğunda bildirim gönderir.", icon: FileText },
  { key: "criticalAlways", title: "Kritik Alarmları Her Zaman Bildir", description: "Kritik alarmları alarm ayarı kapalı olsa bile gösterir.", icon: Shield },
];

const STORAGE_PUSH_DEBUG_TOKEN = "brightiq_mobile_last_fcm_token";
const STORAGE_PUSH_DEBUG_STATUS = "brightiq_mobile_push_debug_status";
const STORAGE_PUSH_DEBUG_UPDATED_AT = "brightiq_mobile_push_debug_updated_at";

function formatLicenseDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(date);
}

function formatDebugDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function maskToken(value?: string | null) {
  if (!value) return "Token yok";
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}...${value.slice(-12)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function Toggle({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-11 h-6 rounded-full relative transition-colors flex-shrink-0",
        checked ? "bg-accent" : "bg-gray-200"
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function Settings({ authToken, onLogout }: SettingsProps) {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [threshold, setThreshold] = useState(15);
  const [isLoadingThreshold, setIsLoadingThreshold] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [features, setFeatures] = useState<CompanyFeature[]>([]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() => loadNotificationPreferences());
  const [pushDebugToken, setPushDebugToken] = useState(() => localStorage.getItem(STORAGE_PUSH_DEBUG_TOKEN) || "");
  const [pushDebugStatus, setPushDebugStatus] = useState(() => localStorage.getItem(STORAGE_PUSH_DEBUG_STATUS) || "Henüz FCM token alınmadı.");
  const [pushDebugUpdatedAt, setPushDebugUpdatedAt] = useState(() => localStorage.getItem(STORAGE_PUSH_DEBUG_UPDATED_AT) || "");
  const [isRefreshingPushToken, setIsRefreshingPushToken] = useState(false);

  useEffect(() => {
    if (!authToken) return;

    const fetchSettings = async () => {
      setIsLoadingThreshold(true);
      setIsLoadingFeatures(true);
      try {
        const [thresholdRes, featuresRes] = await Promise.all([
          apiGet<{ threshold: number }>("/api/settings/camera-health-threshold/get", authToken).catch(() => null),
          apiGet<CompanyFeature[]>("/api/features/get-company-features", authToken).catch(() => null),
        ]);

        if (thresholdRes && typeof thresholdRes.threshold === "number") {
          setThreshold(thresholdRes.threshold);
        }
        if (featuresRes && Array.isArray(featuresRes)) {
          setFeatures(featuresRes);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingThreshold(false);
        setIsLoadingFeatures(false);
      }
    };

    fetchSettings();
  }, [authToken]);

  const savePushDebug = (status: string, token?: string) => {
    const updatedAt = new Date().toISOString();
    setPushDebugStatus(status);
    setPushDebugUpdatedAt(updatedAt);
    localStorage.setItem(STORAGE_PUSH_DEBUG_STATUS, status);
    localStorage.setItem(STORAGE_PUSH_DEBUG_UPDATED_AT, updatedAt);

    if (token) {
      setPushDebugToken(token);
      localStorage.setItem(STORAGE_PUSH_DEBUG_TOKEN, token);
    }
  };

  const getLicenseCards = () => {
    if (isLoadingFeatures) {
      return [{ id: 0, type: "YÜKLENİYOR...", daysLeft: 0, startDate: "-", endDate: "-" }];
    }
    if (!features.length) {
      return [{ id: 0, type: "LİSANS YOK", daysLeft: 0, startDate: "-", endDate: "-" }];
    }

    return features.map((feature, index) => {
      const relatedData = feature.CompanyFeatures || feature.companyFeatures;
      const firstFeatureItem = Array.isArray(relatedData) ? relatedData[0] : relatedData;
      const expireDate = firstFeatureItem?.expireDate ? new Date(firstFeatureItem.expireDate) : new Date();
      const daysLeft = Math.ceil((expireDate.getTime() - Date.now()) / (1000 * 3600 * 24));

      return {
        id: feature.id || index,
        type: feature.name.toUpperCase(),
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        startDate: formatLicenseDate(firstFeatureItem?.startDate || firstFeatureItem?.createdAt),
        endDate: formatLicenseDate(firstFeatureItem?.expireDate),
      };
    });
  };

  const licenseCards = getLicenseCards();

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else if (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const handleThresholdSave = async () => {
    if (!authToken) return;

    setIsSaving(true);
    setMessage(null);
    try {
      await apiPost("/api/settings/camera-health-threshold/update", { threshold }, authToken);
      setMessage("Kamera sağlık eşiği başarıyla güncellendi.");
    } catch (error: any) {
      setMessage(error?.message ?? "Eşik güncellenirken bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = (key: NotificationPreferenceKey) => {
    const next = {
      ...notificationPreferences,
      [key]: !notificationPreferences[key],
    };
    setNotificationPreferences(next);
    saveNotificationPreferences(next);
  };

  const handleFrequencyChange = (frequency: NotificationFrequency) => {
    const next = { ...notificationPreferences, frequency };
    setNotificationPreferences(next);
    saveNotificationPreferences(next);
  };

  const handleCopyPushToken = async () => {
    if (!pushDebugToken) {
      savePushDebug("Kopyalanacak FCM token yok. Önce tokenı yenile.");
      return;
    }

    try {
      await navigator.clipboard.writeText(pushDebugToken);
      savePushDebug("FCM token panoya kopyalandı.", pushDebugToken);
    } catch {
      savePushDebug("Token kopyalanamadı. iPad izinleri veya clipboard erişimi engellemiş olabilir.", pushDebugToken);
    }
  };

  const handleRefreshPushToken = async () => {
    if (!authToken) {
      savePushDebug("Oturum yok. Önce tekrar giriş yap.");
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      savePushDebug("Bu işlem sadece iOS/Android uygulama içinde çalışır.");
      return;
    }

    setIsRefreshingPushToken(true);
    try {
      savePushDebug("Bildirim izni ve APNs kaydı kontrol ediliyor...", pushDebugToken);

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === "prompt") {
        permission = await PushNotifications.requestPermissions();
      }

      if (permission.receive !== "granted") {
        savePushDebug(`Bildirim izni verilmedi: ${permission.receive}`, pushDebugToken);
        return;
      }

      await PushNotifications.register();

      let tokenToSend = "";
      if (Capacitor.getPlatform() === "ios") {
        for (let attempt = 1; attempt <= 8; attempt += 1) {
          await sleep(750);
          try {
            const fcmResult = await FCM.getToken();
            if (fcmResult?.token) {
              tokenToSend = fcmResult.token;
              break;
            }
          } catch (error) {
            console.error(`[FCM] Token alma denemesi ${attempt} başarısız:`, error);
          }
        }
      } else {
        const fcmResult = await FCM.getToken();
        tokenToSend = fcmResult?.token || "";
      }

      if (!tokenToSend) {
        savePushDebug("FCM token alınamadı. Firebase/APNs bağlantısı veya izin akışı kontrol edilmeli.", pushDebugToken);
        return;
      }

      await apiPost("/api/auth/set-device-token", {
        deviceToken: tokenToSend,
        deviceType: "MOBILE"
      }, authToken);

      savePushDebug("FCM token alındı ve backend'e tekrar gönderildi.", tokenToSend);
    } catch (error: any) {
      console.error("[FCM] Debug token yenileme hatası:", error);
      savePushDebug(error?.message ? `Hata: ${error.message}` : "Token yenilenirken bilinmeyen hata oluştu.", pushDebugToken);
    } finally {
      setIsRefreshingPushToken(false);
    }
  };

  return (
    <div className="p-4 space-y-4 border-t border-gray-100/50 pb-[100px]">
      <h2 className="text-xl font-bold text-text-dark mb-2">Ayarlar</h2>

      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 mb-2 custom-scrollbar -mx-4 px-4">
        {licenseCards.map((license) => (
          <div key={license.id} className="min-w-[85%] snap-center shrink-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-[#ffffff] shadow-md relative overflow-hidden">
            <Shield className="absolute -right-4 -bottom-4 w-24 h-24 text-[#ffffff]/10" />
            <h3 className="text-[#ffffff]/80 text-xs font-semibold uppercase tracking-wider mb-1">Lisans Türü</h3>
            <div className="text-2xl font-bold mb-4 break-all">{license.type}</div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                <div className="text-[#ffffff]/80 text-xs mb-0.5">Başlangıç Tarihi</div>
                <div className="text-sm font-semibold">{isLoadingFeatures ? "..." : license.startDate}</div>
              </div>
              <div className="text-right">
                <div className="text-[#ffffff]/80 text-xs mb-0.5">Bitiş Tarihi</div>
                <div className="text-sm font-semibold">{isLoadingFeatures ? "..." : license.endDate}</div>
              </div>
              <div>
                <div className="text-[#ffffff]/80 text-xs mb-0.5">Kalan Süre</div>
                <div className="text-lg font-bold">{isLoadingFeatures ? "..." : `${license.daysLeft} Gün`}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-sm text-text-dark mb-4">Bildirim Ayarları</h3>
        <div className="space-y-3">
          {notificationRows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.key} className="flex justify-between gap-3 items-center py-1">
                <div className="flex items-start gap-3 min-w-0">
                  <Icon className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-text-dark">{row.title}</div>
                    <div className="text-[11px] text-text-muted leading-snug mt-0.5">{row.description}</div>
                  </div>
                </div>
                <Toggle checked={Boolean(notificationPreferences[row.key])} onClick={() => handleNotificationToggle(row.key)} />
              </div>
            );
          })}

          <div className="pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 font-medium">Bildirim Sıklığı</span>
            <select
              className="w-full mt-1 border border-gray-200 bg-gray-50 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-dark"
              value={notificationPreferences.frequency}
              onChange={(event) => handleFrequencyChange(event.target.value as NotificationFrequency)}
            >
              <option value="instant">Anında</option>
              <option value="1min">1 Dakika</option>
              <option value="5min">5 Dakika</option>
            </select>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <label className="text-xs text-gray-500 font-medium" htmlFor="minimum-downtime-minutes">
              Minimum Kesinti Bildirim Süresi
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="minimum-downtime-minutes"
                type="number"
                min={0}
                step={1}
                value={notificationPreferences.minimumDowntimeMinutes}
                onChange={(event) => {
                  const next = {
                    ...notificationPreferences,
                    minimumDowntimeMinutes: Math.max(0, Number(event.target.value) || 0),
                  };
                  setNotificationPreferences(next);
                  saveNotificationPreferences(next);
                }}
                className="w-24 border border-gray-200 bg-gray-50 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-dark"
              />
              <span className="text-sm text-text-muted">dakika altındaki kesintiler bildirilmez.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-sm text-text-dark">Bildirim Debug</h3>
            <p className="text-xs text-gray-500">TestFlight cihazındaki gerçek FCM tokenı ve backend kaydını kontrol eder.</p>
          </div>
          <Bell className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </div>

        <div className="space-y-2 text-xs">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <div className="text-gray-500 font-medium mb-1">FCM Token</div>
            <div className="break-all text-text-dark font-mono">{maskToken(pushDebugToken)}</div>
          </div>
          <div className="text-gray-500">Durum: {pushDebugStatus}</div>
          <div className="text-gray-500">Son güncelleme: {formatDebugDate(pushDebugUpdatedAt)}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            onClick={handleRefreshPushToken}
            disabled={isRefreshingPushToken}
            className="bg-primary text-white py-3 rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshingPushToken && "animate-spin")} />
            {isRefreshingPushToken ? "Yenileniyor" : "Tokenı Yenile"}
          </button>
          <button
            type="button"
            onClick={handleCopyPushToken}
            disabled={!pushDebugToken}
            className="bg-gray-100 text-text-dark py-3 rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Kopyala
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-text-dark">Kamera Sağlık Eşiği</h3>
            <p className="text-xs text-gray-500">Sistemin sağlık uyarısı üretmesi için kullanılan eşik değeri.</p>
          </div>
          {isLoadingThreshold ? (
            <span className="text-xs text-gray-500">Yükleniyor...</span>
          ) : (
            <span className="text-xs font-semibold text-text-dark">{threshold}%</span>
          )}
        </div>

        <div className="space-y-3">
          <input
            type="range"
            min={0}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>100%</span>
          </div>
          <button
            onClick={handleThresholdSave}
            disabled={isSaving || isLoadingThreshold}
            className="w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {isSaving ? "Kaydediliyor..." : "Eşiği Kaydet"}
          </button>
          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-sm text-text-dark mb-3">Tema</h3>
        <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => handleThemeChange("light")}
            className={cn(
              "flex-1 py-1.5 flex justify-center items-center gap-1.5 text-xs font-semibold rounded-md",
              theme === "light" ? "bg-white shadow-sm border border-gray-200 text-text-dark" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Sun className="w-3.5 h-3.5" /> Açık
          </button>
          <button
            onClick={() => handleThemeChange("dark")}
            className={cn(
              "flex-1 py-1.5 flex justify-center items-center gap-1.5 text-xs font-semibold rounded-md",
              theme === "dark" ? "bg-white shadow-sm border border-gray-200 text-text-dark" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Moon className="w-3.5 h-3.5" /> Koyu
          </button>
          <button
            onClick={() => handleThemeChange("system")}
            className={cn(
              "flex-1 py-1.5 flex justify-center items-center gap-1.5 text-xs font-semibold rounded-md",
              theme === "system" ? "bg-white shadow-sm border border-gray-200 text-text-dark" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Monitor className="w-3.5 h-3.5" /> Sistem
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-sm text-text-dark mb-4">Güvenlik</h3>
        <button onClick={() => onLogout?.()} className="flex items-center gap-2 text-sm font-semibold text-danger">
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}

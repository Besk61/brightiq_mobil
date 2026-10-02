import { Activity, Bell, BellRing, Camera, FileText, LogOut, MessageSquare, Monitor, Moon, Shield, Siren, Sun, Upload, Volume2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import type { ElementType } from "react";
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../api";
import {
  loadNotificationPreferences,
  MINIMUM_DOWNTIME_NOTIFICATION_MINUTES,
  NotificationFrequency,
  NotificationPreferenceKey,
  NotificationPreferences,
  NotificationSoundCategory,
  NotificationSoundId,
  NotificationSoundPreferences,
  notificationSoundOptions,
  saveNotificationPreferences,
} from "../notificationPreferences";
import { cn } from "../utils";
import { installCustomNotificationSound, previewCustomNotificationSound } from "../customNotificationSound";

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

const notificationSoundRows: Array<{
  key: NotificationSoundCategory;
  title: string;
  description: string;
}> = [
  { key: "fire", title: "Yangın Bildirim Sesi", description: "Fire modülünden gelen alarmlarda çalınır." },
  { key: "area", title: "Alan Kontrol Bildirim Sesi", description: "Area Control modülünden gelen alarmlarda çalınır." },
  { key: "other", title: "Diğer Bildirimlerin Sesi", description: "Diğer modül bildirimlerinde çalınır." },
];

function formatLicenseDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(date);
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
  const [isSavingSounds, setIsSavingSounds] = useState(false);
  const [isLoadingSounds, setIsLoadingSounds] = useState(Boolean(authToken));
  const [testingSound, setTestingSound] = useState<NotificationSoundCategory | null>(null);
  const [isInstallingSound, setIsInstallingSound] = useState(false);
  const [soundMessage, setSoundMessage] = useState<string | null>(null);
  const customSoundInputRef = useRef<HTMLInputElement>(null);
  const soundsBusy = isLoadingSounds || isSavingSounds || isInstallingSound || testingSound !== null;

  useEffect(() => {
    if (!authToken) return;
    let active = true;

    const fetchSettings = async () => {
      setIsLoadingThreshold(true);
      setIsLoadingFeatures(true);
      setIsLoadingSounds(true);
      try {
        const [thresholdRes, featuresRes, soundsRes] = await Promise.all([
          apiGet<{ threshold: number }>("/api/settings/camera-health-threshold/get", authToken).catch(() => null),
          apiGet<CompanyFeature[]>("/api/features/get-company-features", authToken).catch(() => null),
          apiGet<NotificationSoundPreferences>("/api/auth/notification-sounds", authToken).catch(() => null),
        ]);

        if (!active) return;
        if (thresholdRes && typeof thresholdRes.threshold === "number") {
          setThreshold(thresholdRes.threshold);
        }
        if (featuresRes && Array.isArray(featuresRes)) {
          setFeatures(featuresRes);
        }
        if (soundsRes) {
          setNotificationPreferences((current) => {
            const next = {
              ...current,
              sounds: {
                ...current.sounds,
                ...soundsRes,
              },
            };
            saveNotificationPreferences(next);
            return next;
          });
        } else {
          setSoundMessage("Bildirim sesleri yüklenemedi. Bağlantıyı ve backend güncellemesini kontrol edin.");
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setIsLoadingThreshold(false);
          setIsLoadingFeatures(false);
          setIsLoadingSounds(false);
        }
      }
    };

    fetchSettings();
    return () => { active = false; };
  }, [authToken]);

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

  const handleSoundChange = async (category: NotificationSoundCategory, sound: NotificationSoundId) => {
    if (!authToken || soundsBusy) return;
    const sounds = { ...notificationPreferences.sounds, [category]: sound };
    setSoundMessage(null);

    setIsSavingSounds(true);
    try {
      const confirmed = await apiPost<NotificationSoundPreferences>("/api/auth/notification-sounds", sounds, authToken);
      if (confirmed[category] !== sound) {
        throw new Error("Backend bildirim sesini doğrulamadı. Backend güncellemesini kontrol edin.");
      }
      setNotificationPreferences((current) => {
        const next = { ...current, sounds: confirmed };
        saveNotificationPreferences(next);
        return next;
      });
      setSoundMessage("Bildirim sesleri kaydedildi.");
    } catch (error: any) {
      setSoundMessage(error?.message ?? "Bildirim sesi kaydedilemedi.");
    } finally {
      setIsSavingSounds(false);
    }
  };

  const handleTestSound = async (category: NotificationSoundCategory) => {
    if (!authToken || soundsBusy) return;
    setTestingSound(category);
    setSoundMessage(null);
    try {
      const confirmed = await apiPost<NotificationSoundPreferences>("/api/auth/notification-sounds", notificationPreferences.sounds, authToken);
      if (confirmed[category] !== notificationPreferences.sounds[category]) {
        throw new Error("Backend bildirim sesini doğrulamadı. Backend güncellemesini kontrol edin.");
      }
      await apiPost("/api/auth/notification-sounds/test", { category }, authToken);
      setSoundMessage("Test bildirimi push servisine gönderildi.");
    } catch (error: any) {
      setSoundMessage(error?.message ?? "Test bildirimi gönderilemedi.");
    } finally {
      setTestingSound(null);
    }
  };

  const handleCustomSoundFile = async (file?: File) => {
    if (!file) return;
    setIsInstallingSound(true);
    setSoundMessage(null);
    try {
      const soundId = await installCustomNotificationSound(file);
      const label = file.name.replace(/\.wav$/i, "");
      const next = {
        ...notificationPreferences,
        customSounds: {
          ...notificationPreferences.customSounds,
          [soundId]: label || "Özel Ses",
        },
      };
      setNotificationPreferences(next);
      saveNotificationPreferences(next);
      setSoundMessage("Özel ses eklendi. Artık listelerden seçebilirsiniz.");
    } catch (error: any) {
      setSoundMessage(error?.message ?? "Özel ses eklenemedi.");
    } finally {
      setIsInstallingSound(false);
      if (customSoundInputRef.current) customSoundInputRef.current.value = "";
    }
  };

  const previewSound = async (sound: NotificationSoundId) => {
    if (sound === "default") {
      setSoundMessage("Varsayılan ses telefonun bildirim ayarına göre çalınır.");
      return;
    }
    try {
      if (sound.startsWith("custom_")) {
        await previewCustomNotificationSound(sound);
      } else {
        await new Audio("/sounds/" + sound + ".wav").play();
      }
    } catch {
      setSoundMessage("Ses önizlemesi oynatılamadı.");
    }
  };

  const availableSoundOptions = [
    ...notificationSoundOptions,
    ...Object.entries(notificationPreferences.customSounds).map(([value, label]) => ({
      value,
      label: "Özel: " + label,
    })),
  ];

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

          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div>
              <div className="text-sm font-medium text-text-dark">Bildirim Sesleri</div>
              <div className="text-[11px] text-text-muted mt-0.5">Her alarm tipi için farklı bir ses seçebilirsiniz.</div>
            </div>
            {notificationSoundRows.map((row) => {
              const selectedSound = notificationPreferences.sounds[row.key];
              return (
                <div key={row.key} className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium" htmlFor={"notification-sound-" + row.key}>
                    {row.title}
                  </label>
                  <div className="space-y-2">
                    <select
                      id={"notification-sound-" + row.key}
                      className="w-full min-w-0 border border-gray-200 bg-gray-50 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-dark disabled:opacity-50"
                      value={selectedSound}
                      disabled={soundsBusy || !authToken}
                      onChange={(event) => handleSoundChange(row.key, event.target.value as NotificationSoundId)}
                    >
                      {availableSoundOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => previewSound(selectedSound)}
                        disabled={soundsBusy}
                        className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-text-dark active:bg-gray-100 disabled:opacity-50"
                        aria-label={row.title + " önizle"}
                        title="Sesi dinle"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      {Capacitor.isNativePlatform() && (
                        <button
                          type="button"
                          onClick={() => handleTestSound(row.key)}
                          disabled={soundsBusy || !authToken}
                          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-text-dark active:bg-gray-100 disabled:opacity-50"
                          aria-label={row.title + " test bildirimi"}
                          title="Test bildirimi gönder"
                        >
                          <BellRing className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-text-muted">{row.description}</p>
                </div>
              );
            })}
            <input
              ref={customSoundInputRef}
              type="file"
              accept=".wav,audio/wav"
              className="hidden"
              onChange={(event) => handleCustomSoundFile(event.target.files?.[0])}
            />
            <button
              type="button"
              disabled={soundsBusy}
              onClick={() => customSoundInputRef.current?.click()}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-text-dark active:bg-gray-100 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isInstallingSound ? "Ses ekleniyor..." : "Kendi Sesini Ekle"}
            </button>
            <p className="text-[11px] text-text-muted">WAV formatı, en fazla 5 MB ve 29 saniye.</p>
            {isLoadingSounds && <p className="text-xs text-text-muted" role="status">Bildirim sesleri yükleniyor...</p>}
            {soundMessage && <p className="text-xs text-text-muted" role="status">{soundMessage}</p>}
          </div>

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
                min={MINIMUM_DOWNTIME_NOTIFICATION_MINUTES}
                step={1}
                value={notificationPreferences.minimumDowntimeMinutes}
                onChange={(event) => {
                  const next = {
                    ...notificationPreferences,
                    minimumDowntimeMinutes: Math.max(MINIMUM_DOWNTIME_NOTIFICATION_MINUTES, Number(event.target.value) || 0),
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

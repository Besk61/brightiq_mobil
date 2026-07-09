/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback, useRef } from "react";
import Splash from "./screens/Splash";
import Login from "./screens/Login";
import AppLayout from "./components/layout/AppLayout";
import Home from "./screens/Home";
import Cameras from "./screens/Cameras";
import Modules from "./screens/Modules";
import Reports from "./screens/Reports";
import Settings from "./screens/Settings";
import { FCM } from '@capacitor-community/fcm';
import { apiGet, apiPost, resolveImageUrl } from "./api";
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from "@capacitor/status-bar";
import NativeAlertModal, { NativeAlertData } from "./components/NativeAlertModal";
import {
  isNotificationAllowed,
  loadNotificationPreferences,
  NOTIFICATION_PREFERENCES_EVENT,
  NotificationPreferenceCategory,
  NotificationPreferences,
} from "./notificationPreferences";

type Tab = "modules" | "home" | "cameras" | "reports" | "settings";
type ModuleTab = "alerts" | "productivity";

type User = {
  id: number;
  email: string;
  roles: string[];
  companyId: number | null;
  dashboardLandingPath?: string;
};

type Feature = {
  id: number;
  name: string;
  codeName: string;
};

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

const STORAGE_TOKEN = "brightiq_mobile_auth_token";
const STORAGE_USER = "brightiq_mobile_auth_user";
const STORAGE_DEVICE_TOKEN = "brightiq_mobile_device_token";
const EVENTS_UPDATED_EVENT = "brightiq:events-updated";

function notifyEventsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENTS_UPDATED_EVENT));
  }
}

function parseNotificationPayload(data: any) {
  if (!data?.data) return {};
  if (typeof data.data === "string") {
    try {
      return JSON.parse(data.data);
    } catch {
      return {};
    }
  }
  return data.data;
}

function getPushNotificationCategory(payloadData: any): NotificationPreferenceCategory {
  const type = String(payloadData?.type ?? payloadData?.category ?? "").toLowerCase();
  if (type.includes("comment") || type.includes("yorum")) return "comment";
  if (type.includes("health") || type.includes("system") || type.includes("sağlık") || type.includes("saglik")) return "systemHealth";
  if (type.includes("daily") || type.includes("report") || type.includes("rapor")) return "dailyReport";
  if (type.includes("camera") || type.includes("kamera")) return "cameraHealth";
  if (type.includes("alarm") || type.includes("warning") || type.includes("event")) return "alarm";
  return "alarm";
}

function isCriticalNotification(payloadData: any) {
  return Number(payloadData?.alertType ?? payloadData?.moduleId) === 1 || String(payloadData?.priority ?? "").toLowerCase() === "critical";
}

function getDowntimeMinutes(payloadData: any) {
  const minuteValue =
    payloadData?.downtimeMinutes ??
    payloadData?.durationMinutes ??
    payloadData?.unhealthyMinutes ??
    payloadData?.offlineMinutes ??
    payloadData?.minutes;
  if (minuteValue !== undefined && minuteValue !== null) {
    const parsed = Number(minuteValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const secondValue = payloadData?.downtimeSeconds ?? payloadData?.durationSeconds ?? payloadData?.offlineSeconds;
  if (secondValue !== undefined && secondValue !== null) {
    const parsed = Number(secondValue);
    return Number.isFinite(parsed) ? parsed / 60 : null;
  }

  const millisecondValue = payloadData?.downtimeMs ?? payloadData?.durationMs ?? payloadData?.offlineMs;
  if (millisecondValue !== undefined && millisecondValue !== null) {
    const parsed = Number(millisecondValue);
    return Number.isFinite(parsed) ? parsed / 60000 : null;
  }

  return null;
}

function isDowntimeNotificationAllowed(
  payloadData: any,
  notificationCategory: NotificationPreferenceCategory,
  preferences: NotificationPreferences
) {
  if (notificationCategory !== "cameraHealth" && notificationCategory !== "systemHealth") return true;
  const downtimeMinutes = getDowntimeMinutes(payloadData);
  if (downtimeMinutes === null) return true;
  return downtimeMinutes >= preferences.minimumDowntimeMinutes;
}

function getHealthStatusTime(status: HealthStatus) {
  const timestamp = new Date(status.updatedAt || status.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function hasReachedDowntimeThreshold(startTime: number, preferences: NotificationPreferences) {
  const thresholdMinutes = Math.max(0, preferences.minimumDowntimeMinutes ?? 5);
  return (Date.now() - startTime) / 60000 >= thresholdMinutes;
}

const getWebDeviceToken = () => {
  if (typeof window === "undefined") return "WEB";
  let token = localStorage.getItem(STORAGE_DEVICE_TOKEN);
  if (!token) {
    token = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `WEB-${Date.now()}`;
    localStorage.setItem(STORAGE_DEVICE_TOKEN, token);
  }
  return token;
};

export default function App() {
  const [appState, setAppState] = useState<"splash" | "login" | "main">("splash");
  const [authToken, setAuthToken] = useState<string | null>(() => typeof window !== "undefined" ? localStorage.getItem(STORAGE_TOKEN) : null);
  const [currentTab, setCurrentTab] = useState<Tab>("home");
  const [requestedModuleTab, setRequestedModuleTab] = useState<ModuleTab>("alerts");
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [alertTotalCount, setAlertTotalCount] = useState<number | null>(null);
  const [nativeAlert, setNativeAlert] = useState<NativeAlertData | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() => loadNotificationPreferences());
  const unhealthySinceRef = useRef<number | null>(null);
  const unhealthyNotifiedRef = useRef(false);

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const handlePreferenceUpdate = () => {
      setNotificationPreferences(loadNotificationPreferences());
    };
    window.addEventListener(NOTIFICATION_PREFERENCES_EVENT, handlePreferenceUpdate);
    return () => window.removeEventListener(NOTIFICATION_PREFERENCES_EVENT, handlePreferenceUpdate);
  }, []);

  useEffect(() => {
    if (authToken) {
      refreshSessionData();
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;

    const healthInterval = window.setInterval(() => {
      refreshHealthStatus();
    }, 30000);

    const alertInterval = window.setInterval(() => {
      refreshAlertCounts();
    }, 30000);

    let pushListenersSet = false;
    if (Capacitor.isNativePlatform()) {
      // Set status bar to transparent and overlay webview
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

      // 1. ÖNCE DİNLEYİCİLERİ KURUYORUZ (Token geldiğinde kaçırmamak için)
      PushNotifications.addListener('registration', async (token) => {
        let tokenToSend = token.value;
        
        // KRİTİK DOKUNUŞ: Eğer cihaz iOS ise Apple APNs token'ını gerçek FCM token'ına çevir!
        if (Capacitor.getPlatform() === 'ios') {
          try {
            const fcmResult = await FCM.getToken();
            tokenToSend = fcmResult.token;
            console.log('[FCM] iOS için dönüştürülen GERÇEK FCM Token: ' + tokenToSend);
          } catch (err) {
            console.error('[FCM] iOS Token dönüştürme hatası:', err);
          }
        } else {
          console.log('[FCM] Android Push token: ' + tokenToSend);
        }

        // Şimdi backend'imize %100 doğru olan FCM token gidiyor!
        try {
          await apiPost("/api/auth/set-device-token", {
            deviceToken: tokenToSend,
            deviceType: "MOBILE"
          }, authToken);
          console.log('[FCM] Gerçek Token başarıyla backend e iletildi.');
        } catch (error) {
          console.error('[FCM] Token backende iletilemedi:', error);
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[FCM] Push kayıt hatası: ', JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const payloadData = parseNotificationPayload(notification.data);
        const parsedImage = notification.data?.imageUrl || payloadData.image || payloadData.rawImage || undefined;
        const parsedImagePath = typeof parsedImage === "string" ? parsedImage.trim() : "";
        const notificationCategory = getPushNotificationCategory(payloadData);
        const isCritical = isCriticalNotification(payloadData);
        const canNotify =
          isNotificationAllowed(notificationPreferences, notificationCategory, isCritical) &&
          isDowntimeNotificationAllowed(payloadData, notificationCategory, notificationPreferences);
        
        if (canNotify) {
          addNotification({
            id: Date.now(),
            title: notification.title || "Yeni Bildirim",
            body: notification.body || "",
            category: notificationCategory === "systemHealth" ? "health" : notificationCategory === "alarm" ? "alarm" : "info",
            timestamp: new Date().toISOString()
          });

          setNativeAlert({
            id: String(Date.now()),
            title: notification.title || "Bildirim",
            body: notification.body || "",
            imageUrl: parsedImagePath ? resolveImageUrl(parsedImagePath) : undefined,
            type: notificationCategory === "systemHealth" ? "system" : "event",
            moduleName: payloadData.module?.name || "Sistem"
          });
        }
        notifyEventsUpdated();
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        openAlertsModule();
      });
      
      pushListenersSet = true;

      // 2. ŞİMDİ İZİN KONTROLÜ VE POP-UP TETİKLEME (Asenkron güvenli yöntem)
      const registerPushNotifications = async () => {
        try {
          let permStatus = await PushNotifications.checkPermissions();
          
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }
          
          if (permStatus.receive !== 'granted') {
            console.log('[FCM] Kullanıcı bildirim iznini reddetti!');
            return;
          }

          // İzin verildiyse Apple APNs sunucularına kayıt ol
          await PushNotifications.register();
        } catch (e) {
          console.error('[FCM] İzin isteme sırasında hata:', e);
        }
      };

      registerPushNotifications();
    }

    return () => {
      window.clearInterval(healthInterval);
      window.clearInterval(alertInterval);
      if (pushListenersSet) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [authToken, notificationPreferences]);

  // Handle hardware back button for native android/ios
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListener: any;
    
    const setupBackListener = async () => {
      backListener = await CapacitorApp.addListener('backButton', () => {
        // Dispatch event for child components (fullscreen images, popups)
        const event = new CustomEvent('hardwareBackPress', { cancelable: true });
        window.dispatchEvent(event);
        
        // If a child prevented default, do nothing here
        if (event.defaultPrevented) return;

        // If native alert is open, close it
        if (nativeAlert) {
          setNativeAlert(null);
          return;
        }

        // If on another tab, go home
        if (currentTab !== 'home') {
          setCurrentTab('home');
        } else {
          // If on home tab and no modals open, exit app
          CapacitorApp.exitApp();
        }
      });
    };

    setupBackListener();

    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [currentTab, nativeAlert]);

  const addNotification = useCallback((notification: NotificationItem) => {
    setNotifications((prev: NotificationItem[]) => [notification, ...prev].slice(0, 8));

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(notification.title, { body: notification.body });
      } catch {
        // ignore notification permission or browser restrictions
      }
    }
  }, []);

  const clearSession = () => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setAuthToken(null);
    setFeatures([]);
    setHealthStatus(null);
    setNotifications([]);
    setAlertTotalCount(null);
    unhealthySinceRef.current = null;
    unhealthyNotifiedRef.current = false;
    setAppState("login");
  };

  const getRealDeviceToken = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!Capacitor.isNativePlatform()) {
        return resolve(getWebDeviceToken());
      }
      
      let isResolved = false;
      const complete = (val: string) => {
        if (!isResolved) {
          isResolved = true;
          resolve(val);
        }
      };

      PushNotifications.addListener('registration', async (token) => {
        let tokenToSend = token.value;
        if (Capacitor.getPlatform() === 'ios') {
          try {
            const fcmResult = await FCM.getToken();
            tokenToSend = fcmResult.token;
            console.log('[FCM] getRealDeviceToken iOS için dönüştürülen GERÇEK FCM Token: ' + tokenToSend);
          } catch (err) {
            console.error('[FCM] getRealDeviceToken iOS Token dönüştürme hatası:', err);
          }
        }
        complete(tokenToSend);
      });

      PushNotifications.addListener('registrationError', () => {
        complete(getWebDeviceToken());
      });

      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        } else {
          complete(getWebDeviceToken());
        }
      }).catch(() => complete(getWebDeviceToken()));

      setTimeout(() => complete(getWebDeviceToken()), 8000);
    });
  };

  useEffect(() => {
    // Auto sync FCM Token every time the app starts with a valid session
    if (authToken && Capacitor.isNativePlatform()) {
      getRealDeviceToken().then(token => {
        apiPost("/api/auth/set-device-token", {
          deviceToken: token,
          deviceType: "MOBILE"
        }, authToken).catch(e => console.error("Token sync error", e));
      });
    }
  }, [authToken]);

  const handleLogin = async (email: string, password: string) => {
    const isMobile = Capacitor.isNativePlatform();
    const dToken = await getRealDeviceToken();

    const loginResult = await apiPost<User & { accessToken: string }>("/api/auth/signin", {
      email,
      password,
      deviceType: isMobile ? "MOBILE" : "WEB",
      deviceToken: dToken,
    });

    setAuthToken(loginResult.accessToken);
    localStorage.setItem(STORAGE_TOKEN, loginResult.accessToken);
    localStorage.setItem(STORAGE_USER, JSON.stringify(loginResult));
    setAppState("main");

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => null);
    }
  };

  const refreshSessionData = async () => {
    try {
      await Promise.all([refreshCompanyFeatures(), refreshHealthStatus(), refreshAlertCounts()]);
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        clearSession();
      }
      console.error("Session refresh failed:", error);
    }
  };

  const refreshCompanyFeatures = async () => {
    if (!authToken) return;
    try {
      const featureResult = await apiGet<Feature[]>("/api/features/get-company-features", authToken);
      setFeatures(featureResult);
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        clearSession();
      }
    }
  };

  const refreshHealthStatus = async () => {
    if (!authToken) return;

    try {
      const status = await apiGet<HealthStatus | null>("/api/health-check/status", authToken);
      if (!status) {
        unhealthySinceRef.current = null;
        unhealthyNotifiedRef.current = false;
        setHealthStatus(null);
        return;
      }

      setHealthStatus((previous: HealthStatus | null) => {
        if (!status.isHealthy) {
          if (!previous || previous.isHealthy) {
            unhealthySinceRef.current = getHealthStatusTime(status);
            unhealthyNotifiedRef.current = false;
          } else {
            unhealthySinceRef.current = unhealthySinceRef.current ?? getHealthStatusTime(previous);
          }

          if (
            !unhealthyNotifiedRef.current &&
            isNotificationAllowed(notificationPreferences, "systemHealth") &&
            unhealthySinceRef.current !== null &&
            hasReachedDowntimeThreshold(unhealthySinceRef.current, notificationPreferences)
          ) {
            addNotification({
              id: Date.now(),
              title: "Sistem sağlığı düştü",
              body: "Şirketinizde sistem işlevselliği azaldı.",
              category: "health",
              timestamp: new Date().toISOString(),
            });
            unhealthyNotifiedRef.current = true;
          }

          return status;
        }

        const unhealthySince = unhealthySinceRef.current ?? (previous && !previous.isHealthy ? getHealthStatusTime(previous) : null);
        const shouldNotifyRecovery =
          previous &&
          !previous.isHealthy &&
          unhealthyNotifiedRef.current &&
          unhealthySince !== null &&
          hasReachedDowntimeThreshold(unhealthySince, notificationPreferences) &&
          isNotificationAllowed(notificationPreferences, "systemHealth");

        unhealthySinceRef.current = null;
        unhealthyNotifiedRef.current = false;

        if (shouldNotifyRecovery) {
          addNotification({
            id: Date.now(),
            title: "Sistem geri döndü",
            body: "Şirketinizin sağlık durumu artık normal.",
            category: "health",
            timestamp: new Date().toISOString(),
          });
        }
        return status;
      });
    } catch (error: any) {
      if (error?.status === 404) {
        unhealthySinceRef.current = null;
        unhealthyNotifiedRef.current = false;
        setHealthStatus(null);
        return;
      }
      if (error?.status === 401 || error?.status === 403) {
        clearSession();
      }
    }
  };

  const refreshAlertCounts = async () => {
    if (!authToken) return;

    const today = new Date().toISOString().slice(0, 10);
    try {
      const categories = await apiGet<Array<{ module: string; count: number }>>(
        `/api/dashboard/filter-by-category?startDate=${today}&endDate=${today}`,
        authToken
      );
      const totalCount = categories.reduce((sum, item) => sum + (item.count ?? 0), 0);
      
      setAlertTotalCount((previous) => {
        if (
          previous !== null &&
          totalCount > previous &&
          isNotificationAllowed(notificationPreferences, "alarm")
        ) {
        addNotification({
          id: Date.now(),
          title: "Yeni alarm / uyarı",
          body: "Bugün yeni bir alarm veya uyarı oluştu. Lütfen kontrol edin.",
          category: "alarm",
          timestamp: new Date().toISOString(),
        });
          notifyEventsUpdated();
        }
        return totalCount;
      });
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        clearSession();
      }
    }
  };

  const handleNotificationClick = () => {
    // Sadece bildirim listesini gosterir, yonlendirme yapmaz
  };

  const handleNotificationItemClick = (item: NotificationItem) => {
    setRequestedModuleTab("alerts");
    setCurrentTab("modules");
    setNotifications((prev: NotificationItem[]) => prev.filter((notification) => notification.id !== item.id));
  };

  const showProductivityFeature = features.some((feature: Feature) =>
    ["employee_productivity", "zone_productivity"].includes(feature.codeName)
  );

  const openAlertsModule = () => {
    setRequestedModuleTab("alerts");
    setCurrentTab("modules");
  };

  const openProductivityModule = () => {
    setRequestedModuleTab("productivity");
    setCurrentTab("modules");
  };

  const openCamerasTab = () => {
    setCurrentTab("cameras");
  };

  if (appState === "splash") {
    return <Splash onFinish={() => setAppState(authToken ? "main" : "login")} />;
  }

  if (appState === "login") {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <AppLayout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onNotificationClick={handleNotificationClick}
      onNotificationItemClick={handleNotificationItemClick}
      onLogout={clearSession}
      notifications={notifications}
      healthStatus={healthStatus}
    >
      {currentTab === "home" && (
        <Home
          authToken={authToken ?? undefined}
          showProductivityFeature={showProductivityFeature}
          onOpenAlerts={openAlertsModule}
          onOpenProductivity={openProductivityModule}
          onOpenCameras={openCamerasTab}
        />
      )}
      {currentTab === "cameras" && <Cameras authToken={authToken ?? undefined} />}
      {currentTab === "modules" && (
        <Modules
          authToken={authToken ?? undefined}
          showProductivityFeature={showProductivityFeature}
          requestedTab={requestedModuleTab}
          onRequestedTabChange={setRequestedModuleTab}
        />
      )}
      {currentTab === "reports" && <Reports authToken={authToken ?? undefined} />}
      {currentTab === "settings" && <Settings authToken={authToken ?? undefined} onLogout={clearSession} />}

      <NativeAlertModal 
        alert={nativeAlert} 
        authToken={authToken ?? undefined}
        onClose={() => setNativeAlert(null)} 
        onView={() => {
          setNativeAlert(null);
          openAlertsModule();
        }} 
      />
    </AppLayout>
  );
}

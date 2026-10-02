export type NotificationPreferenceKey =
  | "push"
  | "alarms"
  | "comments"
  | "systemHealth"
  | "dailyReports"
  | "cameraHealth"
  | "criticalAlways";

export type NotificationFrequency = "instant" | "1min" | "5min";
export type NotificationSoundId = string;
export type NotificationSoundCategory = "fire" | "area" | "other";

export interface NotificationSoundPreferences {
  fire: NotificationSoundId;
  area: NotificationSoundId;
  other: NotificationSoundId;
}

export const notificationSoundOptions: Array<{ value: NotificationSoundId; label: string }> = [
  { value: "default", label: "Telefonun Varsayılan Sesi" },
  { value: "siren_classic", label: "Klasik Siren" },
  { value: "fire_brigade", label: "İtfaiye Sireni" },
  { value: "siren_urgent", label: "Acil Durum Sireni" },
  { value: "alarm_pulse", label: "Darbeli Alarm" },
];

export interface NotificationPreferences {
  push: boolean;
  alarms: boolean;
  comments: boolean;
  systemHealth: boolean;
  dailyReports: boolean;
  cameraHealth: boolean;
  criticalAlways: boolean;
  frequency: NotificationFrequency;
  minimumDowntimeMinutes: number;
  sounds: NotificationSoundPreferences;
  customSounds: Record<string, string>;
}

export type NotificationPreferenceCategory =
  | "alarm"
  | "comment"
  | "systemHealth"
  | "dailyReport"
  | "cameraHealth"
  | "info";

const STORAGE_KEY = "brightiq_mobile_notification_preferences";
export const MINIMUM_DOWNTIME_NOTIFICATION_MINUTES = 60;
export const NOTIFICATION_PREFERENCES_EVENT = "brightiq:notification-preferences-updated";

export const defaultNotificationPreferences: NotificationPreferences = {
  push: true,
  alarms: true,
  comments: true,
  systemHealth: true,
  dailyReports: true,
  cameraHealth: true,
  criticalAlways: true,
  frequency: "instant",
  minimumDowntimeMinutes: MINIMUM_DOWNTIME_NOTIFICATION_MINUTES,
  sounds: {
    fire: "default",
    area: "default",
    other: "default",
  },
  customSounds: {},
};

export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return defaultNotificationPreferences;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultNotificationPreferences;
    const stored = JSON.parse(raw);
    return {
      ...defaultNotificationPreferences,
      ...stored,
      sounds: {
        ...defaultNotificationPreferences.sounds,
        ...(stored.sounds || {}),
      },
      customSounds: {
        ...defaultNotificationPreferences.customSounds,
        ...(stored.customSounds || {}),
      },
      minimumDowntimeMinutes: Math.max(
        MINIMUM_DOWNTIME_NOTIFICATION_MINUTES,
        Number(stored.minimumDowntimeMinutes) || MINIMUM_DOWNTIME_NOTIFICATION_MINUTES
      ),
    };
  } catch {
    return defaultNotificationPreferences;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(NOTIFICATION_PREFERENCES_EVENT, { detail: preferences }));
}

export function isNotificationAllowed(
  preferences: NotificationPreferences,
  category: NotificationPreferenceCategory,
  isCritical = false
) {
  if (!preferences.push) return false;
  if (isCritical && preferences.criticalAlways) return true;

  switch (category) {
    case "alarm":
      return preferences.alarms;
    case "comment":
      return preferences.comments;
    case "systemHealth":
      return preferences.systemHealth;
    case "dailyReport":
      return preferences.dailyReports;
    case "cameraHealth":
      return preferences.cameraHealth;
    default:
      return true;
  }
}

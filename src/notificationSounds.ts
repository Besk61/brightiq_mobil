import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Channel } from "@capacitor/push-notifications";

const notificationChannels: Channel[] = [
  {
    id: "brightiq_default_v2",
    name: "Sistem Varsayılanı",
    description: "Telefonun varsayılan bildirim sesi",
    importance: 5,
    visibility: 1,
    vibration: true,
  },
  {
    id: "brightiq_siren_classic_v2",
    name: "Klasik Siren",
    description: "BrightIQ klasik siren bildirimleri",
    sound: "siren_classic.wav",
    importance: 5,
    visibility: 1,
    vibration: true,
  },
  {
    id: "brightiq_fire_brigade_v2",
    name: "İtfaiye Sireni",
    description: "BrightIQ iki tonlu itfaiye sireni bildirimleri",
    sound: "fire_brigade.wav",
    importance: 5,
    visibility: 1,
    vibration: true,
  },
  {
    id: "brightiq_siren_urgent_v2",
    name: "Acil Durum Sireni",
    description: "BrightIQ acil durum sireni bildirimleri",
    sound: "siren_urgent.wav",
    importance: 5,
    visibility: 1,
    vibration: true,
  },
  {
    id: "brightiq_alarm_pulse_v2",
    name: "Darbeli Alarm",
    description: "BrightIQ darbeli alarm bildirimleri",
    sound: "alarm_pulse.wav",
    importance: 5,
    visibility: 1,
    vibration: true,
  },
];

export async function configureNotificationChannels() {
  if (Capacitor.getPlatform() !== "android") return;
  await Promise.all(notificationChannels.map((channel) => PushNotifications.createChannel(channel)));
}
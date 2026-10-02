import { Capacitor, registerPlugin } from "@capacitor/core";

interface CustomNotificationSoundPlugin {
  installSound(options: { soundId: string; base64: string }): Promise<{ soundId: string }>;
  previewSound(options: { soundId: string }): Promise<void>;
}

const CustomNotificationSound = registerPlugin<CustomNotificationSoundPlugin>("CustomNotificationSound");

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Ses dosyası okunamadı."));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function getAudioDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("WAV dosyası doğrulanamadı."));
    };
    audio.src = url;
  });
}

export async function installCustomNotificationSound(file: File) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Özel bildirim sesi yalnızca mobil uygulamada eklenebilir.");
  }
  if (!file.name.toLowerCase().endsWith(".wav")) {
    throw new Error("Lütfen WAV formatında bir ses seçin.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ses dosyası en fazla 5 MB olabilir.");
  }

  const duration = await getAudioDuration(file);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 29) {
    throw new Error("Ses süresi 29 saniyeyi geçmemelidir.");
  }

  const soundId = "custom_" + Date.now().toString(36);
  const base64 = await fileToBase64(file);
  await CustomNotificationSound.installSound({ soundId, base64 });
  return soundId;
}

export async function previewCustomNotificationSound(soundId: string) {
  await CustomNotificationSound.previewSound({ soundId });
}
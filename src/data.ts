import { Camera, Alert, Productivity, Report } from './types';

export const mockCameras: Camera[] = [
  { id: 1, name: "Kamera 73", module: "Fire Detection", ip: "212.175.25.145", status: "active", lastSeen: "18.05.2026 00:12", todayAlerts: 7, thumbnail: "https://picsum.photos/seed/cam1/400/300" },
  { id: 2, name: "Kamera 70", module: "Fire Detection", ip: "212.175.25.146", status: "active", lastSeen: "18.05.2026 01:10", todayAlerts: 1, thumbnail: "https://picsum.photos/seed/cam2/400/300" },
  { id: 3, name: "Kamera 34", module: "Fire Detection", ip: "212.175.25.147", status: "inactive", lastSeen: "18.05.2026 12:00", todayAlerts: 0, thumbnail: "https://picsum.photos/seed/cam3/400/300" },
  { id: 4, name: "Depo Giriş", module: "Area Violation", ip: "212.175.25.148", status: "active", lastSeen: "18.05.2026 14:05", todayAlerts: 0, thumbnail: "https://picsum.photos/seed/cam4/400/300" },
  { id: 5, name: "Üretim Hattı 1", module: "Personnel Productivity", ip: "212.175.25.149", status: "active", lastSeen: "18.05.2026 14:15", todayAlerts: 0, thumbnail: "https://picsum.photos/seed/cam5/400/300" },
];

export const mockAlerts: Alert[] = [
  { id: 1, type: "Yangın", eventName: "YANGIN TESPİTİ!", module: "Fire Detection", cameraName: "kamera_73", dateTime: "18.05.2026 - 00:12", status: "new", image: "https://picsum.photos/seed/alert1/800/600", comments: [], isCritical: true },
  { id: 2, type: "Alan İhlali", eventName: "Yetkisiz Giriş", module: "Area Violation", cameraName: "Depo Giriş", dateTime: "18.05.2026 - 04:30", status: "reviewed", image: "https://picsum.photos/seed/alert2/800/600", comments: [{ id: "c1", user: "Ahmet admin", text: "Kontrol edildi, güvenlik personeli.", date: "18.05.2026 - 04:45" }] },
  { id: 3, type: "Kamera Offline", eventName: "Bağlantı Koptu", module: "System", cameraName: "kamera_34", dateTime: "18.05.2026 - 12:00", status: "new", image: "https://picsum.photos/seed/alert3/800/600", comments: [] },
  { id: 4, type: "Yangın", eventName: "YANGIN TESPİTİ!", module: "Fire Detection", cameraName: "kamera_70", dateTime: "18.05.2026 - 15:20", status: "new", image: "https://picsum.photos/seed/alert4/800/600", comments: [] },
  { id: 5, type: "Baret Tespiti", eventName: "Baret İhlali", module: "PPE Detection", cameraName: "kamera_12", dateTime: "18.05.2026 - 16:10", status: "new", image: "https://picsum.photos/seed/alert5/800/600", comments: [], isCritical: true },
  { id: 6, type: "Sigara Tespiti", eventName: "Kapalı Alanda Sigara", module: "Smoking Detection", cameraName: "Arka Koridor", dateTime: "18.05.2026 - 16:45", status: "new", image: "https://picsum.photos/seed/alert6/800/600", comments: [] },
];

export const mockProductivities: Productivity[] = [
  { id: 1, name: "Murat Ayhan", description: "TERZIHANE1", officeTime: 599.97, productiveTime: 420.47, unproductiveTime: 179.50, productivePercentage: 70.1, unproductivePercentage: 29.9, shiftInside: 350, shiftOutside: 70, workStart: "08:00", workEnd: "18:00", lastSeen: "Bugün 15:20" },
  { id: 2, name: "Ünal Erciyes", description: "KESIMHANE1", officeTime: 600, productiveTime: 469.8, unproductiveTime: 130.2, productivePercentage: 78.3, unproductivePercentage: 21.7, shiftInside: 400, shiftOutside: 69.8, workStart: "08:00", workEnd: "18:00", lastSeen: "Bugün 15:20" },
  { id: 3, name: "KENAR-KAPAMA7", description: "Bant 2", officeTime: 600, productiveTime: 469.2, unproductiveTime: 130.8, productivePercentage: 78.2, unproductivePercentage: 21.8 },
  { id: 4, name: "İsmail Köroğlu", description: "DIKIS1", officeTime: 600, productiveTime: 442.8, unproductiveTime: 157.2, productivePercentage: 73.8, unproductivePercentage: 26.2 },
  { id: 5, name: "Ramazan Dede", description: "DIKIS2", officeTime: 600, productiveTime: 433.2, unproductiveTime: 166.8, productivePercentage: 72.2, unproductivePercentage: 27.8 },
];

export const mockReports: Report[] = [
  { 
    id: 1, companyName: "Demo Fabrika", date: "04.06.2026", generalStatus: "Normal", downtime: "12 dk", totalAlerts: 48, aiBlockedFalseAlerts: 34, manuallyDeletedFalseAlerts: 2,
    details: {
      activeCameras: 42,
      passiveCameras: 3,
      productivity: [
        { name: "Ahmet Yılmaz", minutes: 540, total: 600, percentage: 90 },
        { name: "Ayşe Demir", minutes: 517, total: 600, percentage: 86 },
        { name: "Mehmet Kaya", minutes: 450, total: 600, percentage: 75 }
      ],
      areaViolation: [
        { name: "Depo Giriş", active: true, uptime: "%99.8", alerts: 12 },
        { name: "Arka Kapı", active: true, uptime: "%99.9", alerts: 4 }
      ],
      fireDetection: [
        { name: "Kamera_73", status: "Aktif", uptime: "%100", alerts: 7 },
        { name: "Kamera_70", status: "Aktif", uptime: "%100", alerts: 1 },
        { name: "Kamera_34", status: "Pasif", uptime: "%85", alerts: 0 }
      ]
    }
  },
  { 
    id: 2, companyName: "Demo Fabrika", date: "03.06.2026", generalStatus: "Normal", downtime: "5 dk", totalAlerts: 30, aiBlockedFalseAlerts: 25, manuallyDeletedFalseAlerts: 0,
    details: {
      activeCameras: 44,
      passiveCameras: 1,
      productivity: [
        { name: "Ahmet Yılmaz", minutes: 560, total: 600, percentage: 93 },
        { name: "Mehmet Kaya", minutes: 500, total: 600, percentage: 83 }
      ],
      areaViolation: [
        { name: "Depo Giriş", active: true, uptime: "%100", alerts: 8 }
      ],
      fireDetection: [
        { name: "Kamera_73", status: "Aktif", uptime: "%100", alerts: 2 }
      ]
    }
  },
  { 
    id: 3, companyName: "Demo Fabrika", date: "02.06.2026", generalStatus: "Uyarı", downtime: "125 dk", totalAlerts: 110, aiBlockedFalseAlerts: 60, manuallyDeletedFalseAlerts: 10,
    details: {
      activeCameras: 38,
      passiveCameras: 7,
      productivity: [
        { name: "Ayşe Demir", minutes: 400, total: 600, percentage: 66 },
        { name: "Mehmet Kaya", minutes: 350, total: 600, percentage: 58 }
      ],
      areaViolation: [
        { name: "Depo Giriş", active: false, uptime: "%80", alerts: 45 },
        { name: "Arka Kapı", active: true, uptime: "%99.9", alerts: 15 }
      ],
      fireDetection: [
        { name: "Kamera_73", status: "Uyarı", uptime: "%70", alerts: 25 },
        { name: "Kamera_70", status: "Uyarı", uptime: "%75", alerts: 12 },
        { name: "Kamera_34", status: "Pasif", uptime: "%0", alerts: 0 }
      ]
    }
  },
];

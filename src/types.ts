export interface Camera {
  id: number;
  name: string;
  module: string;
  ip: string;
  status: 'active' | 'inactive' | 'warning';
  lastSeen: string;
  todayAlerts: number;
  thumbnail: string;
}

export interface Comment {
  id: string;
  user?: string;
  userName?: string;
  text?: string;
  comment?: string;
  date?: string;
  createdAt?: string;
}

export interface Alert {
  id: number;
  type: string;
  eventName: string;
  module: string;
  cameraName: string;
  dateTime: string;
  createdAt?: string;
  status: 'new' | 'reviewed' | 'true_positive' | 'false_positive';
  image: string;
  comments: Comment[];
  isCritical?: boolean;
}

export interface Productivity {
  id: number;
  name: string;
  description: string;
  officeTime: number;
  productiveTime: number;
  unproductiveTime: number;
  productivePercentage: number;
  unproductivePercentage: number;
  shiftInside?: number;
  shiftOutside?: number;
  workStart?: string;
  workEnd?: string;
  lastSeen?: string;
}

export interface Report {
  id: number;
  companyName: string;
  date: string;
  generalStatus: string;
  downtime: string;
  totalAlerts: number;
  aiBlockedFalseAlerts: number;
  manuallyDeletedFalseAlerts: number;
  details?: {
    activeCameras: number;
    passiveCameras: number;
    productivity: { name: string; minutes: number; total: number; percentage: number }[];
    areaViolation: { name: string; active: boolean; uptime: string; alerts: number }[];
    fireDetection: { name: string; status: string; uptime: string; alerts: number }[];
  }
}

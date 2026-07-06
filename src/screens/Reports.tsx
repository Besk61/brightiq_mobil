import React, { useState, useEffect } from "react";
import { FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Activity, ShieldAlert, VideoOff } from "lucide-react";
import { apiGet } from "../api";

interface ReportsProps {
  authToken?: string;
}

interface CameraReport {
  cameraId: string;
  cameraName: string;
  downTime: number; // minutes
}

interface DailyReport {
  date: string;
  isHealthy: boolean;
  unhealthyMinutes: number;
  cameras: CameraReport[];
  notifications: {
    fire: number;
    area: number;
  };
  llmSavedCount: number;
  deletedCount: number;
}

export default function Reports({ authToken }: ReportsProps) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    // Default son 10 gün (bugün hariç, dünden geriye)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date();
    start.setDate(yesterday.getDate() - 9);

    setEndDate(yesterday.toISOString().split("T")[0]);
    setStartDate(start.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate && authToken) {
      fetchReports();
    }
  }, [startDate, endDate, authToken]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await apiGet<{ reports: DailyReport[] }>(
        `/api/report/company-daily-summary?startDate=${startDate}&endDate=${endDate}`,
        authToken
      );
      const today = new Date().toISOString().split("T")[0];
      // Bugünün raporu hariç tut
      const sorted = (response.reports || [])
        .filter((r) => r.date < today)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setReports(sorted);
    } catch (error) {
      console.error("Raporlar yüklenemedi", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (date: string) => {
    setExpandedDate(prev => prev === date ? null : date);
  };

  const formatMinutes = (minutes: number) => {
    if (!minutes || minutes <= 0) return "0 dk";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const parts = [];
    if (hours > 0) parts.push(`${hours} sa`);
    if (mins > 0) parts.push(`${mins} dk`);
    return parts.length > 0 ? parts.join(" ") : "< 1 dk";
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header & Date Picker Card - always visible */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-900 to-indigo-900 p-5 mx-4 mt-4 mb-2 rounded-2xl shadow-xl z-50 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
        
        <h2 className="text-xl font-bold text-[#ffffff] mb-4 flex items-center relative z-10">
          <FileText className="w-5 h-5 mr-2 opacity-90 text-blue-200" />
          Sistem Raporları
        </h2>
        
        <div className="flex space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10 relative z-10 shadow-inner">
          <div className="flex flex-col flex-1">
            <label className="text-xs text-[#ffffff]/70 mb-1 ml-1">Başlangıç</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#ffffff]/20 text-[#ffffff] rounded-lg px-3 py-2 text-sm outline-none border border-transparent focus:border-white/40 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
          <div className="flex flex-col flex-1">
            <label className="text-xs text-[#ffffff]/70 mb-1 ml-1">Bitiş</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#ffffff]/20 text-[#ffffff] rounded-lg px-3 py-2 text-sm outline-none border border-transparent focus:border-white/40 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>
      </div>

      {/* Rapor Listesi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[100px]">

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Seçilen tarih aralığında rapor bulunamadı.
          </div>
        ) : (
          reports.map((report) => {
            const isExpanded = expandedDate === report.date;
            const totalAlarms = (report.notifications?.fire || 0) + (report.notifications?.area || 0);
            
            return (
              <div key={report.date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200">
                {/* Accordion Header */}
                <button 
                  onClick={() => toggleExpand(report.date)}
                  className="w-full flex items-center justify-between p-4 focus:outline-none"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${report.isHealthy ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {report.isHealthy ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">
                        {new Date(report.date).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                      </h3>
                      <p className={`text-sm font-medium ${report.isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                        {report.isHealthy ? 'Sistem Sağlıklı' : 'Kesinti Yaşandı'}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400 bg-gray-50 p-2 rounded-full">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-50 bg-gray-50/50">
                    
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                        <span className="text-xs text-gray-500 uppercase font-semibold mb-1 flex items-center"><Activity className="w-3 h-3 mr-1"/> Toplam Kesinti</span>
                        <span className={`text-lg font-bold ${report.unhealthyMinutes > 0 ? 'text-red-500' : 'text-gray-800'}`}>
                          {formatMinutes(report.unhealthyMinutes)}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                        <span className="text-xs text-gray-500 uppercase font-semibold mb-1 flex items-center"><ShieldAlert className="w-3 h-3 mr-1"/> Üretilen Alarm</span>
                        <span className="text-lg font-bold text-yellow-600">
                          {totalAlarms} adet
                        </span>
                      </div>
                    </div>

                    {/* AI Section */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex items-start">
                      <div className="text-3xl mr-3">🤖</div>
                      <div>
                        <h4 className="text-blue-900 font-bold text-sm mb-1">BrightIQ Yapay Zeka</h4>
                        <p className="text-blue-700 text-xs leading-relaxed">
                          Yapay zeka analizleri sayesinde <strong className="text-blue-900">{report.llmSavedCount}</strong> adet hatalı / sahte alarm filtrelenerek size ulaşması engellendi.
                        </p>
                        {report.deletedCount > 0 && (
                          <p className="text-blue-500 text-[10px] mt-1 italic">
                            (Operatör tarafından manuel silinen alarm: {report.deletedCount})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Cameras Section */}
                    {report.cameras && report.cameras.length > 0 && (
                      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                        <div className="bg-gray-100/80 px-3 py-2 border-b border-gray-100">
                          <h4 className="text-xs font-bold text-gray-600 flex items-center uppercase">
                            <VideoOff className="w-3 h-3 mr-1" /> Kamera Durumları
                          </h4>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {report.cameras.map(cam => (
                            <div key={cam.cameraId} className="p-3 flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 truncate pr-2">{cam.cameraName}</span>
                              <div className="flex flex-col items-end min-w-[80px]">
                                {cam.downTime > 0 ? (
                                  <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    {formatMinutes(cam.downTime)} Kesinti
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    Kesintisiz
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

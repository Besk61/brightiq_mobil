import { useEffect, useState } from "react";
import { apiGet, apiPost, resolveImageUrl } from "../../api";
import { Alert } from "../../types";
import { Search, Filter, MessageSquare, X, CheckCircle, XCircle, Play, Pause, ChevronRight, User, Plus, AlertCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { cn } from "../../utils";
import AuthenticatedImage from "../../components/AuthenticatedImage";

interface AlertsModuleProps {
  authToken?: string;
}

interface EventComment {
  id: number;
  comment: string;
  userName: string;
  createdAt: string;
}

interface EventResponse {
  id: number;
  name: string;
  image: string | null;
  rawImage: string | null;
  alertType: number | null;
  isRead: boolean;
  createdAt: string;
  isSuccessful?: boolean | null;
  camera?: { name: string } | null;
  module?: { name: string } | null;
  comments?: EventComment[];
}

interface CameraFilterOption {
  id: string;
  name: string;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateSafe(dateString: string | undefined | null) {
  if (!dateString) return "";
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

const EVENTS_UPDATED_EVENT = "brightiq:events-updated";

function getEventDateRange(filterTime: string, customDateRange: { start: string; end: string }) {
  const endDate = new Date();
  const startDate = new Date();

  if (filterTime.startsWith("Bug") || filterTime === "Son 1 Saat") {
    return { startDate: endDate, endDate };
  }

  if (filterTime.includes("Tarih") && customDateRange.start && customDateRange.end) {
    return {
      startDate: new Date(`${customDateRange.start}T00:00:00`),
      endDate: new Date(`${customDateRange.end}T23:59:59`),
    };
  }

  startDate.setDate(endDate.getDate() - 7);
  return { startDate, endDate };
}

function isWithinActiveTimeFilter(createdAt: string | undefined, filterTime: string) {
  if (filterTime !== "Son 1 Saat") return true;
  if (!createdAt) return false;
  return new Date(createdAt).getTime() >= Date.now() - 60 * 60 * 1000;
}

export default function AlertsModule({ authToken }: AlertsModuleProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterModules, setFilterModules] = useState<string[]>(["Tümü"]);
  const [filterTime, setFilterTime] = useState("Tümü");
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" });
  const [filterCameraId, setFilterCameraId] = useState("all");
  const [activeCustomDateRange, setActiveCustomDateRange] = useState({ start: "", end: "" });
  const [activeFilterModules, setActiveFilterModules] = useState<string[]>(["Tümü"]);
  const [activeFilterTime, setActiveFilterTime] = useState("Tümü");
  const [commentAlertId, setCommentAlertId] = useState<number | null>(null);
  const [activeFilterCameraId, setActiveFilterCameraId] = useState("all");
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scanSuccessStates, setScanSuccessStates] = useState<Record<number, boolean | null>>({});
  const [eventRefreshKey, setEventRefreshKey] = useState(0);
  const [cameraOptions, setCameraOptions] = useState<CameraFilterOption[]>([]);

  const modules = ["Tümü", "Yangın", "Alan İhlali", "Kamera Offline", "Baret Tespiti", "Sigara Tespiti"];
  const times = ["Tümü", "Son 1 Saat", "Bugün", "Tarih Aralığı"];

  // Geri tuşuna basıldığında eğer resim açıksa kapat
  useEffect(() => {
    const handleHardwareBack = (e: Event) => {
      if (selectedImage) {
        e.preventDefault();
        setSelectedImage(null);
      }
    };
    window.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => window.removeEventListener('hardwareBackPress', handleHardwareBack);
  }, [selectedImage]);

  useEffect(() => {
    const handleEventsUpdated = () => setEventRefreshKey((value) => value + 1);
    window.addEventListener(EVENTS_UPDATED_EVENT, handleEventsUpdated);
    return () => window.removeEventListener(EVENTS_UPDATED_EVENT, handleEventsUpdated);
  }, []);

  useEffect(() => {
    if (!authToken) return;

    apiGet<Array<{ id: string | number; name: string }>>("/api/camera/cameras?limit=100&offset=0", authToken)
      .then((cameras) => {
        setCameraOptions(cameras.map((camera) => ({ id: String(camera.id), name: camera.name })));
      })
      .catch(() => setCameraOptions([]));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;

    const fetchAlerts = async () => {
      setIsLoading(true);
      try {
        const { startDate, endDate } = getEventDateRange(activeFilterTime, activeCustomDateRange);
        const cameraQuery = activeFilterCameraId !== "all" ? `&cameraId=${encodeURIComponent(activeFilterCameraId)}` : "";
        const events = await apiGet<EventResponse[]>(
          `/api/event/events?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}&limit=30&offset=0${cameraQuery}`,
          authToken
        );

        const initialScanStates: Record<number, boolean | null> = {};
        
        setAlerts(events.map((event) => {
          initialScanStates[event.id] = event.isSuccessful ?? null;
          const imageUrl = resolveImageUrl(event.image?.trim() || event.rawImage?.trim());
          return {
            id: event.id,
            type: event.alertType === 1 ? 'Alarm' : event.alertType === 2 ? 'Uyarı' : event.module?.name ?? 'Bilgi',
            eventName: event.name,
            module: event.module?.name ?? 'Bilinmiyor',
            cameraName: event.camera?.name ?? 'Bilinmiyor',
            dateTime: new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.createdAt)),
            createdAt: event.createdAt,
            status: event.isRead ? 'reviewed' : 'new',
            image: imageUrl || '',
            comments: (event.comments || []).map(c => ({
              id: c.id.toString(),
              userName: c.userName,
              comment: c.comment,
              createdAt: c.createdAt,
            })),
            isCritical: event.alertType === 1,
          };
        }));
        setScanSuccessStates(prev => ({ ...prev, ...initialScanStates }));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();
  }, [authToken, activeFilterTime, activeCustomDateRange, activeFilterModules, activeFilterCameraId, eventRefreshKey]);

  const moduleMap: Record<string, string[]> = {
    "Yangın": ["fire detection", "yangın", "fire", "smoke"],
    "Alan İhlali": ["alan ihlali", "zone intrusion", "intrusion", "area"],
    "Kamera Offline": ["kamera offline", "offline", "connection", "bağlantı"],
    "Baret Tespiti": ["baret tespiti", "hard hat", "helmet", "baret"],
    "Sigara Tespiti": ["sigara tespiti", "smoking", "sigara", "smoke detection"],
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (!isWithinActiveTimeFilter(alert.createdAt, activeFilterTime)) {
      return false;
    }

    if (!activeFilterModules.includes("Tümü")) {
      const typeLower = alert.type.toLowerCase();
      const moduleLower = alert.module.toLowerCase();
      const eventNameLower = alert.eventName.toLowerCase();

      const matches = activeFilterModules.some(filterItem => {
        const keywords = moduleMap[filterItem] || [filterItem.toLowerCase()];
        return keywords.some(kw => typeLower.includes(kw) || moduleLower.includes(kw) || eventNameLower.includes(kw));
      });
      
      if (!matches) return false;
    }
    return true;
  });

  const toggleFilterModule = (m: string) => {
    if (m === "Tümü") {
      setFilterModules(["Tümü"]);
    } else {
      setFilterModules((prev) => {
        const next = prev.includes("Tümü") ? [] : [...prev];
        if (next.includes(m)) {
          const removed = next.filter((mod) => mod !== m);
          return removed.length === 0 ? ["Tümü"] : removed;
        }
        return [...next, m];
      });
    }
  };

  const handleApplyFilter = () => {
    setActiveFilterModules(filterModules.length > 0 ? filterModules : ["Tümü"]);
    setActiveFilterTime(filterTime);
    setActiveCustomDateRange(customDateRange);
    setActiveFilterCameraId(filterCameraId);
    setIsFilterOpen(false);
  };

  const handleAction = (alertId: number) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: 'reviewed' } : a)));
    setSelectedImage(null);
  };

  const handleSetScanSuccess = async (eventId: number, isSuccessful: boolean) => {
    if (!authToken) return;
    
    if (scanSuccessStates[eventId] !== undefined && scanSuccessStates[eventId] !== null) {
      window.alert("Bu bildirim için daha önce bir seçim yaptınız!");
      return;
    }
    
    const msg = isSuccessful 
      ? "Doğru tarama olarak işaretlemek üzeresiniz. Onaylıyor musunuz?" 
      : "Yanlış tarama olarak işaretlemek üzeresiniz. Onaylıyor musunuz?";
      
    if (!window.confirm(msg)) return;

    try {
      await apiPost('/api/event/set-scan-success', { eventId, isSuccessful }, authToken);
      setScanSuccessStates(prev => ({ ...prev, [eventId]: isSuccessful }));
    } catch (error) {
      console.error("Scan success error:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || commentAlertId === null || !authToken) return;

    try {
      const resData: any = await apiPost('/api/event/comment', {
        eventId: commentAlertId,
        comment: newComment
      }, authToken);
      
      const createdComment = resData.data;

      setAlerts((prev) =>
        prev.map((a) => {
          if (a.id === commentAlertId) {
            const newId = createdComment?.id?.toString() || Date.now().toString();
            // Aynı ID'li yorum zaten varsa tekrar ekleme
            const alreadyExists = (a.comments || []).some((c: any) => c.id === newId);
            if (alreadyExists) return a;
            return {
              ...a,
              comments: [
                ...(a.comments || []),
                {
                  id: newId,
                  userName: createdComment?.userName || 'Kullanıcı',
                  comment: createdComment?.comment || newComment,
                  createdAt: createdComment?.createdAt ? formatDateSafe(createdComment.createdAt) : formatDateSafe(new Date().toISOString()),
                },
              ],
            };
          }
          return a;
        })
      );
      setNewComment("");
    } catch (error) {
      console.error("Yorum ekleme hatası:", error);
      window.alert("Yorum eklenirken bir hata oluştu.");
    }
  };

  const activeCommentsAlert = alerts.find((a) => a.id === commentAlertId);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Arama..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className={cn(
            "p-2 bg-white border rounded-xl transition-colors",
            !activeFilterModules.includes("Tümü") || activeFilterTime !== "Tümü" || activeFilterCameraId !== "all"
              ? "border-primary text-primary"
              : "border-gray-100 text-gray-500"
          )}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">Veriler yükleniyor...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">Listelenecek alarm bulunamadı.</div>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative">
              <AuthenticatedImage
                src={alert.image || `https://picsum.photos/seed/alert-${alert.id}/800/600`}
                authToken={authToken}
                fallbackSrc={`https://picsum.photos/seed/alert-${alert.id}/800/600`}
                alt={alert.type}
                className="w-full h-full object-cover"
                containerClassName="w-full h-40 bg-gray-200"
                onImageClick={() => setSelectedImage(alert.image)}
                interactiveIcon={<Search className="w-8 h-8 text-white drop-shadow-md" />}
              />
              {alert.isCritical && (
                <div className="absolute top-2 left-2 bg-danger text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm z-30">
                  KRİTİK
                </div>
              )}
              <div className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase">{alert.type}</span>
                  <span className="text-xs text-text-muted">{alert.dateTime}</span>
                </div>
                <h4 className="font-bold text-text-dark">{alert.eventName}</h4>
                <p className="text-xs text-text-muted mt-1">{alert.cameraName} • {alert.module}</p>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-2">
                    <span
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-md font-semibold",
                        alert.status === 'new' ? 'bg-warning/10 text-warning' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {alert.status === 'new' ? 'Yeni' : 'İncelendi'}
                    </span>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSetScanSuccess(alert.id, true); }}
                      className={cn(
                        "flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-semibold transition-colors",
                        scanSuccessStates[alert.id] === true ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-green-500 hover:text-white"
                      )}
                    >
                      <CheckCircle className="w-3 h-3" /> Doğru
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSetScanSuccess(alert.id, false); }}
                      className={cn(
                        "flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-semibold transition-colors",
                        scanSuccessStates[alert.id] === false ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-red-500 hover:text-white"
                      )}
                    >
                      <XCircle className="w-3 h-3" /> Yanlış
                    </button>
                  </div>

                  <button
                    onClick={() => setCommentAlertId(alert.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded-md focus:bg-primary/10"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Yorum ({alert.comments.length})</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex flex-col justify-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-4 pb-20 relative h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-lg text-text-dark">Filtrele</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 mb-2 flex-1 overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Modül Tipi</label>
                <div className="flex flex-wrap gap-2">
                  {modules.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleFilterModule(m)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border",
                        filterModules.includes(m)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Kamera</label>
                <select
                  value={filterCameraId}
                  onChange={(event) => setFilterCameraId(event.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-dark"
                >
                  <option value="all">Tüm Kameralar</option>
                  {cameraOptions.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Tarih</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {times.map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterTime(t)}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-medium border text-center transition-colors",
                        filterTime === t
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {filterTime === 'Tarih Aralığı' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 mb-1 block">Başlangıç</label>
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-text-dark focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 mb-1 block">Bitiş</label>
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-text-dark focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleApplyFilter}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold mb-4 flex-shrink-0"
            >
              Filtreyi Uygula
            </button>
          </div>
        </div>
      )}

      {commentAlertId && activeCommentsAlert && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex flex-col justify-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-4 pb-20 relative flex flex-col h-[70vh]">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-lg text-text-dark">Yorumlar</h3>
              <button onClick={() => setCommentAlertId(null)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar mb-4">
              {activeCommentsAlert.comments.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">Henüz yorum yapılmamış.</div>
              ) : (
                activeCommentsAlert.comments.map((comment: any) => (
                  <div key={comment.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-xs text-text-dark">{comment.userName || comment.user || 'Kullanıcı'}</span>
                      <span className="text-[10px] text-gray-400">
                        {comment.createdAt ? formatDateSafe(comment.createdAt) : (comment.date || '')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.comment || comment.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 flex-shrink-0 mb-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Yorumunuzu yazın..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-[60] bg-white/95 flex flex-col items-center justify-center">
          <div className="absolute top-0 right-0 p-4 safe-pt w-full flex justify-end">
            <button onClick={() => setSelectedImage(null)} className="p-2 bg-gray-500/20 rounded-full text-text-dark">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full h-3/5 my-auto px-2 pb-16 overflow-hidden">
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit={true}
              wheel={{ step: 0.1 }}
            >
              <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                <AuthenticatedImage
                  src={selectedImage}
                  authToken={authToken}
                  className="w-full h-full object-contain"
                  containerClassName="w-full h-full"
                  alt="Enlarged Alert"
                />
              </TransformComponent>
            </TransformWrapper>
          </div>

          <div className="w-full px-6 pb-24 absolute bottom-0 space-y-4 bg-gradient-to-t from-black/80 to-transparent pt-10">
            <button
              onClick={() => {
                const alertId = alerts.find((a) => a.image === selectedImage)?.id;
                setSelectedImage(null);
                if (alertId) setCommentAlertId(alertId);
              }}
              className="w-full bg-white/10 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium"
            >
              <MessageSquare className="w-5 h-5" />
              Yorum Ekle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

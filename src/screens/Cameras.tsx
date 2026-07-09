import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, X } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { apiGet, resolveImageUrl } from "../api";
import AuthenticatedImage from "../components/AuthenticatedImage";
import { cn } from "../utils";

interface DashboardCamera {
  id: string;
  name: string;
  isFunctioning: boolean;
  isFunctioningUpdateDate: string;
  image: string;
  modules?: Array<{ name: string }> | null;
  events?: Array<{ alertType: number | null; createdAt: string }> | null;
}

interface CameraCardItem {
  id: string;
  name: string;
  module: string;
  status: "active" | "warning" | "inactive";
  lastSeen: string;
  todayAlerts: number;
  thumbnail: string;
}

type SortBy = "name" | "downtime" | "alerts";

function mapCamera(camera: DashboardCamera): CameraCardItem {
  const moduleName = camera.modules?.[0]?.name || "Kamera";
  const status = camera.isFunctioning === false
    ? "inactive"
    : camera.events?.some((event) => event.alertType === 2)
    ? "warning"
    : "active";

  return {
    id: camera.id,
    name: camera.name,
    module: moduleName,
    status,
    lastSeen: camera.isFunctioningUpdateDate
      ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(camera.isFunctioningUpdateDate))
      : "Bilinmiyor",
    todayAlerts: camera.events?.length ?? 0,
    thumbnail: resolveImageUrl(camera.image) ?? "",
  };
}

function sortCameras(cameras: CameraCardItem[], sortBy: SortBy) {
  return [...cameras].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "alerts") return b.todayAlerts - a.todayAlerts;
    if (sortBy === "downtime") return (b.status === "inactive" ? 1 : 0) - (a.status === "inactive" ? 1 : 0);
    return 0;
  });
}

export default function Cameras({ authToken }: { authToken?: string }) {
  const [cameras, setCameras] = useState<CameraCardItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleHardwareBack = (e: Event) => {
      if (selectedImage) {
        e.preventDefault();
        setSelectedImage(null);
      }
    };
    window.addEventListener("hardwareBackPress", handleHardwareBack);
    return () => window.removeEventListener("hardwareBackPress", handleHardwareBack);
  }, [selectedImage]);

  useEffect(() => {
    if (!authToken) return;

    const fetchCameras = async () => {
      setIsLoading(true);
      try {
        const response = await apiGet<DashboardCamera[]>("/api/camera/cameras?limit=100&offset=0", authToken);
        setCameras(response.map(mapCamera));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCameras();
  }, [authToken]);

  const sortedCameras = useMemo(() => sortCameras(cameras, sortBy), [cameras, sortBy]);

  const renderCameraCard = (cam: CameraCardItem) => (
    <div
      key={cam.id}
      className={cn(
        "bg-white rounded-xl p-2.5 flex gap-3 items-center border shadow-sm transition-all",
        cam.status === "inactive" ? "opacity-70 border-gray-100" : "border-transparent"
      )}
    >
      <AuthenticatedImage
        src={cam.thumbnail || `https://picsum.photos/seed/${encodeURIComponent(cam.name)}/400/300`}
        authToken={authToken}
        fallbackSrc={`https://picsum.photos/seed/${encodeURIComponent(cam.name)}/400/300`}
        alt={cam.name}
        className="w-full h-full object-cover"
        containerClassName="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0"
        onImageClick={() => setSelectedImage(cam.thumbnail)}
        interactiveIcon={<Search className="w-5 h-5 text-white drop-shadow-md" />}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-semibold text-sm text-text-dark break-all">{cam.name}</h4>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-sm font-semibold flex-shrink-0",
              cam.status === "active"
                ? "bg-accent/10 text-accent"
                : cam.status === "warning"
                ? "bg-warning/10 text-warning"
                : "bg-gray-100 text-gray-500"
            )}
          >
            {cam.status === "active" ? "Aktif" : cam.status === "warning" ? "Uyarı" : "Deaktif"}
          </span>
        </div>
        <span className="text-[10px] text-text-muted mt-0.5">{cam.module}</span>
        <span className="text-[10px] text-gray-400 mt-2">
          {cam.status === "active" ? `Bugün ${cam.todayAlerts} alarm` : `Son: ${cam.lastSeen}`}
        </span>
        <div className="mt-2.5">
          <div className="flex justify-between text-[8px] text-gray-400 font-bold mb-1">
            <span>{cam.status === "inactive" ? "% 0 Çalışma" : "% 100 Çalışma"}</span>
            <span>{cam.status === "inactive" ? "% 100 Kapalı" : "% 0 Kapalı"}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 flex overflow-hidden">
            <div className="bg-[#22c55e] h-full transition-all duration-500" style={{ width: cam.status === "inactive" ? "0%" : "100%" }} />
            <div className="bg-[#ef4444] h-full transition-all duration-500" style={{ width: cam.status === "inactive" ? "100%" : "0%" }} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-4 pb-[100px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-dark">Kameralar</h2>
          <p className="text-sm text-text-muted">Tüm kameralar, çalışma durumu ve günlük alarm sayıları</p>
        </div>
        <select
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-primary bg-white text-text-dark"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
        >
          <option value="name">İsme Göre</option>
          <option value="downtime">Kesintiye Göre</option>
          <option value="alerts">Alarm Sayısına Göre</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">Kameralar yükleniyor...</div>
      ) : sortedCameras.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">Listelenecek kamera bulunamadı.</div>
      ) : (
        <div className="space-y-3">{sortedCameras.map(renderCameraCard)}</div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-[70] bg-white/95 flex flex-col items-center justify-center">
          <div className="absolute top-0 right-0 p-4 safe-pt w-full flex justify-end">
            <button onClick={() => setSelectedImage(null)} className="p-2 bg-gray-500/20 rounded-full text-text-dark">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full h-3/5 my-auto px-2 overflow-hidden">
            <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit={true} wheel={{ step: 0.1 }}>
              <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                <AuthenticatedImage
                  src={selectedImage}
                  authToken={authToken}
                  className="w-full h-full object-contain"
                  containerClassName="w-full h-full"
                  alt="Enlarged Camera View"
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      )}
    </motion.div>
  );
}

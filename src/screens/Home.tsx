import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { AlertCircle, ArrowUpRight, ChevronLeft, ChevronRight, VideoOff } from "lucide-react";
import { apiGet, apiPost } from "../api";
import { cn } from "../utils";

interface DashboardCategory {
  module: string;
  count: number;
}

interface DashboardCounts {
  camCount: number;
  brightIQCamCount: number;
  userCount: number;
  locationCount: number;
  llmSavedCount?: number;
  unhealthyMinutes?: number;
}

interface EventResponse {
  id: number;
  name: string;
  alertType: number | null;
  createdAt: string;
  camera?: { name: string } | null;
  module?: { name: string } | null;
}

interface ProductivityListItem {
  productivePercentage: string;
}

interface WeeklyProductivityStats {
  min: number;
  max: number;
  avg: number;
}

interface HomeProps {
  authToken?: string;
  showProductivityFeature: boolean;
  onOpenAlerts: () => void;
  onOpenProductivity: () => void;
  onOpenCameras: () => void;
}

const defaultChartData: DashboardCategory[] = [
  { module: "Alarm", count: 0 },
  { module: "Uyarı", count: 0 },
  { module: "Kamera Offline", count: 0 },
  { module: "Diğer", count: 0 },
];

const statusColors: Record<string, string> = {
  Alarm: "#EF4444",
  Uyarı: "#F59E0B",
  "Kamera Offline": "#64748B",
  Diğer: "#10B981",
};

const dynamicColors = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#14B8A6",
  "#06B6D4",
  "#6366F1",
  "#D946EF",
];

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toLocalISOString(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
}

function getWeekRange() {
  const endDate = new Date();
  const startDate = new Date();
  const day = startDate.getDay();
  startDate.setDate(startDate.getDate() - ((day + 6) % 7));
  startDate.setHours(0, 0, 0, 1);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

function formatAlertDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
}

export default function Home({ authToken, showProductivityFeature, onOpenAlerts, onOpenProductivity, onOpenCameras }: HomeProps) {
  const [chartData, setChartData] = useState<DashboardCategory[]>(defaultChartData);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [latestAlert, setLatestAlert] = useState<EventResponse | null>(null);
  const [weeklyProductivity, setWeeklyProductivity] = useState<WeeklyProductivityStats | null>(null);
  const [activeOverviewPage, setActiveOverviewPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProductivity, setIsLoadingProductivity] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);

  const currentDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  useEffect(() => {
    if (!showProductivityFeature && activeOverviewPage === 1) {
      setActiveOverviewPage(0);
    }
  }, [showProductivityFeature, activeOverviewPage]);

  useEffect(() => {
    if (!authToken) return;

    apiGet<{ company?: { name?: string } | null }>("/api/auth/is-auth", authToken)
      .then((user) => {
        if (user?.company?.name) setCompanyName(user.company.name);
      })
      .catch(() => null);

    const fetchDashboard = async () => {
      setIsLoading(true);
      if (showProductivityFeature) {
        setIsLoadingProductivity(true);
      }
      try {
        const todayObj = new Date();
        const pastObj = new Date();
        pastObj.setDate(pastObj.getDate() - 7);

        const today = formatDate(todayObj);
        const past = formatDate(pastObj);

        const [countsResponse, categoryResponse, latestEvents] = await Promise.all([
          apiGet<DashboardCounts>("/api/dashboard/counts", authToken),
          apiGet<DashboardCategory[]>(`/api/dashboard/filter-by-category?startDate=${today}&endDate=${today}&limit=5&offset=0`, authToken),
          apiGet<EventResponse[]>(`/api/event/events?startDate=${past}&endDate=${today}&limit=1&offset=0`, authToken),
        ]);

        setCounts(countsResponse);
        setChartData(categoryResponse.length > 0 ? categoryResponse : defaultChartData);
        setLatestAlert(latestEvents[0] ?? null);

        if (showProductivityFeature) {
          const { startDate, endDate } = getWeekRange();
          try {
            const zones = await apiPost<ProductivityListItem[]>(
              "/api/zone/get-zones-productivity-list?limit=100&offset=0",
              {
                startDate: toLocalISOString(startDate),
                endDate: toLocalISOString(endDate),
                orderBy: [{ attribute: "productiveTime", orderBy: "DESC" }],
              },
              authToken
            );

            const percentages = (zones || [])
              .map((item) => Number.parseFloat(item.productivePercentage))
              .filter((value) => Number.isFinite(value));

            setWeeklyProductivity(
              percentages.length
                ? {
                    min: Math.round(Math.min(...percentages)),
                    max: Math.round(Math.max(...percentages)),
                    avg: Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length),
                  }
                : null
            );
          } finally {
            setIsLoadingProductivity(false);
          }
        } else {
          setWeeklyProductivity(null);
          setIsLoadingProductivity(false);
        }
      } catch (error) {
        console.error(error);
        setIsLoadingProductivity(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [authToken, showProductivityFeature]);

  const totalChartValue = chartData.reduce((sum, item) => sum + (item.count ?? 0), 0);
  const chartSegments = chartData.map((item, idx) => ({
    ...item,
    color: statusColors[item.module] ?? dynamicColors[idx % dynamicColors.length],
  }));

  const pageCount = showProductivityFeature ? 2 : 1;

  const goPreviousOverview = () => {
    if (!showProductivityFeature) return;
    setActiveOverviewPage((page) => (page === 0 ? 1 : 0));
  };

  const goNextOverview = () => {
    if (!showProductivityFeature) return;
    setActiveOverviewPage((page) => (page === 1 ? 0 : 1));
  };

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-[100px]">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-text-dark">{companyName ?? "BrightIQ"}</h2>
        <p className="text-sm text-text-muted">{currentDate}</p>
      </div>

      <div className="space-y-2">
        <div className="relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden">
          {showProductivityFeature && (
            <>
              <button
                onClick={goPreviousOverview}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500"
                aria-label="Önceki özet"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNextOverview}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500"
                aria-label="Sonraki özet"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {activeOverviewPage === 0 ? (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-semibold text-text-dark">Alarm ve Uyarı Kategori Dağılımı</h3>
                <button onClick={onOpenAlerts} className="text-xs font-semibold text-primary flex items-center gap-1">
                  Alarmlara Git <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center">
                <div className="w-1/2 h-36 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartSegments} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="count" stroke="none">
                        {chartSegments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-text-dark">{totalChartValue}</span>
                    <span className="text-[10px] text-text-muted">Toplam</span>
                  </div>
                </div>
                <div className="w-1/2 flex flex-col gap-2 pl-2">
                  {chartSegments.map((item) => (
                    <div key={item.module} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-text-muted flex-1">{item.module}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-5">
                <h3 className="font-semibold text-text-dark">Haftalık Personel Verimlilik</h3>
                <button onClick={onOpenProductivity} className="text-xs font-semibold text-primary flex items-center gap-1">
                  Verimliliğe Git <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {isLoadingProductivity ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Verimlilik verileri yükleniyor...
                </div>
              ) : weeklyProductivity ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-center">
                    <span className="text-[10px] text-text-muted font-semibold">Maksimum</span>
                    <div className="text-2xl font-bold text-accent mt-1">%{weeklyProductivity.max}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-center">
                    <span className="text-[10px] text-text-muted font-semibold">Ortalama</span>
                    <div className="text-2xl font-bold text-primary mt-1">%{weeklyProductivity.avg}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-center">
                    <span className="text-[10px] text-text-muted font-semibold">Minimum</span>
                    <div className="text-2xl font-bold text-warning mt-1">%{weeklyProductivity.min}</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Bu hafta için verimlilik verisi bulunamadı.
                </div>
              )}
            </>
          )}
        </div>

        {pageCount > 1 && (
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: pageCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveOverviewPage(index)}
                className={cn("h-1.5 rounded-full transition-all", activeOverviewPage === index ? "w-5 bg-primary" : "w-1.5 bg-gray-300")}
                aria-label={`${index + 1}. özet sayfası`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenCameras}
          className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col gap-2 text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-danger" />
            </div>
            <span className="text-xl font-bold text-text-dark">{counts?.brightIQCamCount ?? "-"}</span>
          </div>
          <span className="text-xs font-medium text-text-muted">Yönetilen Kamera</span>
        </button>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <VideoOff className="w-4 h-4 text-accent" />
            </div>
            <span className="text-xl font-bold text-text-dark">
              {counts?.unhealthyMinutes ? `${Math.floor(counts.unhealthyMinutes)} dk` : "-"}
            </span>
          </div>
          <span className="text-xs font-medium text-text-muted">Toplam Kesinti</span>
        </div>
      </div>

      <button
        onClick={onOpenAlerts}
        disabled={!latestAlert}
        className={cn(
          "w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition active:scale-[0.99]",
          latestAlert ? "cursor-pointer" : "opacity-70 cursor-default"
        )}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-text-dark">Son Gelen Alarm</h3>
          {latestAlert && <ArrowUpRight className="w-4 h-4 text-primary" />}
        </div>
        {isLoading ? (
          <div className="text-sm text-text-muted">Yükleniyor...</div>
        ) : latestAlert ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] px-2 py-1 rounded-md font-bold", latestAlert.alertType === 1 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning")}>
                {latestAlert.alertType === 1 ? "Alarm" : "Uyarı"}
              </span>
              <span className="text-xs text-text-muted">{formatAlertDate(latestAlert.createdAt)}</span>
            </div>
            <div className="font-bold text-text-dark">{latestAlert.name}</div>
            <div className="text-xs text-text-muted">
              {latestAlert.camera?.name ?? "Bilinmeyen kamera"} • {latestAlert.module?.name ?? "Bilinmeyen modül"}
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-muted">Son 7 gün içinde alarm bulunamadı.</div>
        )}
      </button>
    </motion.div>
  );
}

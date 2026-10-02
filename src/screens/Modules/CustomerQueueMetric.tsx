import { useEffect, useMemo, useState, type ComponentType } from "react";
import { apiGet } from "../../api";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Calendar, Clock3, Filter, List, TableProperties, X } from "lucide-react";
import { cn } from "../../utils";

export type CustomerQueueMetricType = "queue_wait_duration" | "coffee_pickup_duration" | "queue_abandonment_count";

interface CustomerQueueMetricModuleProps {
  authToken?: string;
  metricType: CustomerQueueMetricType;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  mode: "duration" | "count";
}

interface CustomerQueueMetricRow {
  id: number;
  metricType: CustomerQueueMetricType;
  hour: string;
  minSeconds: number | null;
  maxSeconds: number | null;
  avgSeconds: number | null;
  count: number | null;
}

interface CustomerQueueMetricResponse {
  metrics: CustomerQueueMetricRow[];
  summary?: {
    avgSeconds: number | null;
    minSeconds: number | null;
    maxSeconds: number | null;
    totalCount: number;
    avgCount: number | null;
    hours: number;
  };
}

type DateFilter = "Bugün" | "Dün" | "Bu Hafta" | "Bu Ay";
type ViewMode = "chart" | "table";

const availableDates: DateFilter[] = ["Bugün", "Dün", "Bu Hafta", "Bu Ay"];

function toLocalDateString(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function buildRange(filter: DateFilter) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  switch (filter) {
    case "Dün": {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    case "Bu Hafta": {
      const start = new Date(today);
      const day = start.getDay();
      start.setDate(start.getDate() - ((day + 6) % 7));
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    case "Bu Ay": {
      const start = new Date(today);
      start.setDate(1);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    default: {
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { startDate: today, endDate: end };
    }
  }
}

function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "-";
  if (seconds < 60) return `${Math.round(seconds)} sn`;
  const minutes = seconds / 60;
  return `${minutes >= 10 ? Math.round(minutes) : minutes.toFixed(1)} dk`;
}

function formatHour(value: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value.slice(11, 16);
  }
}

export default function CustomerQueueMetricModule({
  authToken,
  metricType,
  title,
  subtitle,
  icon: Icon,
  mode,
}: CustomerQueueMetricModuleProps) {
  const [metrics, setMetrics] = useState<CustomerQueueMetricRow[]>([]);
  const [summary, setSummary] = useState<CustomerQueueMetricResponse["summary"]>();
  const [dateFilter, setDateFilter] = useState<DateFilter>("Bugün");
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>("Bugün");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => buildRange(activeDateFilter), [activeDateFilter]);

  useEffect(() => {
    if (!authToken) return;

    const fetchMetrics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiGet<CustomerQueueMetricResponse>(
          `/api/customer-queue-metric/get-hourly?startDate=${toLocalDateString(startDate)}&endDate=${toLocalDateString(endDate)}&metricType=${metricType}`,
          authToken
        );
        setMetrics(response?.metrics ?? []);
        setSummary(response?.summary);
      } catch (err: any) {
        setError(err?.message || "Veriler yüklenirken hata oluştu.");
        setMetrics([]);
        setSummary(undefined);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    };

    fetchMetrics();
  }, [authToken, startDate, endDate, metricType]);

  const chartRows = useMemo(
    () =>
      metrics.map((metric) => ({
        hour: formatHour(metric.hour),
        min: metric.minSeconds ?? 0,
        avg: metric.avgSeconds ?? 0,
        max: metric.maxSeconds ?? 0,
        count: metric.count ?? 0,
      })),
    [metrics]
  );

  const highestCount = useMemo(() => Math.max(0, ...metrics.map((metric) => metric.count ?? 0)), [metrics]);

  const statCards =
    mode === "duration"
      ? [
          { label: "Ortalama", value: formatDuration(summary?.avgSeconds), accent: "text-primary" },
          { label: "Minimum", value: formatDuration(summary?.minSeconds), accent: "text-accent" },
          { label: "Maksimum", value: formatDuration(summary?.maxSeconds), accent: "text-warning" },
        ]
      : [
          { label: "Toplam", value: `${summary?.totalCount ?? 0}`, accent: "text-primary" },
          { label: "Saatlik Ort.", value: summary?.avgCount === null || summary?.avgCount === undefined ? "-" : summary.avgCount.toFixed(1), accent: "text-accent" },
          { label: "En Yoğun Saat", value: `${highestCount}`, accent: "text-warning" },
        ];

  const applyFilter = () => {
    setActiveDateFilter(dateFilter);
    setIsFilterOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-text-dark text-sm leading-tight">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 flex items-center gap-1.5 text-xs font-semibold text-text-dark"
          >
            <Calendar className="w-3.5 h-3.5" />
            {activeDateFilter}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
              <span className="text-[10px] text-gray-500 font-medium">{card.label}</span>
              <div className={cn("text-sm font-bold mt-1", card.accent)}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 bg-gray-100/50 p-1 rounded-xl border border-gray-100">
        <button
          onClick={() => setViewMode("chart")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors",
            viewMode === "chart" ? "bg-white text-primary shadow-sm border border-gray-200/50" : "text-gray-500"
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Grafik
        </button>
        <button
          onClick={() => setViewMode("table")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors",
            viewMode === "table" ? "bg-white text-primary shadow-sm border border-gray-200/50" : "text-gray-500"
          )}
        >
          <TableProperties className="w-3.5 h-3.5" /> Tablo
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">Veriler yükleniyor...</div>
      ) : hasLoaded && metrics.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">Bu aralık için veri bulunamadı.</div>
      ) : viewMode === "chart" ? (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-sm text-text-dark">Saatlik Dağılım</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 10, right: 0, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => (mode === "duration" ? formatDuration(Number(value)).replace(" ", "") : String(value))} />
                <Tooltip
                  formatter={(value: unknown, name: string) => {
                    const labelMap: Record<string, string> = { min: "Min", avg: "Ort", max: "Max", count: "Sayı" };
                    const numericValue = Number(value);
                    return [mode === "duration" ? formatDuration(numericValue) : numericValue, labelMap[name] ?? name];
                  }}
                />
                {mode === "duration" ? (
                  <>
                    <Bar dataKey="min" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avg" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="max" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <List className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-sm text-text-dark">Saatlik Liste</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Saat</th>
                  {mode === "duration" ? (
                    <>
                      <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Min</th>
                      <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Ort.</th>
                      <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Max</th>
                    </>
                  ) : (
                    <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Sayı</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.map((metric) => (
                  <tr key={metric.id}>
                    <td className="p-3 text-xs font-semibold text-text-dark">{formatHour(metric.hour)}</td>
                    {mode === "duration" ? (
                      <>
                        <td className="p-3 text-xs text-right text-accent font-semibold">{formatDuration(metric.minSeconds)}</td>
                        <td className="p-3 text-xs text-right text-primary font-semibold">{formatDuration(metric.avgSeconds)}</td>
                        <td className="p-3 text-xs text-right text-warning font-semibold">{formatDuration(metric.maxSeconds)}</td>
                      </>
                    ) : (
                      <td className="p-3 text-xs text-right text-primary font-semibold">{metric.count ?? 0}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isFilterOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex flex-col justify-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-4 pb-20 relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-text-dark">Filtrele</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Tarih</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableDates.map((dateName) => (
                    <button
                      key={dateName}
                      onClick={() => setDateFilter(dateName)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-medium border text-center transition-colors",
                        dateFilter === dateName ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200"
                      )}
                    >
                      {dateName}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={applyFilter}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filtreyi Uygula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

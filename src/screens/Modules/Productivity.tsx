import { useEffect, useMemo, useState } from "react";
import { apiPost } from "../../api";
import { ChevronDown, Calendar, Users, Filter, ChevronLeft, ChevronRight, BarChart3, List, TableProperties, X } from "lucide-react";
import { cn } from "../../utils";

interface ProductivityModuleProps {
  authToken?: string;
}

interface ZoneProductivityChartSeries {
  name: string;
  data: number[];
}

interface ZoneProductivityDetails {
  name: string;
  description: string | null;
  workHours: string;
  productiveTime: string;
  unProductiveTime: string;
  schedule: string[];
  chartData: ZoneProductivityChartSeries[];
}

interface ZoneProductivityListItem {
  id: number;
  name?: string;
  zoneName?: string;
  productiveTime: string;
  inefficientTime: string;
  productiveTimeInShift: string;
  inefficientTimeInShift: string;
  officeTime: string;
  productivePercentage: string;
  inefficientPercentage: string;
  zoneImage?: string | null;
}

const availableDates = ["Bugün", "Dün", "Bu Hafta", "Bu Ay"];

function toLocalISOString(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
}

function buildRange(filter: string) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  switch (filter) {
    case "Dün": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = new Date(yesterday);
      start.setHours(0, 0, 0, 1);
      const end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, selectedDate: yesterday };
    }
    case "Bu Hafta": {
      const start = new Date(today);
      const day = start.getDay();
      start.setDate(start.getDate() - ((day + 6) % 7));
      start.setHours(0, 0, 0, 1);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, selectedDate: today };
    }
    case "Bu Ay": {
      const start = new Date(today);
      start.setDate(1);
      start.setHours(0, 0, 0, 1);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, selectedDate: today };
    }
    default: {
      const start = new Date(today);
      start.setHours(0, 0, 0, 1);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, selectedDate: today };
    }
  }
}

export default function ProductivityModule({ authToken }: ProductivityModuleProps) {
  const [zones, setZones] = useState<ZoneProductivityListItem[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [zoneDetails, setZoneDetails] = useState<ZoneProductivityDetails | null>(null);
  const [viewMode, setViewMode] = useState<"chart" | "list" | "table">("chart");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<string>("Tümü");
  const [dateFilter, setDateFilter] = useState<string>("Bugün");
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>("Tümü");
  const [activeDateFilter, setActiveDateFilter] = useState<string>("Bugün");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate, selectedDate } = useMemo(() => buildRange(activeDateFilter), [activeDateFilter]);

  const zoneOptions = useMemo(
    () => ["Tümü", ...zones.map((zone) => zone.name ?? zone.zoneName ?? "Bölge")],
    [zones]
  );

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? zones[0] ?? null,
    [zones, selectedZoneId]
  );

  const selectedHighlight = zoneDetails
    ? {
        name: zoneDetails.name,
        description: zoneDetails.description ?? "Zone verileri",
        officeTime: parseFloat(zoneDetails.workHours),
        productiveTime: parseFloat(zoneDetails.productiveTime),
        unproductiveTime: parseFloat(zoneDetails.unProductiveTime),
        productivePercentage:
          zoneDetails.workHours && parseFloat(zoneDetails.workHours) > 0
            ? Math.round((parseFloat(zoneDetails.productiveTime) / parseFloat(zoneDetails.workHours)) * 100)
            : 0,
      }
    : {
        name: selectedZone?.name ?? selectedZone?.zoneName ?? "Yükleniyor...",
        description: selectedZone?.name || selectedZone?.zoneName ? "Zone verileri" : "Henüz seçilmedi",
        officeTime: selectedZone ? parseFloat(selectedZone.officeTime) : 0,
        productiveTime: selectedZone ? parseFloat(selectedZone.productiveTime) : 0,
        unproductiveTime: selectedZone ? parseFloat(selectedZone.inefficientTime) : 0,
        productivePercentage: selectedZone ? Math.round(parseFloat(selectedZone.productivePercentage)) : 0,
      };

  const hasChartData = zoneDetails?.schedule?.length && zoneDetails.chartData.length > 0;

  const handleLoadZones = async () => {
    if (!authToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiPost<any[]>(
        `/api/zone/get-zones-productivity-list?limit=20&offset=0`,
        {
          startDate: toLocalISOString(startDate),
          endDate: toLocalISOString(endDate),
          orderBy: [{ attribute: "productiveTime", orderBy: "DESC" }]
        },
        authToken
      );

      const mappedZones = (response || []).map((zone) => ({
        ...zone,
        id: zone.id ?? zone.zoneId,
      })) as ZoneProductivityListItem[];

      setZones(mappedZones);
      const firstZone = mappedZones[0];
      setSelectedZoneId(firstZone?.id ?? null);
      if (firstZone) {
        await handleLoadZoneDetails(firstZone.id, selectedDate);
      } else {
        setZoneDetails(null);
      }
    } catch (err: any) {
      setError(err?.message || "Veriler yüklenirken hata oluştu.");
      setZones([]);
      setZoneDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadZoneDetails = async (zoneId: number, date: Date) => {
    if (!authToken) return;
    setError(null);

    try {
      const response = await apiPost<ZoneProductivityDetails>(
        "/api/zone/get-zone-productivity",
        {
          zoneId,
          selectedDate: toLocalISOString(date),
        },
        authToken
      );
      setZoneDetails(response);
    } catch (err: any) {
      setError(err?.message || "Detay yüklenirken hata oluştu.");
      setZoneDetails(null);
    }
  };

  useEffect(() => {
    handleLoadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, activeDateFilter]);

  useEffect(() => {
    if (!selectedZoneId || !selectedDate) return;
    handleLoadZoneDetails(selectedZoneId, selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId, selectedDate, authToken]);

  const handleApplyFilter = () => {
    setActiveZoneFilter(zoneFilter);
    setActiveDateFilter(dateFilter);
    setIsFilterOpen(false);
    if (zoneFilter !== "Tümü") {
      const found = zones.find((zone) => zone.name === zoneFilter || zone.zoneName === zoneFilter);
      if (found) setSelectedZoneId(found.id);
    }
  };

  const chartSeries = useMemo(() => {
    if (!zoneDetails) return { productive: [], rest: [], schedule: [] };
    const productive =
      zoneDetails.chartData.find((series) => /product|üretken/i.test(series.name))?.data ?? zoneDetails.chartData[0]?.data ?? [];
    const rest =
      zoneDetails.chartData.find((series) => /rest|isti̇rahət|dinlen/i.test(series.name))?.data ?? zoneDetails.chartData[1]?.data ?? [];
    return { productive, rest, schedule: zoneDetails.schedule };
  }, [zoneDetails]);

  const chartRows = useMemo(() => {
    return chartSeries.schedule.map((time, index) => {
      const productive = chartSeries.productive[index] ?? 0;
      const rest = chartSeries.rest[index] ?? 0;
      const total = productive + rest;
      return {
        time,
        productive,
        rest,
        productivePercent: total === 0 ? 0 : Math.round((productive / total) * 100),
      };
    });
  }, [chartSeries]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 flex justify-between items-center text-xs"
          >
            <div className="flex items-center gap-1.5 text-text-dark">
              <Users className="w-3.5 h-3.5" />
              <span className="truncate max-w-[80px]">{activeZoneFilter}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 flex justify-between items-center text-xs"
          >
            <div className="flex items-center gap-1.5 text-text-dark">
              <Calendar className="w-3.5 h-3.5" />
              <span>{activeDateFilter}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className={cn(
            "w-full text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors",
            activeZoneFilter !== "Tümü" || activeDateFilter !== "Bugün"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-primary text-white border border-transparent"
          )}
        >
          <Filter className="w-3 h-3" />
          {activeZoneFilter !== "Tümü" || activeDateFilter !== "Bugün" ? "Filtreleri Değiştir" : "Filtrele"}
        </button>
      </div>

      <div className="flex gap-2 pb-1 bg-gray-100/50 p-1 rounded-xl border border-gray-100">
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
          onClick={() => setViewMode("list")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors",
            viewMode === "list" ? "bg-white text-primary shadow-sm border border-gray-200/50" : "text-gray-500"
          )}
        >
          <List className="w-3.5 h-3.5" /> Liste
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

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm relative">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-primary/10 flex items-center justify-center overflow-hidden">
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h4 className="font-bold text-text-dark leading-tight">{selectedHighlight.name}</h4>
              <span className="text-xs text-gray-500">{selectedHighlight.description}</span>
            </div>
          </div>
          <div className="bg-gray-50 px-2 py-1 rounded border border-gray-100 flex flex-col items-end">
            <span className="text-[10px] text-gray-500 font-medium">Verimlilik</span>
            <span className={cn("text-lg font-bold", selectedHighlight.productivePercentage >= 75 ? "text-accent" : "text-warning")}>
              %{selectedHighlight.productivePercentage}
            </span>
          </div>
        </div>

        <div className="h-4 w-full bg-warning rounded-full overflow-hidden flex mb-4 border border-gray-100/50">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${selectedHighlight.productivePercentage}%` }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 mb-0.5 font-medium">Çalışma Saatleri</span>
            <span className="text-sm font-bold text-text-dark">{selectedHighlight.officeTime} dk</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 mb-0.5 font-medium">Detay</span>
            <span className="text-sm font-bold text-text-dark">{activeDateFilter}</span>
          </div>
          <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-lg border border-gray-100">
            <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-sm" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-medium">Üretken</span>
              <span className="text-xs font-bold text-text-dark">{selectedHighlight.productiveTime} dk</span>
            </div>
          </div>
          <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-lg border border-gray-100">
            <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-sm" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-medium">Üretken Olmayan</span>
              <span className="text-xs font-bold text-text-dark">{selectedHighlight.unproductiveTime} dk</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (!zones.length) return;
            const currentIndex = zones.findIndex((zone) => zone.id === selectedZoneId);
            const nextIndex = currentIndex < 0 || currentIndex === zones.length - 1 ? 0 : currentIndex + 1;
            setSelectedZoneId(zones[nextIndex].id);
          }}
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          <ChevronRight className="w-4 h-4 text-gray-600 -mr-0.5" />
        </button>
        <button
          onClick={() => {
            if (!zones.length) return;
            const currentIndex = zones.findIndex((zone) => zone.id === selectedZoneId);
            const previousIndex = currentIndex <= 0 ? zones.length - 1 : currentIndex - 1;
            setSelectedZoneId(zones[previousIndex].id);
          }}
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600 -ml-0.5" />
        </button>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {isLoading ? (
        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">Veriler yükleniyor...</div>
      ) : (
        <>
          {viewMode === "list" && (
            <>
              <h3 className="font-semibold text-text-dark text-sm mt-4 mb-2 px-1">Tüm Bölge Verimleri</h3>
              <div className="space-y-3">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={cn(
                      "bg-white p-3 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition-colors",
                      selectedZoneId === zone.id ? "border-primary/50 bg-primary/5" : "border-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 border border-gray-200 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-400">{(zone.name ?? zone.zoneName ?? "B").charAt(0)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-text-dark">{zone.name ?? zone.zoneName}</span>
                        <span className="text-[10px] text-text-muted">Üretkenlik: %{zone.productivePercentage}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-accent font-bold text-xs">{zone.productiveTime} dk</span>
                      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${zone.productivePercentage}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                {zones.length === 0 && (
                  <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">Bölge verisi bulunamadı.</div>
                )}
              </div>
            </>
          )}

          {viewMode === "chart" && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mt-4">
              <h3 className="font-bold text-sm text-text-dark mb-4">Zaman Bazlı Üretkenlik</h3>
              {hasChartData ? (
                <div className="space-y-4">
                  {chartRows.map((row) => (
                    <div key={row.time} className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{row.time}</span>
                        <span>{row.productivePercent}% Üretken</span>
                      </div>
                      <div className="h-6 rounded-full bg-gray-100 overflow-hidden flex">
                        <div className="h-full bg-accent" style={{ width: `${row.productivePercent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">Grafik için yeterli veri yok.</div>
              )}
            </div>
          )}

          {viewMode === "table" && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bölge</th>
                      <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Üretken</th>
                      <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {zones.map((zone) => (
                      <tr key={zone.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedZoneId(zone.id)}>
                        <td className="p-3">
                          <div className="text-xs font-bold text-text-dark">{zone.name ?? zone.zoneName}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">%{zone.productivePercentage} üretken</div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="text-xs font-bold text-accent">{zone.productiveTime} dk</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">Shift içi: {zone.productiveTimeInShift} dk</div>
                        </td>
                        <td className="p-3 text-right text-xs font-semibold text-text-dark">{zone.officeTime} dk</td>
                      </tr>
                    ))}
                    {zones.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-sm text-gray-500">
                          Veri bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {isFilterOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex flex-col justify-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-4 pb-20 relative h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-lg text-text-dark">Filtrele</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6 mb-2 flex-1 overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Bölge</label>
                <div className="flex flex-wrap gap-2">
                  {zoneOptions.map((zoneName) => (
                    <button
                      key={zoneName}
                      onClick={() => setZoneFilter(zoneName)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border",
                        zoneFilter === zoneName ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200"
                      )}
                    >
                      {zoneName}
                    </button>
                  ))}
                </div>
              </div>

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
    </div>
  );
}

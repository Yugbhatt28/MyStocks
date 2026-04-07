import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./Header";
import { Sidebar, type ViewType } from "./Sidebar";
import { DashboardView } from "./DashboardView";
import { MarketOverview } from "./MarketOverview";
import { CompareStocks } from "./CompareStocks";
import { Watchlist } from "./Watchlist";
import { AlertToast, type StockAlert } from "./AlertToast";
import { type StockData, type CustomAlert } from "@/lib/stockData";
import { fetchRealStockData, fetchLiveUpdate, getVolatility } from "@/lib/stockApi";
import { toast } from "sonner";

export function StockApp() {
  const [view, setView] = useState<ViewType>("dashboard");
  const [liveMode, setLiveMode] = useState(false);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [customAlerts, setCustomAlerts] = useState<CustomAlert[]>([]);
  const [volatility, setVolatility] = useState(0);
  const prevDataRef = useRef<StockData | null>(null);

  const handleSearch = useCallback(async (symbol: string) => {
    setLoading(true);
    try {
      const { data, error } = await fetchRealStockData(symbol);
      if (error || !data) {
        toast.error(error || `Data not available for ${symbol}`);
        return;
      }
      setStockData(data);
      prevDataRef.current = data;
      setView("dashboard");
      setLiveMode(true);
    } catch {
      toast.error(`Failed to fetch data for ${symbol}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addCustomAlert = useCallback((alert: CustomAlert) => {
    setCustomAlerts((prev) => [...prev, alert]);
  }, []);

  const removeCustomAlert = useCallback((id: string) => {
    setCustomAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Compute volatility when data changes
  useEffect(() => {
    if (stockData && stockData.prices.length >= 2) {
      getVolatility(stockData.prices).then(setVolatility);
    } else {
      setVolatility(0);
    }
  }, [stockData?.prices]);

  // Check custom alerts
  useEffect(() => {
    if (!stockData) return;

    const newAlerts: StockAlert[] = [];
    for (const ca of customAlerts) {
      if (!ca.active || ca.symbol !== stockData.symbol) continue;

      if (ca.type === "price_above" && stockData.currentPrice > ca.threshold) {
        newAlerts.push({
          id: crypto.randomUUID(),
          type: "surge",
          message: `${stockData.symbol} crossed above $${ca.threshold.toFixed(2)}!`,
          timestamp: Date.now(),
        });
      } else if (ca.type === "price_below" && stockData.currentPrice < ca.threshold) {
        newAlerts.push({
          id: crypto.randomUUID(),
          type: "drop",
          message: `${stockData.symbol} dropped below $${ca.threshold.toFixed(2)}!`,
          timestamp: Date.now(),
        });
      } else if (ca.type === "volatility_spike" && volatility > ca.threshold) {
        newAlerts.push({
          id: crypto.randomUUID(),
          type: "surge",
          message: `${stockData.symbol} volatility spike: $${volatility.toFixed(2)}`,
          timestamp: Date.now(),
        });
      }
    }

    if (newAlerts.length > 0) {
      setAlerts((a) => [...a, ...newAlerts].slice(-5));
    }
  }, [stockData?.currentPrice, volatility]);

  // Live polling — only when liveMode is ON
  useEffect(() => {
    if (!liveMode || !stockData) return;

    const interval = setInterval(async () => {
      const oldData = prevDataRef.current;
      try {
        const updated = await fetchLiveUpdate(stockData);
        setStockData(updated);

        const newAlerts: StockAlert[] = [];
        if (oldData) {
          const pctChange = ((updated.currentPrice - oldData.currentPrice) / oldData.currentPrice) * 100;
          if (pctChange > 3) {
            newAlerts.push({ id: crypto.randomUUID(), type: "surge", message: `${updated.symbol} surged ${pctChange.toFixed(1)}%!`, timestamp: Date.now() });
          } else if (pctChange < -3) {
            newAlerts.push({ id: crypto.randomUUID(), type: "drop", message: `${updated.symbol} dropped ${Math.abs(pctChange).toFixed(1)}%!`, timestamp: Date.now() });
          }
        }

        if (newAlerts.length > 0) {
          setAlerts((a) => [...a, ...newAlerts].slice(-5));
        }

        prevDataRef.current = updated;
      } catch (err) {
        console.warn("Live update failed:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [liveMode, stockData?.symbol]);

  const viewContent = () => {
    switch (view) {
      case "dashboard":
        return (
          <DashboardView
            data={stockData}
            loading={loading}
            liveMode={liveMode}
            previousData={prevDataRef.current}
            volatility={volatility}
            customAlerts={customAlerts}
            onAddAlert={addCustomAlert}
            onRemoveAlert={removeCustomAlert}
          />
        );
      case "market": return <MarketOverview onSelectStock={handleSearch} />;
      case "compare": return <CompareStocks />;
      case "watchlist": return <Watchlist onSelectStock={handleSearch} />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header onSearch={handleSearch} liveMode={liveMode} onToggleLive={() => setLiveMode(!liveMode)} />
      <div className="flex flex-1">
        <Sidebar activeView={view} onViewChange={setView} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {viewContent()}
        </main>
      </div>

      <nav className="flex border-t border-border bg-card md:hidden">
        {(["dashboard", "market", "compare", "watchlist"] as ViewType[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              view === v ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {v === "dashboard" ? "Dashboard" : v === "market" ? "Market" : v === "compare" ? "Compare" : "Watchlist"}
          </button>
        ))}
      </nav>

      <AlertToast alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}

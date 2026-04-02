import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./Header";
import { Sidebar, type ViewType } from "./Sidebar";
import { DashboardView } from "./DashboardView";
import { MarketOverview } from "./MarketOverview";
import { CompareStocks } from "./CompareStocks";
import { Watchlist } from "./Watchlist";
import { AlertToast, type StockAlert } from "./AlertToast";
import { generateStockData, addNewPrice, type StockData } from "@/lib/stockData";

export function StockApp() {
  const [view, setView] = useState<ViewType>("dashboard");
  const [liveMode, setLiveMode] = useState(false);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const prevDataRef = useRef<StockData | null>(null);

  const handleSearch = useCallback((symbol: string) => {
    const data = generateStockData(symbol);
    setStockData(data);
    prevDataRef.current = data;
    setView("dashboard");
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Live mode: append new data
  useEffect(() => {
    if (!liveMode || !stockData) return;

    const interval = setInterval(() => {
      setStockData((prev) => {
        if (!prev) return prev;
        const updated = addNewPrice(prev);
        const oldData = prevDataRef.current;

        // Check alerts
        const newAlerts: StockAlert[] = [];
        if (oldData) {
          const pctChange = ((updated.currentPrice - oldData.currentPrice) / oldData.currentPrice) * 100;
          if (pctChange > 3) {
            newAlerts.push({ id: crypto.randomUUID(), type: "surge", message: `${updated.symbol} surged ${pctChange.toFixed(1)}%!`, timestamp: Date.now() });
          } else if (pctChange < -3) {
            newAlerts.push({ id: crypto.randomUUID(), type: "drop", message: `${updated.symbol} dropped ${Math.abs(pctChange).toFixed(1)}%!`, timestamp: Date.now() });
          }
          if (updated.currentPrice > oldData.dsaAnalytics.maxPrice) {
            newAlerts.push({ id: crypto.randomUUID(), type: "new_max", message: `New high for ${updated.symbol}: $${updated.currentPrice.toFixed(2)}`, timestamp: Date.now() });
          }
          if (updated.currentPrice < oldData.dsaAnalytics.minPrice) {
            newAlerts.push({ id: crypto.randomUUID(), type: "new_min", message: `New low for ${updated.symbol}: $${updated.currentPrice.toFixed(2)}`, timestamp: Date.now() });
          }
        }

        if (newAlerts.length > 0) {
          setAlerts((a) => [...a, ...newAlerts].slice(-5));
        }

        prevDataRef.current = updated;
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [liveMode, stockData?.symbol]);

  // Mobile bottom nav
  const viewContent = () => {
    switch (view) {
      case "dashboard": return <DashboardView data={stockData} />;
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

      {/* Mobile bottom nav */}
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

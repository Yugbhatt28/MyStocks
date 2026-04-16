import { Save, Upload, Download, Trash2, FileJson, FileSpreadsheet, HardDrive } from "lucide-react";
import { useState, useEffect } from "react";
import type { StockData } from "@/lib/stockData";
import {
  saveToLocalStorage,
  loadAllFromLocalStorage,
  deleteFromLocalStorage,
  downloadAsJSON,
  downloadAsCSV,
  uploadJSONFile,
} from "@/lib/fileIO";
import { toast } from "sonner";

interface FileIOPanelProps {
  data: StockData | null;
  onLoadData: (data: StockData) => void;
}

export function FileIOPanel({ data, onLoadData }: FileIOPanelProps) {
  const [savedStocks, setSavedStocks] = useState<StockData[]>([]);

  useEffect(() => {
    setSavedStocks(loadAllFromLocalStorage());
  }, []);

  const handleSave = () => {
    if (!data) { toast.error("No data to save"); return; }
    try {
      saveToLocalStorage(data);
      setSavedStocks(loadAllFromLocalStorage());
      toast.success(`Saved ${data.symbol} data (${data.prices.length} points)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleLoad = (stock: StockData) => {
    onLoadData(stock);
    toast.success(`Loaded ${stock.symbol} — ${stock.prices.length} data points`);
  };

  const handleDelete = (symbol: string) => {
    deleteFromLocalStorage(symbol);
    setSavedStocks(loadAllFromLocalStorage());
    toast.success(`Deleted ${symbol} from storage`);
  };

  const handleDownloadJSON = () => {
    if (!data) { toast.error("No data to download"); return; }
    downloadAsJSON(data);
    toast.success(`Downloading ${data.symbol} as JSON`);
  };

  const handleDownloadCSV = () => {
    if (!data) { toast.error("No data to download"); return; }
    downloadAsCSV(data);
    toast.success(`Downloading ${data.symbol} as CSV`);
  };

  const handleUpload = async () => {
    try {
      const loaded = await uploadJSONFile();
      onLoadData(loaded);
      toast.success(`Loaded ${loaded.symbol} from file — ${loaded.prices.length} data points`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load file");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          File I/O — Save & Load Data
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Persist stock data to localStorage or export as JSON/CSV files
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={handleSave}
          disabled={!data}
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-left hover:bg-surface-hover transition-colors disabled:opacity-40"
        >
          <Save className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Save to Storage</p>
            <p className="text-[10px] text-muted-foreground">localStorage persistence</p>
          </div>
        </button>

        <button
          onClick={handleUpload}
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-left hover:bg-surface-hover transition-colors"
        >
          <Upload className="h-5 w-5 text-chart-2" />
          <div>
            <p className="text-sm font-semibold text-foreground">Upload JSON</p>
            <p className="text-[10px] text-muted-foreground">Load from .json file</p>
          </div>
        </button>

        <button
          onClick={handleDownloadJSON}
          disabled={!data}
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-left hover:bg-surface-hover transition-colors disabled:opacity-40"
        >
          <FileJson className="h-5 w-5 text-chart-4" />
          <div>
            <p className="text-sm font-semibold text-foreground">Export JSON</p>
            <p className="text-[10px] text-muted-foreground">Download as .json</p>
          </div>
        </button>

        <button
          onClick={handleDownloadCSV}
          disabled={!data}
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-left hover:bg-surface-hover transition-colors disabled:opacity-40"
        >
          <FileSpreadsheet className="h-5 w-5 text-chart-5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Export CSV</p>
            <p className="text-[10px] text-muted-foreground">Download as .csv</p>
          </div>
        </button>
      </div>

      {/* Current Data Info */}
      {data && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Current Data
          </h3>
          <div className="grid gap-2 sm:grid-cols-4 text-sm">
            <div><span className="text-muted-foreground">Symbol: </span><span className="font-bold text-foreground">{data.symbol}</span></div>
            <div><span className="text-muted-foreground">Points: </span><span className="font-bold text-foreground">{data.prices.length}</span></div>
            <div><span className="text-muted-foreground">Price: </span><span className="font-bold text-foreground">${data.currentPrice.toFixed(2)}</span></div>
            <div><span className="text-muted-foreground">Updated: </span><span className="font-bold text-foreground">{data.lastUpdated}</span></div>
          </div>
        </div>
      )}

      {/* Saved Data */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Saved Stocks ({savedStocks.length})
          </h3>
        </div>
        {savedStocks.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No saved data yet. Save a stock to see it here.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {savedStocks.map((stock) => (
              <div key={stock.symbol} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold text-foreground text-sm">{stock.symbol} — {stock.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stock.prices.length} data points · Last: ${stock.currentPrice.toFixed(2)} · {stock.lastUpdated}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoad(stock)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Download className="inline h-3 w-3 mr-1" />
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(stock.symbol)}
                    className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="inline h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

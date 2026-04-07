import { useState } from "react";
import { Bell, Plus, X, Check } from "lucide-react";
import type { CustomAlert } from "@/lib/stockData";

interface AdvancedAlertsProps {
  symbol: string;
  currentPrice: number;
  volatility: number;
  alerts: CustomAlert[];
  onAddAlert: (alert: CustomAlert) => void;
  onRemoveAlert: (id: string) => void;
}

export function AdvancedAlerts({
  symbol,
  currentPrice,
  volatility,
  alerts,
  onAddAlert,
  onRemoveAlert,
}: AdvancedAlertsProps) {
  const [showForm, setShowForm] = useState(false);
  const [alertType, setAlertType] = useState<CustomAlert["type"]>("price_above");
  const [threshold, setThreshold] = useState(currentPrice);

  const handleAdd = () => {
    onAddAlert({
      id: crypto.randomUUID(),
      symbol,
      type: alertType,
      threshold,
      active: true,
    });
    setShowForm(false);
  };

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Custom Alerts</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md bg-primary/20 px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/30"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-md border border-border bg-surface p-3 space-y-2">
          <div className="flex gap-2">
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as CustomAlert["type"])}
              className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground"
            >
              <option value="price_above">Price Above</option>
              <option value="price_below">Price Below</option>
              <option value="volatility_spike">Volatility Spike</option>
              <option value="trend_reversal">Trend Reversal</option>
            </select>
            {(alertType === "price_above" || alertType === "price_below") && (
              <input
                type="number"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground"
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={handleAdd} className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Save</button>
          </div>
        </div>
      )}

      {symbolAlerts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 text-center">No custom alerts set</p>
      ) : (
        <div className="space-y-1.5">
          {symbolAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between rounded-md border border-border/50 bg-surface px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${alert.active ? "bg-profit" : "bg-muted-foreground"}`} />
                <span className="text-foreground">
                  {alert.type === "price_above" && `Price > $${alert.threshold.toFixed(2)}`}
                  {alert.type === "price_below" && `Price < $${alert.threshold.toFixed(2)}`}
                  {alert.type === "volatility_spike" && `Volatility spike`}
                  {alert.type === "trend_reversal" && `Trend reversal`}
                </span>
              </div>
              <button onClick={() => onRemoveAlert(alert.id)} className="text-muted-foreground hover:text-loss">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

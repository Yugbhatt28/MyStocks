import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, X } from "lucide-react";

export interface StockAlert {
  id: string;
  type: "surge" | "drop" | "new_max" | "new_min";
  message: string;
  timestamp: number;
}

interface AlertToastProps {
  alerts: StockAlert[];
  onDismiss: (id: string) => void;
}

const ICON_MAP = {
  surge: <TrendingUp className="h-4 w-4 text-profit" />,
  drop: <TrendingDown className="h-4 w-4 text-loss" />,
  new_max: <ArrowUp className="h-4 w-4 text-profit" />,
  new_min: <ArrowDown className="h-4 w-4 text-loss" />,
};

const BG_MAP = {
  surge: "border-profit/30 bg-profit/10",
  drop: "border-loss/30 bg-loss/10",
  new_max: "border-profit/30 bg-profit/10",
  new_min: "border-loss/30 bg-loss/10",
};

export function AlertToast({ alerts, onDismiss }: AlertToastProps) {
  return (
    <div className="fixed right-4 top-16 z-50 flex flex-col gap-2" style={{ maxWidth: 320 }}>
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function AlertItem({ alert, onDismiss }: { alert: StockAlert; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => onDismiss(alert.id), 3000);
    return () => clearTimeout(timer);
  }, [alert.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur-sm transition-all duration-300 ${BG_MAP[alert.type]} ${
        visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
      }`}
    >
      {ICON_MAP[alert.type]}
      <span className="flex-1 text-foreground">{alert.message}</span>
      <button onClick={() => onDismiss(alert.id)} className="text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

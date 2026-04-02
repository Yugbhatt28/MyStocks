import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { StockData } from "@/lib/stockData";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, Legend);

const COLORS = [
  "oklch(0.65 0.18 250)",
  "oklch(0.72 0.20 155)",
  "oklch(0.65 0.22 25)",
  "oklch(0.75 0.15 80)",
  "oklch(0.60 0.20 300)",
];

interface MultiChartProps {
  stocks: StockData[];
}

export function MultiChart({ stocks }: MultiChartProps) {
  const maxLen = Math.max(...stocks.map((s) => s.timestamps.length));
  const labels = stocks.find((s) => s.timestamps.length === maxLen)?.timestamps || [];

  const data = {
    labels,
    datasets: stocks.map((s, i) => ({
      label: s.symbol,
      data: s.prices,
      borderColor: COLORS[i % COLORS.length],
      borderWidth: 2,
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 } as const,
    interaction: { intersect: false, mode: "index" as const },
    plugins: {
      legend: {
        labels: { color: "oklch(0.70 0.01 260)", usePointStyle: true, pointStyle: "circle" },
      },
      tooltip: {
        backgroundColor: "oklch(0.17 0.008 260)",
        titleColor: "oklch(0.93 0.005 260)",
        bodyColor: "oklch(0.70 0.01 260)",
        borderColor: "oklch(0.25 0.01 260)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: "oklch(0.25 0.01 260 / 0.3)" },
        ticks: { color: "oklch(0.50 0.01 260)", maxTicksLimit: 8, font: { size: 10 } },
      },
      y: {
        grid: { color: "oklch(0.25 0.01 260 / 0.3)" },
        ticks: { color: "oklch(0.50 0.01 260)", font: { size: 10 } },
      },
    },
  };

  return (
    <div style={{ height: 400 }}>
      <Line data={data} options={options} />
    </div>
  );
}

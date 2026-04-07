import { useRef, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ChartTooltip);

interface StockChartProps {
  prices: number[];
  timestamps: string[];
  label?: string;
  color?: string;
  height?: number;
  showArea?: boolean;
  mini?: boolean;
  buyIndex?: number;
  sellIndex?: number;
}

export function StockChart({
  prices,
  timestamps,
  label = "Price",
  color = "oklch(0.65 0.18 250)",
  height = 320,
  showArea = true,
  mini = false,
  buyIndex,
  sellIndex,
}: StockChartProps) {
  const chartRef = useRef<ChartJS<"line"> | null>(null);

  const maxIdx = prices.indexOf(Math.max(...prices));
  const minIdx = prices.indexOf(Math.min(...prices));

  const pointBg = prices.map((_, i) => {
    if (buyIndex !== undefined && i === buyIndex) return "#22c55e";
    if (sellIndex !== undefined && i === sellIndex) return "#ef4444";
    if (i === maxIdx) return "#22c55e";
    if (i === minIdx) return "#ef4444";
    return "transparent";
  });
  const pointRadius = prices.map((_, i) => {
    if ((buyIndex !== undefined && i === buyIndex) || (sellIndex !== undefined && i === sellIndex)) return mini ? 4 : 6;
    if (i === maxIdx || i === minIdx) return mini ? 3 : 5;
    return 0;
  });

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.labels = timestamps;
    chart.data.datasets[0].data = prices;
    chart.data.datasets[0].pointBackgroundColor = pointBg;
    chart.data.datasets[0].pointRadius = pointRadius;
    chart.update("none");
  }, [prices, timestamps]);

  const data = {
    labels: timestamps,
    datasets: [
      {
        label,
        data: prices,
        borderColor: color,
        backgroundColor: showArea ? color.replace(")", " / 0.1)").replace("oklch", "oklch") : "transparent",
        borderWidth: mini ? 1.5 : 2,
        fill: showArea,
        tension: 0.3,
        pointBackgroundColor: pointBg,
        pointRadius,
        pointHoverRadius: mini ? 3 : 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 } as const,
    interaction: { intersect: false, mode: "index" as const },
    plugins: {
      tooltip: {
        backgroundColor: "oklch(0.17 0.008 260)",
        titleColor: "oklch(0.93 0.005 260)",
        bodyColor: "oklch(0.70 0.01 260)",
        borderColor: "oklch(0.25 0.01 260)",
        borderWidth: 1,
        enabled: !mini,
      },
    },
    scales: {
      x: {
        display: !mini,
        grid: { color: "oklch(0.25 0.01 260 / 0.3)" },
        ticks: { color: "oklch(0.50 0.01 260)", maxTicksLimit: 8, font: { size: 10 } },
      },
      y: {
        display: !mini,
        grid: { color: "oklch(0.25 0.01 260 / 0.3)" },
        ticks: { color: "oklch(0.50 0.01 260)", font: { size: 10 } },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
}

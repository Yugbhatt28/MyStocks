import { createFileRoute } from "@tanstack/react-router";
import { StockApp } from "@/components/stock/StockApp";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Stock Intelligence Dashboard" },
      { name: "description", content: "Real-time stock analytics with DSA-powered insights, live charts, and market overview." },
    ],
  }),
});

function Index() {
  return <StockApp />;
}

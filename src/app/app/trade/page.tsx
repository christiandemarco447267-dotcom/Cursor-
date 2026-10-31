import type { Metadata } from "next";
import { Suspense } from "react";
import { TradeView } from "@/components/trade-view";
import { Loading } from "@/components/ui";

export const metadata: Metadata = { title: "Trade" };

export default function TradePage() {
  return (
    <Suspense fallback={<Loading />}>
      <TradeView />
    </Suspense>
  );
}

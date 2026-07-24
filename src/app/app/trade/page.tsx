import { Suspense } from "react";
import { TradeView } from "@/components/trade-view";
import { Loading } from "@/components/ui";

export default function TradePage() {
  return (
    <Suspense fallback={<Loading />}>
      <TradeView />
    </Suspense>
  );
}

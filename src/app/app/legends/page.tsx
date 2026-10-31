import type { Metadata } from "next";
import { LegendsView } from "@/components/legends-view";

export const metadata: Metadata = { title: "Legend portfolios" };

export default function Page() {
  return <LegendsView />;
}

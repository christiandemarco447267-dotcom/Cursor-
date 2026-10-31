import type { Metadata } from "next";
import { LeaguesView } from "@/components/leagues-view";

export const metadata: Metadata = { title: "Friend leagues" };

export default function Page() {
  return <LeaguesView />;
}

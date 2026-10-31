import type { Metadata } from "next";
import { CoachView } from "@/components/coach-view";

export const metadata: Metadata = { title: "Ask Sentia" };

export default function Page() {
  return <CoachView />;
}

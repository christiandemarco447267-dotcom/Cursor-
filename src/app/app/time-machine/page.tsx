import type { Metadata } from "next";
import { TimeMachineView } from "@/components/time-machine-view";

export const metadata: Metadata = { title: "Time Machine" };

export default function Page() {
  return <TimeMachineView />;
}

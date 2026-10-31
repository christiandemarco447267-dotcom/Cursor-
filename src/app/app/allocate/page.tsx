import type { Metadata } from "next";
import { AllocateView } from "@/components/allocate-view";

export const metadata: Metadata = { title: "Allocation" };

export default function AllocatePage() {
  return <AllocateView />;
}

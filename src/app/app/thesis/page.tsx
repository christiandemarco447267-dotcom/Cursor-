import type { Metadata } from "next";
import { ThesisView } from "@/components/thesis-view";

export const metadata: Metadata = { title: "Investment theses" };

export default function ThesisPage() {
  return <ThesisView />;
}

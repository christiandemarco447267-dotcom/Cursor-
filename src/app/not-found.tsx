import type { Metadata } from "next";
import { StatusScreen } from "@/components/status-screen";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="This page wandered off"
      body="The page you’re looking for doesn’t exist or has moved. Your portfolio is safe — it lives in your browser."
    />
  );
}

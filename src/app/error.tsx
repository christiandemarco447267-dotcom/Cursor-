"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="Error"
      title="Something went wrong"
      body="An unexpected error interrupted this page. Your saved data is stored in your browser and hasn’t been changed."
      actions={
        <button type="button" className="btn" onClick={() => retry()}>
          <RotateCcw size={16} aria-hidden="true" /> Try again
        </button>
      }
    />
  );
}

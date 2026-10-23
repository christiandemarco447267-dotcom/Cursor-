"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { assetPath } from "@/lib/asset";
import "./globals.css";

// Replaces the root layout when it fails, so it renders its own <html>/<body>
// and imports the global styles itself.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang="en"
      style={
        {
          "--app-bg": `url("${assetPath("/sentia-bg.webp")}")`,
          "--app-bg-jpg": `url("${assetPath("/sentia-bg.jpg")}")`,
        } as React.CSSProperties
      }
    >
      <body className="antialiased">
        <title>Something went wrong · Sentia</title>
        <StatusScreen
          code="Error"
          title="Sentia hit a snag"
          body="The app couldn’t load. Your saved data is stored in your browser and hasn’t been changed. Try again, or head back home."
          actions={
            <button type="button" className="btn" onClick={() => retry()}>
              <RotateCcw size={16} aria-hidden="true" /> Try again
            </button>
          }
        />
      </body>
    </html>
  );
}

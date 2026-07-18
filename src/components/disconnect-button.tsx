"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DisconnectButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function disconnect() {
    setLoading(true);
    await fetch("/api/banking/disconnect", { method: "POST" });
    router.push("/connect");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={disconnect}
      disabled={loading}
      className="text-sm font-medium text-ink-soft transition hover:text-ink disabled:opacity-60"
    >
      {loading ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}

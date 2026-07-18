import { cookies } from "next/headers";

export const HARBOR_SESSION_COOKIE = "harbor_session";

export interface HarborSession {
  userId: string;
  itemId: string;
  institutionName: string;
  connectedAt: string;
}

export async function getSession(): Promise<HarborSession | null> {
  const jar = await cookies();
  const raw = jar.get(HARBOR_SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as HarborSession;
    if (!parsed.itemId || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function encodeSession(session: HarborSession): string {
  return encodeURIComponent(JSON.stringify(session));
}

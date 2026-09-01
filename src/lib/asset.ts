// On static hosting (GitHub Pages) the app is served under a repo sub-path, so
// absolute asset URLs must include the base path. Next.js does NOT auto-prefix
// plain <img> tags or metadata icons, so we do it explicitly.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function assetPath(path: string): string {
  return `${BASE_PATH}${path}`;
}

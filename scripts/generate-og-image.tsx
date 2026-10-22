/**
 * Regenerates public/og-image.png (1200x630) from public/icon.png + the tagline.
 *
 *   npm run og:image
 *
 * The image is committed as a static file rather than an `opengraph-image`
 * route: under `output: export` that route is emitted without a file extension,
 * which GitHub Pages serves as application/octet-stream (social crawlers then
 * ignore it). A real .png in public/ is served as image/png everywhere.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "../src/lib/site";

const size = { width: 1200, height: 630 };

async function main() {
  const root = process.cwd();
  const icon = await readFile(join(root, "public/icon.png"), "base64");
  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 96px",
          gap: 64,
          background:
            "radial-gradient(900px 520px at 85% 0%, rgba(124,58,237,0.22), transparent 70%), radial-gradient(700px 420px at 0% 100%, rgba(13,148,136,0.18), transparent 70%), #f4f2fb",
          color: "#241633",
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${icon}`}
          width={300}
          height={300}
          style={{ borderRadius: 64, boxShadow: "0 30px 60px -20px rgba(124,58,237,0.55)" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>{SITE_NAME}</div>
          <div style={{ display: "flex", fontSize: 54, color: "#6d28d9", lineHeight: 1.1 }}>{SITE_TAGLINE}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#59506d", marginTop: 12, maxWidth: 620 }}>
            Paper-trading coach · local-first · educational
          </div>
        </div>
      </div>
    ),
    size,
  );
  const buffer = Buffer.from(await image.arrayBuffer());
  await writeFile(join(root, "public/og-image.png"), buffer);
  console.log(`Wrote public/og-image.png (${buffer.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

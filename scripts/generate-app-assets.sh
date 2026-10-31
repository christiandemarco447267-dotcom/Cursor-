#!/usr/bin/env bash
# Regenerates every app icon / splash image from public/icon.png using ImageMagick 6/7.
#   bash scripts/generate-app-assets.sh
# Outputs:
#   resources/icon-master-1024.png   full-bleed, opaque master (App Store marketing icon)
#   resources/icon-foreground.png    the "S" mark on transparent (Android adaptive foreground source)
#   resources/splash-2732.png        dark splash master
#   public/icons/*, public/apple-touch-icon.png, public/splash/*   (PWA / website)
#   android/app/src/main/res/**      mipmaps + splash (only if android/ exists)
#   ios/App/App/Assets.xcassets/**   AppIcon + Splash (only if ios/ exists)
# Tip: replace public/icon.png with a 1024px source (or a designer-made master) for sharper results.
set -euo pipefail
cd "$(dirname "$0")/.."
IM=convert; command -v magick >/dev/null 2>&1 && IM="magick"
SRC=public/icon.png
BG_DARK="#070a1c"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
mkdir -p resources public/icons public/splash

# 1) Pull the grey "S" mark out of the purple tile (it is the only low-saturation shape) and
#    drop the tile's light rim with an inset rounded-rect mask.
$IM "$SRC" -alpha off -colorspace HSL -channel G -separate +channel -negate -level 55%,80% "$TMP/sat.png"
$IM -size 256x256 xc:black -fill white -draw "roundrectangle 10,10 245,245 36,36" "$TMP/inset.png"
$IM "$TMP/sat.png" "$TMP/inset.png" -compose Multiply -composite "$TMP/mask.png"
$IM "$SRC" -alpha off "$TMP/mask.png" -compose CopyOpacity -composite -filter Lanczos -resize 1024x1024 \
  -channel A -blur 0x1.2 -level 20%,90% +channel "$TMP/S.png"
$IM "$TMP/S.png" \( +clone -background '#2e0866' -shadow 80x10+14+22 \) +swap -background none -layers merge +repage \
  -gravity northwest -crop 1024x1024+0+0 +repage resources/icon-foreground.png

# 2) Brand gradient (magenta top-left -> violet bottom-right, like the original tile) + highlight.
$IM -size 1448x1448 gradient:'#ea5cff'-'#4c0f9c' -distort SRT -45 -gravity center -crop 1024x1024+0+0 +repage \
  \( -size 1024x1024 radial-gradient:'rgba(255,180,255,0.5)'-'rgba(255,180,255,0)' -geometry -220-260 \) -compose Screen -composite \
  "$TMP/bg.png"
cp "$TMP/bg.png" resources/icon-background.png

# 3) Full-bleed opaque master (no alpha: App Store requirement for the 1024 marketing icon).
$IM "$TMP/bg.png" resources/icon-foreground.png -compose over -composite -alpha off -depth 8 -strip PNG24:resources/icon-master-1024.png

# 4) Maskable master: mark shrunk into the 80% safe zone.
$IM "$TMP/bg.png" \( resources/icon-foreground.png -resize 78% \) -gravity center -compose over -composite -alpha off -depth 8 -strip "$TMP/maskable.png"

# 5) Splash master: dark background, rounded tile icon centred (~1/6 width).
$IM -size 2732x2732 "xc:$BG_DARK" \( resources/icon-master-1024.png -resize 480x480 \
  \( -size 480x480 xc:black -fill white -draw "roundrectangle 0,0 479,479 108,108" \) -alpha off -compose CopyOpacity -composite \) \
  -gravity center -compose over -composite -alpha off -depth 8 -strip resources/splash-2732.png

# ---- PWA / website ----
for s in 48 72 96 128 144 152 192 256 384 512; do
  $IM resources/icon-master-1024.png -filter Lanczos -resize ${s}x${s} -strip "public/icons/icon-${s}.png"
done
for s in 192 512; do $IM "$TMP/maskable.png" -resize ${s}x${s} -strip "public/icons/maskable-${s}.png"; done
$IM resources/icon-master-1024.png -resize 180x180 -alpha off -strip public/apple-touch-icon.png
# iOS "Add to Home Screen" launch images (portrait), WxH in device pixels.
for wh in 1320x2868 1290x2796 1206x2622 1179x2556 1284x2778 1170x2532 1125x2436 1242x2688 828x1792 1242x2208 750x1334 2048x2732 1668x2388 1640x2360 1488x2266; do
  $IM resources/splash-2732.png -gravity center -resize "${wh}^" -extent "$wh" -strip "public/splash/apple-splash-${wh}.png"
done

# ---- Android (Capacitor) ----
RES=android/app/src/main/res
if [ -d "$RES" ]; then
  declare -A D=([mdpi]=1 [hdpi]=1.5 [xhdpi]=2 [xxhdpi]=3 [xxxhdpi]=4)
  for d in "${!D[@]}"; do
    f=${D[$d]}
    leg=$(awk "BEGIN{print int(48*$f+0.5)}"); fg=$(awk "BEGIN{print int(108*$f+0.5)}")
    mkdir -p "$RES/mipmap-$d"
    # Legacy square + round launcher icons (pre-Android 8).
    $IM resources/icon-master-1024.png -resize ${leg}x${leg} -strip "$RES/mipmap-$d/ic_launcher.png"
    $IM resources/icon-master-1024.png -resize ${leg}x${leg} \( -size ${leg}x${leg} xc:black -fill white -draw "circle $((leg/2)),$((leg/2)) $((leg/2)),0" \) \
      -alpha off -compose CopyOpacity -composite -strip "$RES/mipmap-$d/ic_launcher_round.png"
    # Adaptive icon layers (Android 8+): 108dp canvas, mark kept inside the 66dp safe zone.
    $IM -size ${fg}x${fg} xc:none \( resources/icon-foreground.png -resize $(awk "BEGIN{print int($fg*0.62)}")x \) -gravity center -compose over -composite -strip "$RES/mipmap-$d/ic_launcher_foreground.png"
    $IM resources/icon-background.png -resize ${fg}x${fg} -strip "$RES/mipmap-$d/ic_launcher_background.png"
  done
  # Adaptive icon XML: use the background bitmap instead of a flat colour.
  if [ -d "$RES/mipmap-anydpi-v26" ]; then
    for n in ic_launcher ic_launcher_round; do
      cat > "$RES/mipmap-anydpi-v26/$n.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XML
    done
  fi
  # Splash bitmaps: overwrite every splash.png the template ships, keeping each one's size.
  while IFS= read -r f; do
    wh=$($IM identify -format "%wx%h" "$f" 2>/dev/null || identify -format "%wx%h" "$f")
    $IM resources/splash-2732.png -gravity center -resize "${wh}^" -extent "$wh" -strip "$f"
  done < <(find "$RES" -name 'splash.png')
fi

# ---- iOS (Capacitor) ----
XC=ios/App/App/Assets.xcassets
if [ -d "$XC" ]; then
  # Single-size 1024 app icon (Xcode 14+ derives every other size). Must have no alpha channel.
  for f in "$XC"/AppIcon.appiconset/*.png; do
    [ -e "$f" ] && $IM resources/icon-master-1024.png -alpha off -depth 8 -strip "PNG24:$f"
  done
  for f in "$XC"/Splash.imageset/*.png; do
    [ -e "$f" ] && $IM resources/splash-2732.png -resize 2732x2732 -alpha off -strip "$f"
  done
fi
echo "App assets generated."

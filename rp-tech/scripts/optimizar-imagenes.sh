#!/usr/bin/env bash
# Convierte las fotos del repo viejo a WebP <= 300 KB.
# R12: 26001.png pesaba 2.8 MB y 26005.jpg 1.6 MB.
set -euo pipefail

ORIGEN="../rp-tech_final/public/products"
DESTINO="./scripts/imagenes"
mkdir -p "$DESTINO"

command -v magick >/dev/null || { echo "Falta ImageMagick: sudo pacman -S imagemagick"; exit 1; }

for f in "$ORIGEN"/*.{jpg,png}; do
  [ -e "$f" ] || continue
  base=$(basename "${f%.*}")
  magick "$f" -resize '1200x1200>' -quality 82 -strip "$DESTINO/$base.webp"
  printf '%-16s %s\n' "$base.webp" "$(du -h "$DESTINO/$base.webp" | cut -f1)"
done

echo "--- ninguna debe pasar de 300K ---"
find "$DESTINO" -size +300k -exec ls -lh {} \; || echo "OK: todas por debajo de 300K"

#!/usr/bin/env bash
set -euo pipefail

make_background() {
  local output="$1"
  local top="$2"
  local bottom="$3"
  local accent="$4"
  local title="$5"

  magick -size 1200x1200 "gradient:${top}-${bottom}" \
    -fill "rgba(255,255,255,0.09)" -draw "rectangle 70,70 1130,1130" \
    -fill "rgba(0,0,0,0.18)" -draw "circle 600,600 600,150" \
    -fill "${accent}" -draw "circle 600,600 600,245" \
    -fill "rgba(255,255,255,0.82)" -gravity center -pointsize 92 -annotate 0 "${title}" \
    "${output}"
}

make_token() {
  local output="$1"
  local bg="$2"
  local fg="$3"
  local text="$4"

  magick -size 192x192 "xc:${bg}" \
    -fill "rgba(255,255,255,0.18)" -draw "circle 96,96 96,18" \
    -fill "rgba(0,0,0,0.22)" -draw "circle 96,100 96,184" \
    -fill "${fg}" -gravity center -pointsize 84 -annotate 0 "${text}" \
    "${output}"
}

make_background themes/source/lord-of-the-rings/assets/board/background.png "#21351f" "#b39a58" "#d4af37" "Middle-earth"
make_token themes/source/lord-of-the-rings/assets/tokens/ring.png "#d4af37" "#2d210b" "R"
make_token themes/source/lord-of-the-rings/assets/tokens/tree.png "#f4f0de" "#27472d" "T"
make_token themes/source/lord-of-the-rings/assets/tokens/hat.png "#4b5563" "#f8f1df" "W"
make_token themes/source/lord-of-the-rings/assets/tokens/pipe.png "#7a4b2a" "#fff4d6" "P"
make_token themes/source/lord-of-the-rings/assets/tokens/leaf.png "#3f7f4f" "#fff4d6" "L"
make_token themes/source/lord-of-the-rings/assets/tokens/axe.png "#8f6f39" "#23180e" "A"

make_background themes/source/star-wars/assets/board/background.png "#070b18" "#172b56" "#ffe65a" "Galaxy"
make_token themes/source/star-wars/assets/tokens/astromech.png "#d8ecff" "#1d4ed8" "A"
make_token themes/source/star-wars/assets/tokens/freighter.png "#d6d9de" "#111827" "F"
make_token themes/source/star-wars/assets/tokens/helmet.png "#111827" "#f8fbff" "H"
make_token themes/source/star-wars/assets/tokens/saber.png "#0f172a" "#38f27b" "S"
make_token themes/source/star-wars/assets/tokens/holocron.png "#38bdf8" "#082f49" "K"
make_token themes/source/star-wars/assets/tokens/comlink.png "#f97316" "#111827" "C"

make_background themes/source/noir-city/assets/board/background.png "#15171d" "#5a4b35" "#d7b95c" "Noir City"
make_token themes/source/noir-city/assets/tokens/cab.png "#f4c430" "#1f2937" "C"
make_token themes/source/noir-city/assets/tokens/fedora.png "#2b2d31" "#f7f2e6" "F"
make_token themes/source/noir-city/assets/tokens/badge.png "#c9a227" "#1f2937" "B"
make_token themes/source/noir-city/assets/tokens/camera.png "#5b6472" "#f7f2e6" "P"
make_token themes/source/noir-city/assets/tokens/key.png "#d7b95c" "#1f2937" "K"
make_token themes/source/noir-city/assets/tokens/matchbook.png "#b84234" "#f7f2e6" "M"

make_tile_art() {
  local output="$1"
  local bg="$2"
  local fg="$3"
  local text="$4"

  magick -size 192x192 xc:none \
    -fill "${bg}" -draw "roundrectangle 28,38 164,154 22,22" \
    -fill "rgba(255,255,255,0.20)" -draw "circle 96,96 96,42" \
    -fill "${fg}" -gravity center -pointsize 56 -annotate 0 "${text}" \
    "${output}"
}

make_background themes/source/space-art-demo/assets/board/background.png "#243b55" "#94716b" "#e8c15a" "Image Spaces"
make_token themes/source/space-art-demo/assets/tokens/camera.png "#e8c15a" "#1d2939" "C"
make_token themes/source/space-art-demo/assets/tokens/brush.png "#6ec6ca" "#1d2939" "B"
make_token themes/source/space-art-demo/assets/tokens/star.png "#513c7b" "#fff4d6" "S"
make_token themes/source/space-art-demo/assets/tokens/key.png "#a14f57" "#fff4d6" "K"
make_token themes/source/space-art-demo/assets/tokens/map.png "#6e8a4a" "#fff4d6" "M"
make_token themes/source/space-art-demo/assets/tokens/lamp.png "#2f557f" "#fff4d6" "L"

ids=(
  GO MEDITERRANEAN_AVENUE COMMUNITY_CHEST_1 BALTIC_AVENUE INCOME_TAX
  READING_RAILROAD ORIENTAL_AVENUE CHANCE_1 VERMONT_AVENUE CONNECTICUT_AVENUE
  JAIL ST_CHARLES_PLACE ELECTRIC_COMPANY STATES_AVENUE VIRGINIA_AVENUE
  PENNSYLVANIA_RAILROAD ST_JAMES_PLACE COMMUNITY_CHEST_2 TENNESSEE_AVENUE NEW_YORK_AVENUE
  FREE_PARKING KENTUCKY_AVENUE CHANCE_2 INDIANA_AVENUE ILLINOIS_AVENUE
  B_AND_O_RAILROAD ATLANTIC_AVENUE VENTNOR_AVENUE WATER_WORKS MARVIN_GARDENS
  GO_TO_JAIL PACIFIC_AVENUE NORTH_CAROLINA_AVENUE COMMUNITY_CHEST_3 PENNSYLVANIA_AVENUE
  SHORT_LINE CHANCE_3 PARK_PLACE LUXURY_TAX BOARDWALK
)

letters=(G A C B T R O Q V N J S E A V P J C T Y F K Q I L B A V W M X P N C P S Q R T B)
colors=("#e8c15a" "#7b4b2a" "#6ec6ca" "#7b4b2a" "#a14f57" "#3a4350" "#8fd4ef" "#513c7b" "#8fd4ef" "#8fd4ef" "#6b7280" "#d84a9a" "#2f557f" "#d84a9a" "#d84a9a" "#3a4350" "#f28c28" "#6ec6ca" "#f28c28" "#f28c28" "#6e8a4a" "#d62828" "#513c7b" "#d62828" "#d62828" "#3a4350" "#f7d038" "#f7d038" "#2f557f" "#f7d038" "#a14f57" "#1f8f4d" "#1f8f4d" "#6ec6ca" "#1f8f4d" "#3a4350" "#513c7b" "#23458f" "#a14f57" "#23458f")

for index in "${!ids[@]}"; do
  make_tile_art "themes/source/space-art-demo/assets/spaces/${ids[$index]}.png" "${colors[$index]}" "#fffaf0" "${letters[$index]}"
done

lotr_letters=(S B C B L E B Q V C J R P F M D L C C F R H Q E M R O D E G M C M C G S Q D T B)
lotr_colors=("#d4af37" "#6b3f25" "#9fc6c2" "#6b3f25" "#8f2f23" "#8f6f39" "#9fc6c2" "#41633a" "#9fc6c2" "#9fc6c2" "#4b5563" "#8c5b7a" "#24354f" "#8c5b7a" "#8c5b7a" "#8f6f39" "#b8692a" "#9fc6c2" "#b8692a" "#b8692a" "#41633a" "#8f2f23" "#41633a" "#8f2f23" "#8f2f23" "#8f6f39" "#d7b84b" "#d7b84b" "#24354f" "#d7b84b" "#8f2f23" "#375f35" "#375f35" "#9fc6c2" "#375f35" "#8f6f39" "#41633a" "#24354f" "#8f2f23" "#24354f")
star_letters=(H L H M I F C M B D D E P H I S N H T C R J M S E X J S M Y C M K H V T M D K E)
star_colors=("#ffe65a" "#6b4a2b" "#38bdf8" "#6b4a2b" "#ef4444" "#d6d9de" "#79d9ff" "#2563eb" "#79d9ff" "#79d9ff" "#111827" "#f472b6" "#f97316" "#f472b6" "#f472b6" "#d6d9de" "#fb923c" "#38bdf8" "#fb923c" "#fb923c" "#22c55e" "#ef4444" "#2563eb" "#ef4444" "#ef4444" "#d6d9de" "#facc15" "#facc15" "#f97316" "#facc15" "#ef4444" "#22c55e" "#22c55e" "#38bdf8" "#22c55e" "#d6d9de" "#2563eb" "#1d4ed8" "#ef4444" "#1d4ed8")

for index in "${!ids[@]}"; do
  make_tile_art "themes/source/lord-of-the-rings/assets/spaces/${ids[$index]}.png" "${lotr_colors[$index]}" "#fff8df" "${lotr_letters[$index]}"
  make_tile_art "themes/source/star-wars/assets/spaces/${ids[$index]}.png" "${star_colors[$index]}" "#f8fbff" "${star_letters[$index]}"
done

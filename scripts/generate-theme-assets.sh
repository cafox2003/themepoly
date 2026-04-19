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

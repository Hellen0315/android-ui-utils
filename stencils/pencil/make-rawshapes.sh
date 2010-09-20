#!/bin/sh
mkdir -p _rawshapes
for shpfl in `ls res/raw`; do
  echo $shpfl
  if [[ "$shpfl" =~ ".9.png" ]]; then
    python stengen/shape_from_9patch.py res/raw/$shpfl > _rawshapes/$shpfl.xml
  else
    python stengen/shape_from_png.py res/raw/$shpfl > _rawshapes/$shpfl.xml
  fi
done

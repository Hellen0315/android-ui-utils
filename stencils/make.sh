#!/bin/sh
mkdir -p dist
python stengen/stencil_generator.py frame "Frames" "Android device frames"
python stengen/stencil_generator.py basic "Basic Controls" "Basic android controls"

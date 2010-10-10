#!/bin/sh

# Copyright 2010 Google Inc.
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#      http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

mkdir -p _sandbox/rawshapes
for shpfl in `ls res/raw`; do
  echo $shpfl
  if [[ "$shpfl" =~ ".9.png" ]]; then
    python stengen/shape_from_9patch.py res/raw/$shpfl > _sandbox/rawshapes/$shpfl.xml
  else
    python stengen/shape_from_png.py res/raw/$shpfl > _sandbox/rawshapes/$shpfl.xml
  fi
done

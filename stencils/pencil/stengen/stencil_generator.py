#!/usr/bin/env python

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

import sys
import os
import os.path
import shutil
import zipfile


def main():
  params = {}
  params['id'] = sys.argv[1]
  params['displayname'] = sys.argv[2]
  params['description'] = sys.argv[3]

  zip_file = zipfile.ZipFile('dist/stencil-%s.zip' % params['id'], 'w',
      zipfile.ZIP_DEFLATED)

  # save stencil XML
  shapes_xml = ''
  shapes_folder = 'res/sets/%s/shapes' % params['id']
  for shape_file in os.listdir(shapes_folder):
    if not shape_file.endswith('.xml'):
      continue
    shape_xml = open(os.path.join(shapes_folder, shape_file)).read()
    shapes_xml += shape_xml

  params['shapes'] = shapes_xml
  final_xml = open('res/stencil_template.xml').read() % params
  zip_file.writestr('Definition.xml', final_xml)

  # save icons
  icons_folder = 'res/sets/%s/icons' % params['id']
  for icon_file in os.listdir(icons_folder):
    if not icon_file.endswith('.png'):
      continue
    zip_file.writestr(
        'icons/%s' % icon_file,
        open(os.path.join(icons_folder, icon_file), 'rb').read())

  zip_file.close()
      

if __name__ == '__main__':
  main()
#!/usr/bin/env python
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

  zip_file = zipfile.ZipFile('dist/stencil-%s.zip' % params['id'], 'w')

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
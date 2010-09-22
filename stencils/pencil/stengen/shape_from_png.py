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
from StringIO import StringIO
from PIL import Image

import datauri


def image_to_data_uri_(im):
  f = StringIO()
  im.save(f, 'PNG')
  uri = datauri.to_data_uri(f.getvalue(), 'foo.png')
  f.close()
  return uri


def main():
  src_im = Image.open(sys.argv[1])

  template_params = {}
  template_params['id'] = sys.argv[1]
  template_params['image_uri'] = image_to_data_uri_(src_im)
  template_params['icon_uri'] = image_to_data_uri_(src_im)
  
  template_params['width'] = src_im.size[0]
  template_params['height'] = src_im.size[1]

  print open('res/shape_png_template.xml').read() % template_params


if __name__ == '__main__':
  main()
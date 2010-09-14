#!/usr/bin/env python
import sys
import os
from StringIO import StringIO
from PIL import Image

import datauri


RGBA_BLACK = (0, 0, 0, 255)


sign_ = lambda n: -1 if n < 0 else (1 if n > 0 else 0)

def find_black_region_(im, sx, sy, ex, ey):
  dx = sign_(ex - sx)
  dy = sign_(ey - sy)
  if abs(dx) == abs(dy):
    raise 'findRegion_ can\'t look both horizontally and vertically at once.'

  pixel_changes = []
  pixel_on = False
  x = sx
  y = sy
  while True:
    if not pixel_on and im.getpixel((x, y)) == RGBA_BLACK:
      pixel_changes.append((x, y))
      pixel_on = True
    elif pixel_on and im.getpixel((x, y)) != RGBA_BLACK:
      pixel_changes.append((x, y))
      pixel_on = False
    x += dx
    y += dy
    if x == ex and y == ey:
      break

  return (pixel_changes[0][0 if dx else 1] - (sx if dx else sy),
          pixel_changes[1][0 if dx else 1] - (sx if dx else sy))


def image_to_data_uri_(im):
  f = StringIO()
  im.save(f, 'PNG')
  uri = datauri.to_data_uri(f.getvalue(), 'foo.png')
  f.close()
  return uri


def main():
  src_im = Image.open(sys.argv[1])

  # read and parse 9-patch stretch and padding regions
  stretch_l, stretch_r = find_black_region_(src_im, 0, 0, src_im.size[0], 0)
  stretch_t, stretch_b = find_black_region_(src_im, 0, 0, 0, src_im.size[1])
  
  pad_l, pad_r = find_black_region_(src_im, 0, src_im.size[1] - 1, src_im.size[0], src_im.size[1] - 1)
  pad_t, pad_b = find_black_region_(src_im, src_im.size[0] - 1, 0, src_im.size[0] - 1, src_im.size[1])
  #padding_box = {}

  template_params = {}
  template_params['id'] = sys.argv[1]
  template_params['icon_uri'] = image_to_data_uri_(src_im)
  template_params['dim_constraint_attributes'] = '' # p:lockHeight="true"
  
  template_params['uri_tl'] = image_to_data_uri_(src_im.crop((1, 1, stretch_l, stretch_t)))
  template_params['uri_tc'] = image_to_data_uri_(src_im.crop((stretch_l, 1, stretch_r, stretch_t)))
  template_params['uri_tr'] = image_to_data_uri_(src_im.crop((stretch_r, 1, src_im.size[0] - 1, stretch_t)))
  
  template_params['uri_cl'] = image_to_data_uri_(src_im.crop((1, stretch_t, stretch_l, stretch_b)))
  template_params['uri_cc'] = image_to_data_uri_(src_im.crop((stretch_l, stretch_t, stretch_r, stretch_b)))
  template_params['uri_cr'] = image_to_data_uri_(src_im.crop((stretch_r, stretch_t, src_im.size[0] - 1, stretch_b)))

  template_params['uri_bl'] = image_to_data_uri_(src_im.crop((1, stretch_b, stretch_l, src_im.size[1] - 1)))
  template_params['uri_bc'] = image_to_data_uri_(src_im.crop((stretch_l, stretch_b, stretch_r, src_im.size[1] - 1)))
  template_params['uri_br'] = image_to_data_uri_(src_im.crop((stretch_r, stretch_b, src_im.size[0] - 1, src_im.size[1] - 1)))

  template_params['width_l'] = stretch_l - 1
  template_params['width_r'] = src_im.size[0] - stretch_r - 1
  template_params['height_t'] = stretch_t - 1
  template_params['height_b'] = src_im.size[1] - stretch_b - 1

  template_params['pad_l'] = pad_l - 1
  template_params['pad_t'] = pad_t - 1
  template_params['pad_r'] = src_im.size[0] - pad_r - 1
  template_params['pad_b'] = src_im.size[1] - pad_b - 1

  print open('res/shape_9patch_template.xml').read() % template_params


if __name__ == '__main__':
  main()
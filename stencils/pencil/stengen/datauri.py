#!/usr/bin/env python
import base64
import sys
import mimetypes


def to_data_uri(data, file_name):
  '''Takes a file object and returns its data: string.'''
  mime_type = mimetypes.guess_type(file_name)
  return 'data:%(mimetype)s;base64,%(data)s' % dict(mimetype=mime_type[0],
      data=base64.b64encode(data))


def main():
  print to_data_uri(open(sys.argv[1], 'rb').read(), sys.argv[1])


if __name__ == '__main__':
  main()
#!/bin/sh
rm -rf dist
mkdir -p dist
mkdir -p dist/js
mkdir -p dist/images
mkdir -p dist/css

cd src/
find images -iname \*.png -exec pngcrush {} ../dist/{} \;

cd js/
ant clean
ant dist
cd ..

find css -iname \*.css -exec java -jar ../lib/yuicompressor-2.4.2.jar -o ../dist/{} {} \;

cp -rf lib/ ../dist/lib/

cp -rf res/ ../dist/res/

cd html
#find . -iname \*.html -exec java -jar ../../lib/htmlcompressor-0.9.jar --remove-intertag-spaces --remove-quotes -o ../out/{} {} \;
find . -iname \*.html -exec cp {} ../../dist/{} \;
cd ..
cd ..

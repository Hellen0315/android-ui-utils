/*
Copyright 2010 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

//#REQUIRE "includes.js"

imagelib.drawing = {};

imagelib.drawing.context = function(size) {
  var canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  return canvas.getContext('2d');
};

imagelib.drawing.copy = function(dstCtx, src, size) {
  dstCtx.drawImage(src.canvas || src, 0, 0, size.w, size.h);
};

imagelib.drawing.clear = function(ctx, size) {
  ctx.clearRect(0, 0, size.w, size.h);
};

imagelib.drawing.drawCenterInside = function(dstCtx, src, dstRect, srcRect) {
  if (srcRect.w / srcRect.h > dstRect.w / dstRect.h) {
    var h = srcRect.h * dstRect.w / srcRect.w;
    dstCtx.drawImage(src.canvas || src,
        srcRect.x, srcRect.y,
        srcRect.w, srcRect.h,
        dstRect.x, dstRect.y + (dstRect.h - h) / 2,
        dstRect.w, h);
  } else {
    var w = srcRect.w * dstRect.h / srcRect.h;
    dstCtx.drawImage(src.canvas || src,
        srcRect.x, srcRect.y,
        srcRect.w, srcRect.h,
        dstRect.x + (dstRect.w - w) / 2, dstRect.y,
        w, dstRect.h);
  }
};

imagelib.drawing.drawCenterCrop = function(dstCtx, src, dstRect, srcRect) {
  if (srcRect.w / srcRect.h > dstRect.w / dstRect.h) {
    var w = srcRect.h * dstRect.w / dstRect.h;
    dstCtx.drawImage(src.canvas || src,
        srcRect.x + (srcRect.w - w) / 2, srcRect.y,
        w, srcRect.h,
        dstRect.x, dstRect.y,
        dstRect.w, dstRect.h);
  } else {
    var h = srcRect.w * dstRect.h / dstRect.w;
    dstCtx.drawImage(src.canvas || src,
        srcRect.x, srcRect.y + (srcRect.h - h) / 2,
        srcRect.w, h,
        dstRect.x, dstRect.y,
        dstRect.w, dstRect.h);
  }
};

imagelib.drawing.trimRectWorkerJS_ = [
"self['onmessage'] = function(event) {                                       ",
"  var l = event.data.size.w, t = event.data.size.h, r = 0, b = 0;           ",
"                                                                            ",
"  var alpha;                                                                ",
"  for (var y = 0; y < event.data.size.h; y++) {                             ",
"    for (var x = 0; x < event.data.size.w; x++) {                           ",
"      alpha = event.data.imageData.data[                                    ",
"          ((y * event.data.size.w + x) << 2) + 3];                          ",
"      if (alpha >= event.data.minAlpha) {                                   ",
"        l = Math.min(x, l);                                                 ",
"        t = Math.min(y, t);                                                 ",
"        r = Math.max(x, r);                                                 ",
"        b = Math.max(y, b);                                                 ",
"      }                                                                     ",
"    }                                                                       ",
"  }                                                                         ",
"                                                                            ",
"  if (l > r) {                                                              ",
"    // no pixels, couldn't trim                                             ",
"    postMessage({ x: 0, y: 0, w: event.data.size.w, h: event.data.size.h });",
"  }                                                                         ",
"                                                                            ",
"  postMessage({ x: l, y: t, w: r - l + 1, h: b - t + 1 });                  ",
"};                                                                          ",
""].join('\n');

imagelib.drawing.getTrimRect = function(ctx, size, minAlpha, callback) {
  callback = callback || function(){};

  if (!ctx.canvas) {
    // Likely an image
    var src = ctx;
    ctx = imagelib.drawing.context(size);
    imagelib.drawing.copy(ctx, src, size);
  }

  if (minAlpha == 0)
    callback({ x: 0, y: 0, w: size.w, h: size.h });

  minAlpha = minAlpha || 1;

  var worker = imagelib.util.runWorkerJs(
      imagelib.drawing.trimRectWorkerJS_,
      {
        imageData: ctx.getImageData(0, 0, size.w, size.h),
        size: size,
        minAlpha: minAlpha
      },
      callback);

  return worker;
};

imagelib.drawing.copyAsAlpha = function(dstCtx, src, size, onColor, offColor) {
  onColor = onColor || '#fff';
  offColor = offColor || '#000';

  dstCtx.save();
  dstCtx.clearRect(0, 0, size.w, size.h);
  dstCtx.globalCompositeOperation = 'source-over';
  imagelib.drawing.copy(dstCtx, src, size);
  dstCtx.globalCompositeOperation = 'source-atop';
  dstCtx.fillStyle = onColor;
  dstCtx.fillRect(0, 0, size.w, size.h);
  dstCtx.globalCompositeOperation = 'destination-atop';
  dstCtx.fillStyle = offColor;
  dstCtx.fillRect(0, 0, size.w, size.h);
  dstCtx.restore();
};

imagelib.drawing.makeAlphaMask = function(ctx, size, fillColor) {
  var src = ctx.getImageData(0, 0, size.w, size.h);
  var dst = ctx.createImageData(size.w, size.h);
  var srcData = src.data;
  var dstData = dst.data;
  var i, g;
  for (var y = 0; y < size.h; y++) {
    for (var x = 0; x < size.w; x++) {
      i = (y * size.w + x) << 2;
      g = 0.30 * srcData[i] +
              0.59 * srcData[i + 1] +
              0.11 * srcData[i + 2];
      dstData[i] = dstData[i + 1] = dstData[i + 2] = 255;
      dstData[i + 3] = g;
    }
  }
  ctx.putImageData(dst, 0, 0);

  if (fillColor) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.restore();
  }
};

imagelib.drawing.applyFilter = function(filter, ctx, size) {
  var src = ctx.getImageData(0, 0, size.w, size.h);
  var dst = ctx.createImageData(size.w, size.h);
  filter.apply(src, dst);
  ctx.putImageData(dst, 0, 0);
};

imagelib.drawing.blur = function(radius, ctx, size) {
  var rows = Math.ceil(radius);
  var r = rows * 2 + 1;
  var matrix = new Array(r * r);
	var sigma = radius / 3;
	var sigma22 = 2 * sigma * sigma;
	var sqrtPiSigma22 = Math.sqrt(Math.PI * sigma22);
	var radius2 = radius * radius;
	var total = 0;
	var index = 0;
	var distance2;
	for (var y = -rows; y <= rows; y++) {
	  for (var x = -rows; x <= rows; x++) {
  		distance2 = 1.0*x*x + 1.0*y*y;
  		if (distance2 > radius2)
  			matrix[index] = 0;
  		else
  			matrix[index] = Math.exp(-distance2 / sigma22) / sqrtPiSigma22;
  		total += matrix[index];
  		index++;
		}
	}

  imagelib.drawing.applyFilter(
    new ConvolutionFilter(matrix, total, 0, true),
    ctx, size);
};

imagelib.drawing.fx = function(effects, dstCtx, src, size) {
  effects = effects || [];

  var outerEffects = [];
  var innerEffects = [];
  var fillEffects = [];

  for (var i = 0; i < effects.length; i++) {
    if (/^outer/.test(effects[i].effect)) outerEffects.push(effects[i]);
    else if (/^inner/.test(effects[i].effect)) innerEffects.push(effects[i]);
    else if (/^fill/.test(effects[i].effect)) fillEffects.push(effects[i]);
  }

  // Setup temporary rendering contexts
  var tmpCtx = imagelib.drawing.context(size);
  var tmpCtx2 = imagelib.drawing.context(size);

  // Render outer effects
  for (var i = 0; i < outerEffects.length; i++) {
    var effect = outerEffects[i];

    dstCtx.save();

    switch (effect.effect) {
      case 'outer-shadow':
        imagelib.drawing.clear(tmpCtx, size);
        imagelib.drawing.copyAsAlpha(tmpCtx, src.canvas || src, size);
        if (effect.blur)
          imagelib.drawing.blur(effect.blur, tmpCtx, size);
        imagelib.drawing.makeAlphaMask(tmpCtx, size, effect.color || '#000');
        if (effect.translate)
          dstCtx.translate(effect.translate.x || 0, effect.translate.y || 0);

        dstCtx.globalAlpha = Math.max(0, Math.min(1, effect.opacity || 1));
        imagelib.drawing.copy(dstCtx, tmpCtx, size);
        break;
    }

    dstCtx.restore();
  }

  dstCtx.save();

  // Render object with optional fill effects (only take first fill effect)
  imagelib.drawing.clear(tmpCtx, size);
  imagelib.drawing.copy(tmpCtx, src.canvas || src, size);

  if (fillEffects.length) {
    var effect = fillEffects[0];

    tmpCtx.save();
    tmpCtx.globalCompositeOperation = 'source-atop';

    switch (effect.effect) {
      case 'fill-color':
        tmpCtx.fillStyle = effect.color;
        break;

      case 'fill-lineargradient':
        var gradient = tmpCtx.createLinearGradient(
            effect.from.x, effect.from.y, effect.to.x, effect.to.y);
        for (var i = 0; i < effect.colors.length; i++) {
          gradient.addColorStop(effect.colors[i].offset, effect.colors[i].color);
        }
        tmpCtx.fillStyle = gradient;
        break;
    }

    tmpCtx.fillRect(0, 0, size.w, size.h);
    tmpCtx.restore();
  }

  dstCtx.globalAlpha = 1.0;
  imagelib.drawing.copy(dstCtx, tmpCtx, size);

  // Render inner effects
  for (var i = 0; i < innerEffects.length; i++) {
    var effect = innerEffects[i];

    tmpCtx.save();

    switch (effect.effect) {
      case 'inner-shadow':
        imagelib.drawing.clear(tmpCtx, size);
        imagelib.drawing.copyAsAlpha(tmpCtx, src.canvas || src, size, '#fff', '#000');

        imagelib.drawing.copyAsAlpha(tmpCtx2, src.canvas || src, size);
        if (effect.blur)
          imagelib.drawing.blur(effect.blur, tmpCtx2, size);
        imagelib.drawing.makeAlphaMask(tmpCtx2, size, '#000');
        if (effect.translate)
          tmpCtx.translate(effect.translate.x || 0, effect.translate.y || 0);

        tmpCtx.globalCompositeOperation = 'source-over';
        imagelib.drawing.copy(tmpCtx, tmpCtx2, size);

        imagelib.drawing.makeAlphaMask(tmpCtx, size, effect.color);
        dstCtx.globalAlpha = Math.max(0, Math.min(1, effect.opacity || 1));
        imagelib.drawing.copy(dstCtx, tmpCtx, size);
        break;
    }

    tmpCtx.restore();
  }

  dstCtx.restore();
};
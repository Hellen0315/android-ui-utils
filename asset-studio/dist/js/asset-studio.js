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

/*
	Base.js, version 1.1
	Copyright 2006-2007, Dean Edwards
	License: http://www.opensource.org/licenses/mit-license.php
*/

var Base = function() {
	// dummy
};

Base.extend = function(_instance, _static) { // subclass
	var extend = Base.prototype.extend;
	
	// build the prototype
	Base._prototyping = true;
	var proto = new this;
	extend.call(proto, _instance);
	delete Base._prototyping;
	
	// create the wrapper for the constructor function
	//var constructor = proto.constructor.valueOf(); //-dean
	var constructor = proto.constructor;
	var klass = proto.constructor = function() {
		if (!Base._prototyping) {
			if (this._constructing || this.constructor == klass) { // instantiation
				this._constructing = true;
				constructor.apply(this, arguments);
				delete this._constructing;
			} else if (arguments[0] != null) { // casting
				return (arguments[0].extend || extend).call(arguments[0], proto);
			}
		}
	};
	
	// build the class interface
	klass.ancestor = this;
	klass.extend = this.extend;
	klass.forEach = this.forEach;
	klass.implement = this.implement;
	klass.prototype = proto;
	klass.toString = this.toString;
	klass.valueOf = function(type) {
		//return (type == "object") ? klass : constructor; //-dean
		return (type == "object") ? klass : constructor.valueOf();
	};
	extend.call(klass, _static);
	// class initialisation
	if (typeof klass.init == "function") klass.init();
	return klass;
};

Base.prototype = {	
	extend: function(source, value) {
		if (arguments.length > 1) { // extending with a name/value pair
			var ancestor = this[source];
			if (ancestor && (typeof value == "function") && // overriding a method?
				// the valueOf() comparison is to avoid circular references
				(!ancestor.valueOf || ancestor.valueOf() != value.valueOf()) &&
				/\bbase\b/.test(value)) {
				// get the underlying method
				var method = value.valueOf();
				// override
				value = function() {
					var previous = this.base || Base.prototype.base;
					this.base = ancestor;
					var returnValue = method.apply(this, arguments);
					this.base = previous;
					return returnValue;
				};
				// point to the underlying method
				value.valueOf = function(type) {
					return (type == "object") ? value : method;
				};
				value.toString = Base.toString;
			}
			this[source] = value;
		} else if (source) { // extending with an object literal
			var extend = Base.prototype.extend;
			// if this object has a customised extend method then use it
			if (!Base._prototyping && typeof this != "function") {
				extend = this.extend || extend;
			}
			var proto = {toSource: null};
			// do the "toString" and other methods manually
			var hidden = ["constructor", "toString", "valueOf"];
			// if we are prototyping then include the constructor
			var i = Base._prototyping ? 0 : 1;
			while (key = hidden[i++]) {
				if (source[key] != proto[key]) {
					extend.call(this, key, source[key]);

				}
			}
			// copy each of the source object's properties to this object
			for (var key in source) {
				if (!proto[key]) extend.call(this, key, source[key]);
			}
		}
		return this;
	},

	base: function() {
		// call this method from any other method to invoke that method's ancestor
	}
};

// initialise
Base = Base.extend({
	constructor: function() {
		this.extend(arguments[0]);
	}
}, {
	ancestor: Object,
	version: "1.1",
	
	forEach: function(object, block, context) {
		for (var key in object) {
			if (this.prototype[key] === undefined) {
				block.call(context, object[key], key, object);
			}
		}
	},
		
	implement: function() {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] == "function") {
				// if it's a function, call it
				arguments[i](this.prototype);
			} else {
				// add the interface using the extend method
				this.prototype.extend(arguments[i]);
			}
		}
		return this;
	},
	
	toString: function() {
		return String(this.valueOf());
	}
});

(function() {

var imagelib = {};

// A modified version of bitmap.js from http://rest-term.com/archives/2566/

var Class = {
  create : function() {
    var properties = arguments[0];
    function self() {
      this.initialize.apply(this, arguments);
    }
    for(var i in properties) {
      self.prototype[i] = properties[i];
    }
    if(!self.prototype.initialize) {
      self.prototype.initialize = function() {};
    }
    return self;
  }
};

var ConvolutionFilter = Class.create({
  initialize : function(matrix, divisor, bias, separable) {
    this.r = (Math.sqrt(matrix.length) - 1) / 2;
    this.matrix = matrix;
    this.divisor = divisor;
    this.bias = bias;
    this.separable = separable;
  },
  apply : function(src, dst) {
    var w = src.width, h = src.height;
    var srcData = src.data;
    var dstData = dst.data;
    var di, si, idx;
    var r, g, b;

    //if (this.separable) {
      // TODO: optimize if linearly separable ... may need changes to divisor
      // and bias calculations
    //} else {
      // Not linearly separable
      for(var y=0;y<h;++y) {
        for(var x=0;x<w;++x) {
          idx = r = g = b = 0;
          di = (y*w + x) << 2;
          for(var ky=-this.r;ky<=this.r;++ky) {
            for(var kx=-this.r;kx<=this.r;++kx) {
              si = (Math.max(0, Math.min(h - 1, y + ky)) * w +
                    Math.max(0, Math.min(w - 1, x + kx))) << 2;
              r += srcData[si]*this.matrix[idx];
              g += srcData[si + 1]*this.matrix[idx];
              b += srcData[si + 2]*this.matrix[idx];
              //a += srcData[si + 3]*this.matrix[idx];
              idx++;
            }
          }
          dstData[di] = r/this.divisor + this.bias;
          dstData[di + 1] = g/this.divisor + this.bias;
          dstData[di + 2] = b/this.divisor + this.bias;
          //dstData[di + 3] = a/this.divisor + this.bias;
          dstData[di + 3] = 255;
        }
      }
    //}
    // for Firefox
    //dstData.forEach(function(n, i, arr) { arr[i] = n<0 ? 0 : n>255 ? 255 : n; });
  }
});


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

imagelib.loadImageResources = function(images, callback) {
  var imageResources = {};

  var checkForCompletion = function() {
    for (var id in images) {
      if (!(id in imageResources))
        return;
    }
    (callback || function(){})(imageResources);
    callback = null;
  };

  for (var id in images) {
    var img = document.createElement('img');
    img.src = images[id];
    (function(img, id) {
      img.onload = function() {
        imageResources[id] = img;
        checkForCompletion();
      };
      img.onerror = function() {
        imageResources[id] = null;
        checkForCompletion();
      }
    })(img, id);
  }
};

imagelib.loadFromUri = function(uri, callback) {
  callback = callback || function(){};

  var img = document.createElement('img');
  img.src = uri;
  img.onload = function() {
    callback(img);
  };
  img.onerror = function() {
    callback(null);
  }
};

imagelib.toDataUri = function(img) {
  var canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  return canvas.toDataURL();
};

imagelib.util = {};

/**
 * Helper method for running inline Web Workers, if the browser can support
 * them. If the browser doesn't support inline Web Workers, run the script
 * on the main thread, with this function body's scope, using eval. Browsers
 * must provide BlobBuilder, URL.createObjectURL, and Worker support to use
 * inline Web Workers. Most features such as importScripts() are not
 * currently supported, so this only works for basic workers.
 * @param {String} js The inline Web Worker Javascript code to run. This code
 *     must use 'self' and not 'this' as the global context variable.
 * @param {Object} params The parameters object to pass to the worker.
 *     Equivalent to calling Worker.postMessage(params);
 * @param {Function} callback The callback to run when the worker calls
 *     postMessage. Equivalent to adding a 'message' event listener on a
 *     Worker object and running callback(event.data);
 */
imagelib.util.runWorkerJs = function(js, params, callback) {
  var BlobBuilder = (window.BlobBuilder || window.WebKitBlobBuilder);
  var URL = (window.URL || window.webkitURL);
  var Worker = window.Worker;

  if (URL && BlobBuilder && Worker) {
    // BlobBuilder, Worker, and window.URL.createObjectURL are all available,
    // so we can use inline workers.
    var bb = new BlobBuilder();
    bb.append(js);
    var worker = new Worker(URL.createObjectURL(bb.getBlob()));
    worker.onmessage = function(event) {
      callback(event.data);
    };
    worker.postMessage(params);
    return worker;

  } else {
    // We can't use inline workers, so run the worker JS on the main thread.
    (function() {
      var __DUMMY_OBJECT__ = {};
      // Proxy to Worker.onmessage
      var postMessage = function(result) {
        callback(result);
      };
      // Bind the worker to this dummy object. The worker will run
      // in this scope.
      eval('var self=__DUMMY_OBJECT__;\n' + js);
      // Proxy to Worker.postMessage
      __DUMMY_OBJECT__.onmessage({
        data: params
      });
    })();

    // Return a dummy Worker.
    return {
      terminate: function(){}
    };
  }
};

window.imagelib = imagelib;

})();

(function() {

var studio = {};

studio.checkBrowser = function() {
  var chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
  var browserSupported = false;
  if (chromeMatch) {
    var chromeVersion = parseInt(chromeMatch[1], 10);
    if (chromeVersion >= 6) {
      browserSupported = true;
    }
  }

  if (!browserSupported) {
    $('<div>')
      .addClass('browser-unsupported-note ui-state-highlight')
      .attr('title', 'Your browser is not supported.')
      .append($('<span class="ui-icon ui-icon-alert" ' +
                'style="float:left; margin:0 7px 50px 0;">'))
      .append($('<p>')
        .html('Currently only ' +
              '<a href="http://www.google.com/chrome">Google Chrome</a> ' +
              'is recommended and supported. Your mileage may vary with ' +
              'other browsers.'))
      .prependTo('body');
  }
};

// From sample code at http://jqueryui.com/demos/autocomplete/#combobox

(function( $ ) {
  $.widget( "ui.combobox", {
    _create: function() {
      var self = this,
        select = this.element.hide(),
        selected = select.children( ":selected" ),
        value = selected.val() ? selected.text() : "";
      var input = $( "<input>" )
        .insertAfter( select )
        .val( value )
        .autocomplete({
          delay: 0,
          minLength: 0,
          source: function( request, response ) {
            var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
            response( select.children( "option" ).map(function() {
              var text = $( this ).text();
              if ( this.value && ( !request.term || matcher.test(text) ) )
                return {
                  label: text.replace(
                    new RegExp(
                      "(?![^&;]+;)(?!<[^<>]*)(" +
                      $.ui.autocomplete.escapeRegex(request.term) +
                      ")(?![^<>]*>)(?![^&;]+;)", "gi"
                    ), "<strong>$1</strong>" ),
                  value: text,
                  option: this
                };
            }) );
          },
          select: function( event, ui ) {
            ui.item.option.selected = true;
            self._trigger( "selected", event, {
              item: ui.item.option
            });
          },
          change: function( event, ui ) {
            if ( !ui.item ) {
              var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( $(this).val() ) + "$", "i" ),
                valid = false;
              select.children( "option" ).each(function() {
                if ( this.value.match( matcher ) ) {
                  this.selected = valid = true;
                  return false;
                }
              });
              if ( !valid ) {
                // remove invalid value, as it didn't match anything
                $( this ).val( "" );
                select.val( "" );
                return false;
              }
            }
          }
        })
        .addClass( "ui-widget ui-widget-content ui-corner-left" );

      input.data( "autocomplete" )._renderItem = function( ul, item ) {
        return $( "<li></li>" )
          .data( "item.autocomplete", item )
          .append( "<a>" + item.label + "</a>" )
          .appendTo( ul );
      };

      $( "<button>&nbsp;</button>" )
        .attr( "tabIndex", -1 )
        .attr( "title", "Show All Items" )
        .insertAfter( input )
        .button({
          icons: {
            primary: "ui-icon-triangle-1-s"
          },
          text: false
        })
        .removeClass( "ui-corner-all" )
        .addClass( "ui-corner-right ui-button-icon" )
        .click(function() {
          // close if already visible
          if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
            input.autocomplete( "close" );
            return;
          }

          // pass empty string as value to search for, displaying all results
          input.autocomplete( "search", "" );
          input.focus();
        });
    }
  });
})( jQuery );// Based on sample code at http://jqueryui.com/demos/autocomplete/#combobox

(function( $ ) {
  $.widget( "ui.autocompletewithbutton", {
    _create: function() {
      var self = this,
        input = this.element,
        value = input.text();

      input
        .autocomplete($.extend(this.options, {
          select: function( event, ui ) {
            self._trigger( "selected", event, ui.item.value);
          }
        }))
        .addClass( "form-text ui-widget ui-widget-content ui-corner-left " +
                   "ui-autocomplete-input" );

      input.data( "autocomplete" )._renderItem = function( ul, item ) {
        return $( "<li></li>" )
          .data( "item.autocomplete", item )
          .append( "<a>" + item.label + "</a>" )
          .appendTo( ul );
      };

      $( "<button>&nbsp;</button>" )
        .attr( "tabIndex", -1 )
        .attr( "title", "Show All Items" )
        .insertAfter( input )
        .button({
          icons: {
            primary: "ui-icon-triangle-1-s"
          },
          text: false
        })
        .removeClass( "ui-corner-all" )
        .addClass( "ui-corner-right ui-button-icon" )
        .click(function() {
          // close if already visible
          if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
            input.autocomplete( "close" );
            return;
          }

          // pass empty string as value to search for, displaying all results
          input.autocomplete( "search", "" );
          input.focus();
        });
    }
  });
})( jQuery );

studio.forms = {};

/**
 * Class defining a data entry form for use in the Asset Studio.
 */
studio.forms.Form = Base.extend({
  /**
   * Creates a new form with the given parameters.
   * @constructor
   * @param {Function} [params.onChange] A function
   * @param {Array} [params.inputs] A list of inputs
   */
  constructor: function(id, params) {
    this.id_ = id;
    this.params_ = params;
    this.fields_ = params.fields;
    this.pauseNotify_ = false;

    for (var i = 0; i < this.fields_.length; i++) {
      this.fields_[i].setForm_(this);
    }

    this.onChange = this.params_.onChange || function(){};
  },

  /**
   * Creates the user interface for the form in the given container.
   * @private
   * @param {HTMLElement} container The container node for the form UI.
   */
  createUI: function(container) {
    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      field.createUI(container);
    }
  },

  /**
   * Notifies that the form contents have changed;
   * @private
   */
  notifyChanged_: function() {
    if (this.pauseNotify_) {
      return;
    }
    this.onChange();
  },

  /**
   * Returns the current values of the form fields, as an object.
   * @type Object
   */
  getValues: function() {
    var values = {};

    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      values[field.id_] = field.getValue();
    }

    return values;
  },

  /**
   * Returns all available serialized values of the form fields, as an object.
   * All values in the returned object are either strings or objects.
   * @type Object
   */
  getValuesSerialized: function() {
    var values = {};

    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      var value = field.serializeValue ? field.serializeValue() : undefined;
      if (value !== undefined) {
        values[field.id_] = field.serializeValue();
      }
    }

    return values;
  },

  /**
   * Sets the form field values for the key/value pairs in the given object.
   * Values must be serialized forms of the form values. The form must be
   * initialized before calling this method.
   */
  setValuesSerialized: function(serializedValues) {
    this.pauseNotify_ = true;
    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      if (field.id_ in serializedValues && field.deserializeValue) {
        field.deserializeValue(serializedValues[field.id_]);
      }
    }
    this.pauseNotify_ = false;
    this.notifyChanged_();
  }
});


/**
 * Represents a form field and its associated UI elements. This should be
 * broken out into a more MVC-like architecture in the future.
 */
studio.forms.Field = Base.extend({
  /**
   * Instantiates a new field with the given ID and parameters.
   * @constructor
   */
  constructor: function(id, params) {
    this.id_ = id;
    this.params_ = params;
  },

  /**
   * Sets the form owner of the field. Internally called by
   * {@link studio.forms.Form}.
   * @private
   * @param {studio.forms.Form} form The owner form.
   */
  setForm_: function(form) {
    this.form_ = form;
  },

  /**
   * Returns a complete ID.
   * @type String
   */
  getLongId: function() {
    return this.form_.id_ + '-' + this.id_;
  },

  /**
   * Returns the ID for the form's UI element (or container).
   * @type String
   */
  getHtmlId: function() {
    return '_frm-' + this.getLongId();
  },

  /**
   * Generates the UI elements for a form field container. Not very portable
   * outside the Asset Studio UI. Intended to be overriden by descendents.
   * @private
   * @param {HTMLElement} container The destination element to contain the
   * field.
   */
  createUI: function(container) {
    container = $(container);
    return $('<div>')
      .addClass('form-field-outer')
      .append(
        $('<label>')
          .attr('for', this.getHtmlId())
          .text(this.params_.title)
          .append($('<div>')
            .addClass('form-field-help-text')
            .css('display', this.params_.helpText ? '' : 'none')
            .html(this.params_.helpText))
      )
      .append(
        $('<div>')
          .addClass('form-field-container')
      )
      .appendTo(container);
  }
});

studio.forms.TextField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    this.el_ = $('<input>')
      .addClass('form-text ui-widget ui-widget-content ' +
                'ui-autocomplete-input ui-corner-all')
      .attr('type', 'text')
      .val(this.getValue())
      .bind('keydown change', function() {
        var inputEl = this;
        window.setTimeout(function() {
          me.setValue($(inputEl).val(), true);
        }, 0);
      })
      .appendTo(fieldContainer);
  },

  getValue: function() {
    var value = this.value_;
    if (typeof value != 'string') {
      value = this.params_.defaultValue || '';
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      $(this.el_).val(val);
    }
    this.form_.notifyChanged_();
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(s);
  }
});

studio.forms.AutocompleteTextField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    this.el_ = $('<input>')
      .attr('type', 'text')
      .val(this.getValue())
      .bind('keydown change', function() {
        var inputEl = this;
        window.setTimeout(function() {
          me.setValue($(inputEl).val(), true);
        }, 0);
      })
      .appendTo(fieldContainer);

    this.el_.autocompletewithbutton({
      source: this.params_.items || [],
      delay: 0,
      minLength: 0,
      selected: function(evt, val) {
        me.setValue(val, true);
      }
    });
  },

  getValue: function() {
    var value = this.value_;
    if (typeof value != 'string') {
      value = this.params_.defaultValue || '';
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      $(this.el_).val(val);
    }
    this.form_.notifyChanged_();
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(s);
  }
});

studio.forms.ColorField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;
    this.el_ = $('<div>')
      .addClass('form-color')
      .attr('id', this.getHtmlId())
      .append($('<div>')
        .addClass('form-color-preview')
        .css('background-color', this.getValue().color)
      )
      .button({ label: null, icons: { secondary: 'ui-icon-carat-1-s' }})
      .appendTo(fieldContainer);

    this.el_.ColorPicker({
      color: this.getValue().color,
      onChange: function(hsb, hex, rgb) {
        me.setValue({ color:'#' + hex }, true);
      }
    });

    if (this.params_.alpha) {
      this.alphaEl_ = $('<div>')
        .addClass('form-color-alpha')
        .slider({
          min: 0,
          max: 100,
          range: 'min',
          value: this.getValue().alpha,
    			slide: function(evt, ui) {
    				me.setValue({ alpha: ui.value }, true);
    			}
        })
        .appendTo(fieldContainer);
    }
  },

  getValue: function() {
    var color = this.value_ || this.params_.defaultValue || '#000000';
    if (/^([0-9a-f]{6}|[0-9a-f]{3})$/i.test(color)) {
      color = '#' + color;
    }

    var alpha = this.alpha_;
    if (typeof alpha != 'number') {
      alpha = this.params_.defaultAlpha;
      if (typeof alpha != 'number')
        alpha = 100;
    }

    return { color: color, alpha: alpha };
  },

  setValue: function(val, pauseUi) {
    val = val || {};
    if ('color' in val) {
      this.value_ = val.color;
    }
    if ('alpha' in val) {
      this.alpha_ = val.alpha;
    }

    var computedValue = this.getValue();
    $('.form-color-preview', this.el_)
        .css('background-color', computedValue.color);
    if (!pauseUi) {
      $(this.el_).ColorPickerSetColor(computedValue.color);
      if (this.alphaEl_) {
        $(this.alphaEl_).slider('value', computedValue.alpha);
      }
    }
    this.form_.notifyChanged_();
  },

  serializeValue: function() {
    var computedValue = this.getValue();
    return computedValue.color.replace(/^#/, '') + ',' + computedValue.alpha;
  },

  deserializeValue: function(s) {
    var val = {};
    var arr = s.split(',', 2);
    if (arr.length >= 1) {
      val.color = arr[0];
    }
    if (arr.length >= 2) {
      val.alpha = parseInt(arr[1], 10);
    }
    this.setValue(val);
  }
});

studio.forms.EnumField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    if (this.params_.buttons) {
      this.el_ = $('<div>')
        .attr('id', this.getHtmlId())
        .addClass('.form-field-buttonset')
        .appendTo(fieldContainer);
      for (var i = 0; i < this.params_.options.length; i++) {
        var option = this.params_.options[i];
        $('<input>')
          .attr({
            type: 'radio',
            name: this.getHtmlId(),
            id: this.getHtmlId() + '-' + option.id,
            value: option.id
          })
          .change(function() {
            me.setValueInternal_($(this).val(), true);
          })
          .appendTo(this.el_);
        $('<label>')
          .attr('for', this.getHtmlId() + '-' + option.id)
          .text(option.title)
          .appendTo(this.el_);
      }
      this.setValueInternal_(this.getValue());
      this.el_.buttonset();
    } else {
      this.el_ = $('<select>')
        .attr('id', this.getHtmlId())
        .change(function() {
          me.setValueInternal_($(this).val(), true);
        })
        .appendTo(fieldContainer);
      for (var i = 0; i < this.params_.options.length; i++) {
        var option = this.params_.options[i];
        $('<option>')
          .attr('value', option.id)
          .text(option.title)
          .appendTo(this.el_);
      }

      this.el_.combobox({
        selected: function(evt, data) {
          me.form_.notifyChanged_();
        }
      });
    }
  },

  getValue: function() {
    var value = this.value_;
    if (value === undefined) {
      value = this.params_.defaultValue || this.params_.options[0].id;
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.setValueInternal_(val, pauseUi);
  },

  setValueInternal_: function(val, pauseUi) {
    // Note, this needs to be its own function because setValue gets
    // overridden in BooleanField and we need access to this method
    // from createUI.
    this.value_ = val;
    if (!pauseUi) {
      if (this.params_.buttons) {
        $('input', this.el_).each(function(i, el) {
          $(el).attr('checked', $(el).val() == val);
        });
        $(this.el_).buttonset('refresh');
      } else {
        this.el_.val(val);
      }
    }
    this.form_.notifyChanged_();
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(s);
  }
});

studio.forms.BooleanField = studio.forms.EnumField.extend({
  constructor: function(id, params) {
    params.options = [
      { id: '1', title: params.onText || 'Yes' },
      { id: '0', title: params.offText || 'No' }
    ];
    params.defaultValue = params.defaultValue ? '1' : '0';
    params.buttons = true;
    this.base(id, params);
  },

  getValue: function() {
    return this.base() == '1';
  },

  setValue: function(val, pauseUi) {
    this.base(val ? '1' : '0', pauseUi);
  },

  serializeValue: function() {
    return this.getValue() ? '1' : '0';
  },

  deserializeValue: function(s) {
    this.setValue(s == '1');
  }
});

studio.forms.RangeField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    this.el_ = $('<div>')
      .addClass('form-range')
      .slider({
        min: this.params_.min || 0,
        max: this.params_.max || 100,
        step: this.params_.step || 1,
        range: 'min',
        value: this.getValue(),
  			slide: function(evt, ui) {
  				me.setValue(ui.value, true);
  			}
      })
      .appendTo(fieldContainer);

    if (this.params_.textFn || this.params_.showText) {
      this.params_.textFn = this.params_.textFn || function(d){ return d; };
      this.textEl_ = $('<div>')
        .addClass('form-range-text')
        .text(this.params_.textFn(this.getValue()))
        .appendTo(fieldContainer);
    }
  },

  getValue: function() {
    var value = this.value_;
    if (typeof value != 'number') {
      value = this.params_.defaultValue;
      if (typeof value != 'number')
        value = 0;
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      $(this.el_).slider('value', val);
    }
		if (this.textEl_) {
		  this.textEl_.text(this.params_.textFn(val));
	  }
		this.form_.notifyChanged_();
  },

  serializeValue: function() {
    return this.getValue().toString();
  },

  deserializeValue: function(s) {
    this.setValue(Number(s)); // don't use parseInt nor parseFloat
  }
});

studio.hash = {};

studio.hash.boundFormOldOnChange_ = null;
studio.hash.boundForm_ = null;
studio.hash.currentParams_ = {};
studio.hash.currentHash_ = null; // The URI encoded, currently loaded state.

studio.hash.bindFormToDocumentHash = function(form) {
  if (!studio.hash.boundForm_) {
    // Checks for changes in the document hash
    // and reloads the form if necessary.
    var hashChecker_ = function() {
      // Don't use document.location.hash because it automatically
      // resolves URI-escaped entities.
      var docHash = studio.hash.paramsToHash(studio.hash.hashToParams(
          (document.location.href.match(/#.*/) || [''])[0]));

      if (docHash != studio.hash.currentHash_) {
        var newHash = docHash;
        var newParams = studio.hash.hashToParams(newHash);

        studio.hash.onHashParamsChanged_(newParams);
        studio.hash.currentParams_ = newParams;
        studio.hash.currentHash_ = newHash;
      };

      window.setTimeout(hashChecker_, 100);
    }

    window.setTimeout(hashChecker_, 0);
  }

  if (studio.hash.boundFormOldOnChange_ && studio.hash.boundForm_) {
    studio.hash.boundForm_.onChange = studio.hash.boundFormOldOnChange_;
  }

  studio.hash.boundFormOldOnChange_ = form.onChange;

  studio.hash.boundForm_ = form;
  var formChangeTimeout = null;
  studio.hash.boundForm_.onChange = function() {
    if (formChangeTimeout) {
      window.clearTimeout(formChangeTimeout);
    }
    formChangeTimeout = window.setTimeout(function() {
      studio.hash.onFormChanged_();
    }, 500);
    (studio.hash.boundFormOldOnChange_ || function(){}).apply(form, arguments);
  };
};

studio.hash.onHashParamsChanged_ = function(newParams) {
  if (studio.hash.boundForm_) {
    studio.hash.boundForm_.setValuesSerialized(newParams);
  }
};

studio.hash.onFormChanged_ = function() {
  if (studio.hash.boundForm_) {
    // We set this to prevent feedback in the hash checker.
    studio.hash.currentParams_ = studio.hash.boundForm_.getValuesSerialized();
    studio.hash.currentHash_ = studio.hash.paramsToHash(
        studio.hash.currentParams_);
    document.location.hash = studio.hash.currentHash_;
  }
};

studio.hash.hashToParams = function(hash) {
  var params = {};
  hash = hash.replace(/^[?#]/, '');

  var pairs = hash.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var parts = pairs[i].split('=', 2);

    // Most of the time path == key, but for objects like a.b=1, we need to
    // descend into the hierachy.
    var path = parts[0] ? decodeURIComponent(parts[0]) : parts[0];
    var val = parts[1] ? decodeURIComponent(parts[1]) : parts[1];
    var pathArr = path.split('.');
    var obj = params;
    for (var j = 0; j < pathArr.length - 1; j++) {
      obj[pathArr[j]] = obj[pathArr[j]] || {};
      obj = obj[pathArr[j]];
    }
    var key = pathArr[pathArr.length - 1];
    if (key in obj) {
      // Handle array values.
      if (obj[key] && obj[key].splice) {
        obj[key].push(val);
      } else {
        obj[key] = [obj[key], val];
      }
    } else {
      obj[key] = val;
    }
  }

  return params;
};

studio.hash.paramsToHash = function(params, prefix) {
  var hashArr = [];

  var keyPath_ = function(k) {
    return encodeURIComponent((prefix ? prefix + '.' : '') + k);
  };

  var pushKeyValue_ = function(k, v) {
    if (v === false) v = 0;
    if (v === true)  v = 1;
    hashArr.push(keyPath_(k) + '=' +
                 encodeURIComponent(v.toString()));
  };

  for (var key in params) {
    var val = params[key];
    if (val === undefined || val === null) {
      continue;
    }

    if (typeof val == 'object') {
      if (val.splice && val.length) {
        // Arrays
        for (var i = 0; i < val.length; i++) {
          pushKeyValue_(key, val[i]);
        }
      } else {
        // Objects
        hashArr.push(studio.hash.paramsToHash(val, keyPath_(key)));
      }
    } else {
      // All other values
      pushKeyValue_(key, val);
    }
  }

  return hashArr.join('&');
};


/**
 * This is needed due to what seems like a bug in Chrome where using drawImage
 * with any SVG, regardless of origin (even if it was loaded from a data URI),
 * marks the canvas's origin dirty flag, precluding us from accessing its pixel
 * data.
 */
var USE_CANVG = window.canvg && true;

/**
 * Represents a form field for image values.
 */
studio.forms.ImageField = studio.forms.Field.extend({
  constructor: function(id, params) {
    this.valueType_ = null;
    this.textParams_ = {};
    this.imageParams_ = {};
    this.spaceFormValues_ = {}; // cache
    this.base(id, params);
  },

  createUI: function(container) {
    var fieldUI = this.base(container);
    var fieldContainer = $('.form-field-container', fieldUI);

    var me = this;

    // Set up drag+drop on the entire field container
    fieldUI.addClass('form-field-drop-target');
    fieldUI.get(0).ondragenter = studio.forms.ImageField.makeDragenterHandler_(
      fieldUI);
    fieldUI.get(0).ondragleave = studio.forms.ImageField.makeDragleaveHandler_(
      fieldUI);
    fieldUI.get(0).ondragover = studio.forms.ImageField.makeDragoverHandler_(
      fieldUI);
    fieldUI.get(0).ondrop = studio.forms.ImageField.makeDropHandler_(fieldUI,
      function(evt) {
        me.loadFromFileList_(evt.dataTransfer.files, function(ret) {
          if (!ret)
            return;

          me.setValueType_('image');
          me.imageParams_ = ret;
          me.valueFilename_ = ret.name;
          me.renderValueAndNotifyChanged_();
        });
      });

    // Create radio buttons
    this.el_ = $('<div>')
      .attr('id', this.getHtmlId())
      .addClass('.form-field-buttonset')
      .appendTo(fieldContainer);

    var types = [
      'image', 'Image',
      'clipart', 'Clipart',
      'text', 'Text'
    ];
    var typeEls = {};

    for (var i = 0; i < types.length / 2; i++) {
      $('<input>')
        .attr({
          type: 'radio',
          name: this.getHtmlId(),
          id: this.getHtmlId() + '-' + types[i * 2],
          value: types[i * 2]
        })
        .appendTo(this.el_);
      typeEls[types[i * 2]] = $('<label>')
        .attr('for', this.getHtmlId() + '-' + types[i * 2])
        .text(types[i * 2 + 1])
        .appendTo(this.el_);
    }

    this.el_.buttonset();

    // Prepare UI for the 'image' type
    this.fileEl_ = $('<input>')
      .addClass('form-image-hidden-file-field')
      .attr({
        id: this.getHtmlId(),
        type: 'file',
        accept: 'image/*'
      })
      .change(function() {
        me.loadFromFileList_(me.fileEl_.get(0).files, function(ret) {
          if (!ret)
            return;

          me.setValueType_('image');
          me.imageParams_ = ret;
          me.valueFilename_ = ret.name;
          me.renderValueAndNotifyChanged_();
        });
      })
      .appendTo(this.el_);

    typeEls.image.click(function(evt) {
      me.fileEl_.trigger('click');
      me.setValueType_(null);
      me.renderValueAndNotifyChanged_();
      evt.preventDefault();
      return false;
    });

    // Prepare UI for the 'clipart' type
    var clipartParamsEl = $('<div>')
      .addClass('form-image-type-params form-image-type-params-clipart')
      .hide()
      .appendTo(this.el_);

    var clipartListEl = $('<div>')
      .addClass('form-image-clipart-list')
      .appendTo(clipartParamsEl);

    for (var i = 0; i < studio.forms.ImageField.clipartList_.length; i++) {
      var clipartSrc = 'res/clipart/' + studio.forms.ImageField.clipartList_[i];
      $('<img>')
        .addClass('form-image-clipart-item')
        .attr('src', clipartSrc)
        .click(function(clipartSrc) {
          return function() {
            me.loadClipart_(clipartSrc);
          };
        }(clipartSrc))
        .appendTo(clipartListEl);
    }

    var clipartAttributionEl = $('<div>')
      .addClass('form-image-clipart-attribution')
      .html([
          'Clipart courtesy of ',
          '<a href="http://www.yay.se/2011/02/',
              'native-android-icons-in-vector-format/"',
          ' target="_blank">Olof Brickarp</a>.'
        ].join(''))
      .appendTo(clipartParamsEl);

    typeEls.clipart.click(function(evt) {
      me.setValueType_('clipart');
      me.renderValueAndNotifyChanged_();
    });

    // Prepare UI for the 'text' type
    var textParamsEl = $('<div>')
      .addClass(
        'form-subform ' +
        'form-image-type-params ' +
        'form-image-type-params-text')
      .hide()
      .appendTo(this.el_);

    this.textForm_ = new studio.forms.Form(
      this.form_.id_ + '-' + this.id_ + '-textform', {
        onChange: function() {
          var values = me.textForm_.getValues();
          me.textParams_.text = values['text'];
          me.textParams_.fontStack = values['font']
              ? values['font'] : 'sans-serif';
          me.valueFilename_ = values['text'];
          me.renderValueAndNotifyChanged_();
        },
        fields: [
          new studio.forms.TextField('text', {
            title: 'Text',
          }),
          new studio.forms.AutocompleteTextField('font', {
            title: 'Font',
            items: studio.forms.ImageField.fontList_
          }),
        ]
      });
    this.textForm_.createUI(textParamsEl);

    typeEls.text.click(function(evt) {
      me.setValueType_('text');
      me.renderValueAndNotifyChanged_();
    });

    // Create spacing subform
    this.spaceFormValues_ = {};
    this.spaceForm_ = new studio.forms.Form(
      this.form_.id_ + '-' + this.id_ + '-spaceform', {
        onChange: function() {
          me.spaceFormValues_ = me.spaceForm_.getValues();
          me.renderValueAndNotifyChanged_();
        },
        fields: [
          new studio.forms.BooleanField('trim', {
            title: 'Trim',
            defaultValue: this.params_.defaultValueTrim || false,
            offText: 'Don\'t Trim',
            onText: 'Trim'
          }),
          new studio.forms.RangeField('pad', {
            title: 'Padding',
            defaultValue: 0,
            min: -0.1,
            max: 0.5, // 1/2 of min(width, height)
            step: 0.05,
            textFn: function(v) {
              return (v * 100) + '%';
            }
          }),
        ]
      });
    this.spaceForm_.createUI($('<div>')
      .addClass('form-subform')
      .appendTo(fieldContainer));
    this.spaceFormValues_ = this.spaceForm_.getValues();

    // Create image preview element
    this.imagePreview_ = $('<canvas>')
      .addClass('form-image-preview')
      .hide()
      .appendTo(fieldContainer.parent());
  },

  setValueType_: function(type) {
    this.valueType_ = type;
    $('label', this.el_).removeClass('ui-state-active');
    $('.form-image-type-params', this.el_).hide();
    if (type) {
      $('label[for=' + this.getHtmlId() + '-' + type + ']').addClass('ui-state-active');
      $('.form-image-type-params-' + type, this.el_).show();
    }
  },

  loadClipart_: function(clipartSrc) {
    var useCanvg = USE_CANVG && clipartSrc.match(/\.svg$/);

    $('img.form-image-clipart-item', this.el_).removeClass('selected');
    $('img[src="' + clipartSrc + '"]').addClass('selected');
    
    this.imageParams_ = {
      canvgSvgUri: useCanvg ? clipartSrc : null,
      uri: useCanvg ? null : clipartSrc
    };
    this.clipartSrc_ = clipartSrc;
    this.valueFilename_ = clipartSrc.match(/[^/]+$/)[0];
    this.renderValueAndNotifyChanged_();
  },

  loadFromFileList_: function(fileList, callback) {
    fileList = fileList || [];

    var me = this;

    var file = null;
    for (var i = 0; i < fileList.length; i++) {
      if (studio.forms.ImageField.isValidFile_(fileList[i])) {
        file = fileList[i];
        break;
      }
    }

    if (!file) {
      alert('Please choose a valid image file (PNG, JPG, GIF, SVG, etc.)');
      callback(null);
      return;
    }

    var useCanvg = USE_CANVG && file.type == 'image/svg+xml';

    var fileReader = new FileReader();

    // Closure to capture the file information.
    fileReader.onload = function(e) {
      callback({
        uri: useCanvg ? null : e.target.result,
        canvgSvgText: useCanvg ? e.target.result : null,
        name: file.name
      });
    };
    fileReader.onerror = function(e) {
      switch(e.target.error.code) {
        case e.target.error.NOT_FOUND_ERR:
          alert('File not found!');
          break;
        case e.target.error.NOT_READABLE_ERR:
          alert('File is not readable');
          break;
        case e.target.error.ABORT_ERR:
          break; // noop
        default:
          alert('An error occurred reading this file.');
      }
      callback(null);
    };
    /*fileReader.onprogress = function(e) {
      $('#read-progress').css('visibility', 'visible');
      // evt is an ProgressEvent.
      if (e.lengthComputable) {
        $('#read-progress').val(Math.round((e.loaded / e.total) * 100));
      } else {
        $('#read-progress').removeAttr('value');
      }
    };*/
    fileReader.onabort = function(e) {
      alert('File read cancelled');
      callback(null);
    };
    /*fileReader.onloadstart = function(e) {
      $('#read-progress').css('visibility', 'visible');
    };*/
    if (useCanvg)
      fileReader.readAsText(file);
    else
      fileReader.readAsDataURL(file);
  },

  clearValue: function() {
    this.valueType_ = null;
    this.valueFilename_ = null;
    this.valueCtx_ = null;
    this.fileEl_.val('');
    this.imagePreview_.hide();
  },

  getValue: function() {
    return {
      ctx: this.valueCtx_,
      name: this.valueFilename_
    };
  },

  // this function is asynchronous
  renderValueAndNotifyChanged_: function() {
    if (!this.valueType_) {
      this.valueCtx_ = null;
    }

    var me = this;

    // Render the base image (text, clipart, or image)
    switch (this.valueType_) {
      case 'image':
      case 'clipart':
        if (this.imageParams_.canvgSvgText || this.imageParams_.canvgSvgUri) {
          var canvas = document.createElement('canvas');
          var size = { w: 800, h: 800 };
          canvas.className = 'offscreen';
          canvas.width = size.w;
          canvas.height = size.h;
          document.body.appendChild(canvas);

          canvg(
            canvas,
            this.imageParams_.canvgSvgText ||
              this.imageParams_.canvgSvgUri,
            {
              scaleWidth: size.w,
              scaleHeight: size.h,
              ignoreMouse: true,
              ignoreAnimation: true,
              ignoreDimensions: true,
              ignoreClear: true
            }
          );
          continue_(canvas.getContext('2d'), size);

          document.body.removeChild(canvas);
        } else if (this.imageParams_.uri) {
          imagelib.loadFromUri(this.imageParams_.uri, function(img) {
            var size = {
              w: img.naturalWidth,
              h: img.naturalHeight
            };
            var ctx = imagelib.drawing.context(size);
            imagelib.drawing.copy(ctx, img, size);
            continue_(ctx, size);
          });
        }
        break;

      case 'text':
        var size = { w: 4000, h: 800 };
        var ctx = imagelib.drawing.context(size);
        var text = this.textParams_.text || '';

        ctx.fillStyle = '#000';
        ctx.font = 'bold ' + size.h + 'px/' + size.h + 'px ' +
                    (this.textParams_.fontStack || 'sans-serif');
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, 0, size.h);
        size.w = Math.min(ctx.measureText(text).width, size.w) || size.w;

        continue_(ctx, size);
        break;

      default:
        me.form_.notifyChanged_();
    }

    function continue_(srcCtx, srcSize) {
      // Apply trimming
      if (me.spaceFormValues_['trim']) {
        if (me.trimWorker_) {
          me.trimWorker_.terminate();
        }
        me.trimWorker_ = imagelib.drawing.getTrimRect(srcCtx, srcSize, 1,
            function(trimRect) {
              continue2_(srcCtx, srcSize, trimRect);
            });
      } else {
        continue2_(srcCtx, srcSize,
            /*trimRect*/{ x: 0, y: 0, w: srcSize.w, h: srcSize.h });
      }
    }

    function continue2_(srcCtx, srcSize, trimRect) {
      // If trimming, add a tiny bit of padding to fix artifacts around the
      // edges.
      var extraPadding = me.spaceFormValues_['trim'] ? 0.001 : 0;
      if (trimRect.x == 0 && trimRect.y == 0 &&
          trimRect.w == srcSize.w && trimRect.h == srcSize.h) {
        extraPadding = 0;
      }

      var padPx = ((me.spaceFormValues_['pad'] || 0) + extraPadding) *
                  Math.min(trimRect.w, trimRect.h);
      var targetRect = { x: padPx, y: padPx, w: trimRect.w, h: trimRect.h };

      var outCtx = imagelib.drawing.context({
        w: trimRect.w + padPx * 2,
        h: trimRect.h + padPx * 2
      });

      // TODO: replace with a simple draw() as the centering is useless
      imagelib.drawing.drawCenterInside(outCtx, srcCtx, targetRect, trimRect);

      // Set the final URI value and show a preview
      me.valueCtx_ = outCtx;

      if (me.imagePreview_) {
        me.imagePreview_.attr('width', outCtx.canvas.width);
        me.imagePreview_.attr('height', outCtx.canvas.height);

        var previewCtx = me.imagePreview_.get(0).getContext('2d');
        previewCtx.drawImage(outCtx.canvas, 0, 0);

        me.imagePreview_.show();
      }

      me.form_.notifyChanged_();
    }
  },

  serializeValue: function() {
    return {
      type: this.valueType_,
      space: this.spaceForm_.getValuesSerialized(),
      clipart: (this.valueType_ == 'clipart') ? this.clipartSrc_ : null,
      text: (this.valueType_ == 'text') ? this.textForm_.getValuesSerialized()
                                        : null
    };
  },

  deserializeValue: function(o) {
    if (o.type) {
      this.setValueType_(o.type);
    }
    if (o.space) {
      this.spaceForm_.setValuesSerialized(o.space);
      this.spaceFormValues_ = this.spaceForm_.getValues();
    }
    if (o.clipart && this.valueType_ == 'clipart') {
      this.loadClipart_(o.clipart);
    }
    if (o.text && this.valueType_ == 'text') {
      this.textForm_.setValuesSerialized(o.text);
    }
  }
});

studio.forms.ImageField.clipartList_ = [
  'icons/accounts.svg',
  'icons/add.svg',
  'icons/agenda.svg',
  'icons/all_friends.svg',
  'icons/attachment.svg',
  'icons/back.svg',
  'icons/backspace.svg',
  'icons/barcode.svg',
  'icons/battery_charging.svg',
  'icons/bell.svg',
  'icons/block.svg',
  'icons/block_user.svg',
  'icons/bookmarks.svg',
  'icons/camera.svg',
  'icons/circle_arrow.svg',
  'icons/clock.svg',
  'icons/compass.svg',
  'icons/cross.svg',
  'icons/cross2.svg',
  'icons/directions.svg',
  'icons/down_arrow.svg',
  'icons/edit.svg',
  'icons/expand_arrows.svg',
  'icons/export.svg',
  'icons/eye.svg',
  'icons/gallery.svg',
  'icons/group.svg',
  'icons/happy_droid.svg',
  'icons/help.svg',
  'icons/home.svg',
  'icons/info.svg',
  'icons/key.svg',
  'icons/list.svg',
  'icons/lock.svg',
  'icons/mail.svg',
  'icons/map.svg',
  'icons/map_pin.svg',
  'icons/mic.svg',
  'icons/notification.svg',
  'icons/phone.svg',
  'icons/play_clip.svg',
  'icons/plus.svg',
  'icons/position.svg',
  'icons/power.svg',
  'icons/refresh.svg',
  'icons/search.svg',
  'icons/settings.svg',
  'icons/share.svg',
  'icons/slideshow.svg',
  'icons/sort_by_size.svg',
  'icons/sound_full.svg',
  'icons/sound_off.svg',
  'icons/star.svg',
  'icons/stars_grade.svg',
  'icons/stop.svg',
  'icons/trashcan.svg',
  'icons/usb.svg',
  'icons/user.svg',
  'icons/warning.svg'
];

studio.forms.ImageField.fontList_ = [
  'Helvetica',
  'Arial',
  'Georgia',
  'Book Antiqua',
  'Palatino',
  'Courier',
  'Courier New',
  'Webdings',
  'Wingdings'
];


/**
 * Determines whether or not the given File is a valid value for the image.
 * 'File' here is a File using the W3C File API.
 * @private
 * @param {File} file Describe this parameter
 */
studio.forms.ImageField.isValidFile_ = function(file) {
  return !!file.type.toLowerCase().match(/^image\//);
};
/*studio.forms.ImageField.isValidFile_.allowedTypes = {
  'image/png': true,
  'image/jpeg': true,
  'image/svg+xml': true,
  'image/gif': true,
  'image/vnd.adobe.photoshop': true
};*/

studio.forms.ImageField.makeDropHandler_ = function(el, handler) {
  return function(evt) {
    $(el).removeClass('drag-hover');
    handler(evt);
  };
};

studio.forms.ImageField.makeDragoverHandler_ = function(el) {
  return function(evt) {
    el = $(el).get(0);
    if (el._studio_frm_dragtimeout_) {
      window.clearTimeout(el._studio_frm_dragtimeout_);
      el._studio_frm_dragtimeout_ = null;
    }
    evt.dataTransfer.dropEffect = 'link';
    evt.preventDefault();
  };
};

studio.forms.ImageField.makeDragenterHandler_ = function(el) {
  return function(evt) {
    el = $(el).get(0);
    if (el._studio_frm_dragtimeout_) {
      window.clearTimeout(el._studio_frm_dragtimeout_);
      el._studio_frm_dragtimeout_ = null;
    }
    $(el).addClass('drag-hover');
    evt.preventDefault();
  };
};

studio.forms.ImageField.makeDragleaveHandler_ = function(el) {
  return function(evt) {
    el = $(el).get(0);
    if (el._studio_frm_dragtimeout_)
      window.clearTimeout(el._studio_frm_dragtimeout_);
    el._studio_frm_dragtimeout_ = window.setTimeout(function() {
      $(el).removeClass('drag-hover');
    }, 100);
  };
};

studio.ui = {};

studio.ui.createImageOutputGroup = function(params) {
  return $('<div>')
    .addClass('out-image-group')
    .append($('<div>')
      .addClass('label')
      .text(params.label))
    .appendTo(params.container);
};


studio.ui.createImageOutputSlot = function(params) {
  return $('<div>')
    .addClass('out-image-block')
    .append($('<div>')
      .addClass('label')
      .text(params.label))
    .append($('<img>')
      .addClass('out-image')
      .attr('id', params.id))
    .appendTo(params.container);
};


studio.ui.drawImageGuideRects = function(ctx, size, guides) {
  guides = guides || [];

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size.w, size.h);
  ctx.globalAlpha = 1.0;

  var guideColors = studio.ui.drawImageGuideRects.guideColors_;

  for (var i = 0; i < guides.length; i++) {
    ctx.strokeStyle = guideColors[(i - 1) % guideColors.length];
    ctx.strokeRect(guides[i].x + 0.5, guides[i].y + 0.5, guides[i].w - 1, guides[i].h - 1);
  }

  ctx.restore();
};
studio.ui.drawImageGuideRects.guideColors_ = [
  '#f00'
];

studio.util = {};

studio.util.getMultBaseHdpi = function(density) {
  switch (density) {
    case 'xhdpi': return 1.333333;
    case  'hdpi': return 1.0;
    case  'mdpi': return 0.666667;
    case  'ldpi': return 0.5;
  }
  return 1.0;
};

studio.util.mult = function(s, mult) {
  var d = {};
  for (k in s) {
    d[k] = s[k] * mult;
  }
  return d;
};

studio.util.multRound = function(s, mult) {
  var d = {};
  for (k in s) {
    d[k] = Math.round(s[k] * mult);
  }
  return d;
};

studio.zip = {};

studio.zip.createDownloadifyZipButton = function(element, options) {
  // TODO: badly needs to be documented :-)

  var zipperHandle = {
    fileSpecs_: []
  };

  options = options || {};
  options.swf = options.swf || 'lib/downloadify/media/downloadify.swf';
  options.downloadImage = options.downloadImage ||
      'images/download-zip-button.png';
  options.width = options.width || 133;
  options.height = options.height || 30;
  options.dataType = 'base64';
  options.onError = options.onError || function() {
    if (zipperHandle.fileSpecs_.length)
      alert('There was an error downloading the .zip');
  };

  // Zip file data and filename generator functions.
  options.filename = function() {
    return zipperHandle.zipFilename_ || 'output.zip';
  };
  options.data = function() {
    if (!zipperHandle.fileSpecs_.length)
      return '';

    var zip = new JSZip();
    for (var i = 0; i < zipperHandle.fileSpecs_.length; i++) {
      var fileSpec = zipperHandle.fileSpecs_[i];
      if (fileSpec.base64data)
        zip.add(fileSpec.name, fileSpec.base64data, {base64:true});
      else if (fileSpec.textData)
        zip.add(fileSpec.name, fileSpec.textData);
    }
    return zip.generate();
  };

  var downloadifyHandle;
  if (window.Downloadify) {
    downloadifyHandle = Downloadify.create($(element).get(0), options);
  }
  //downloadifyHandle.disable();

  // Set up zipper control functions
  zipperHandle.setZipFilename = function(zipFilename) {
    zipperHandle.zipFilename_ = zipFilename;
  };
  zipperHandle.clear = function() {
    zipperHandle.fileSpecs_ = [];
    //downloadifyHandle.disable();
  };
  zipperHandle.add = function(spec) {
    zipperHandle.fileSpecs_.push(spec);
    //downloadifyHandle.enable();
  };

  return zipperHandle;
};

window.studio = studio;

})();

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
  initialize : function(matrix, divisor, bias) {
    this.r = (Math.sqrt(matrix.length) - 1) / 2;
    this.matrix = matrix;
    this.divisor = divisor;
    this.bias = bias;
  },
  apply : function(src, dst) {
    var w = src.width, h = src.height;
    var srcData = src.data;
    var dstData = dst.data;
    var di, si, idx;
    var r, g, b;

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

imagelib.drawing.getTrimRect = function(ctx, size, minAlpha) {
  if (!ctx.canvas) {
    // Likely an image
    var src = ctx;
    ctx = imagelib.drawing.context(size);
    imagelib.drawing.copy(ctx, src, size);
  }

  if (minAlpha == 0)
    return { x: 0, y: 0, w: size.w, h: size.h };

  minAlpha = minAlpha || 1;

  var l = size.w, t = size.h, r = 0, b = 0;

  var data = ctx.getImageData(0, 0, size.w, size.h).data;
  var alpha;
  for (var y = 0; y < size.h; y++) {
    for (var x = 0; x < size.w; x++) {
      alpha = data[((y * size.w + x) << 2) + 3];
      if (alpha > minAlpha) {
        l = Math.min(x, l);
        t = Math.min(y, t);
        r = Math.max(x, r);
        b = Math.max(y, b);
      }
    }
  }

  if (l > r)
    return { x: 0, y: 0, w: size.w, h: size.h }; // no pixels, couldn't trim

  return { x: l, y: t, w: r - l + 1, h: b - t + 1 };
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
    new ConvolutionFilter(matrix, total, 0),
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

  dstCtx.save();

  // Render outer effects
  for (var i = 0; i < outerEffects.length; i++) {
    var effect = outerEffects[i];

    tmpCtx.save();

    switch (effect.effect) {
      case 'outer-shadow':
        imagelib.drawing.clear(tmpCtx, size);
        imagelib.drawing.copyAsAlpha(tmpCtx, src.canvas || src, size);
        if (effect.blur)
          imagelib.drawing.blur(effect.blur, tmpCtx, size);
        imagelib.drawing.makeAlphaMask(tmpCtx, size, effect.color || '#000');
        if (effect.translate)
          tmpCtx.translate(effect.translate.x || 0, effect.translate.y || 0);

        dstCtx.globalAlpha = Math.max(0, Math.min(1, effect.opacity || 1));
        imagelib.drawing.copy(dstCtx, tmpCtx, size);
        break;
    }

    tmpCtx.restore();
  }

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

window.imagelib = imagelib;

})();

(function() {

var studio = {};

studio.checkBrowser = function() {
  var chromeMatch = navigator.userAgent.match(/Chrome\/(\d)/);
  var browserSupported = false;
  if (chromeMatch) {
    var chromeVersion = parseInt(chromeMatch[1], 10);
    if (chromeVersion >= 6) {
      browserSupported = true;
    }
  }

  if (!browserSupported) {
    $('<div>')
      .attr('title', 'Your browser is not supported.')
      .append($('<span class="ui-icon ui-icon-alert" ' +
                'style="float:left; margin:0 7px 50px 0;">'))
      .append($('<p>')
        .html('Currently only ' +
              '<a href="http://www.google.com/chrome">Chrome 6+</a> ' +
              'is supported. Your mileage may vary with other browsers.'))
      .dialog({
  			modal: true,
  			resizable: false,
  			buttons: {
      		'Close': function() {
            $(this).dialog('close');
    			}
			  }
  		});
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
            window.foo = self;
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
   * Returns the ID for the form's UI element (or container).
   * @type String
   */
  getHtmlId: function() {
    return '_frm-' + this.form_.id_ + '-' + this.id_;
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
            .text(this.params_.helpText))
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
          me.setValue($(inputEl).val());
          me.form_.notifyChanged_();
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

  setValue: function(val) {
    this.value_ = val;
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
        me.setValue('#' + hex);
        $('.form-color-preview', me.el_)
          .css('background-color', me.getValue().color);
        me.form_.notifyChanged_();
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
    				me.setAlpha(ui.value);
    				me.form_.notifyChanged_();
    			}
        })
        .appendTo(fieldContainer);
    }
  },

  getValue: function() {
    var color = this.value_ || this.params_.defaultValue || '#000000';
    if (/^([0-9a-f]{6}|[0-9a-f]{3})$/i.test(color))
      color = '#' + color;

    var alpha = this.alpha_;
    if (typeof alpha != 'number') {
      alpha = this.params_.defaultAlpha;
      if (typeof alpha != 'number')
        alpha = 100;
    }

    return { color: color, alpha: alpha };
  },

  setValue: function(val) {
    this.value_ = val;
  },

  setAlpha: function(val) {
    this.alpha_ = val;
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
            me.form_.notifyChanged_();
          })
          .appendTo(this.el_);
        $('<label>')
          .attr('for', this.getHtmlId() + '-' + option.id)
          .text(option.title)
          .appendTo(this.el_);
      }
      this.findAndSetValue(this.params_.defaultValue || this.params_.options[0].id);
      this.el_.buttonset();
    } else {
      this.el_ = $('<select>')
        .attr('id', this.getHtmlId())
        .change(function() {
          me.form_.notifyChanged_();
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
    return this.params_.buttons ? $('input:checked', this.el_).val()
                                : this.el_.val();
  },

  setValue: function(val) {
    this.findAndSetValue(val);
  },

  findAndSetValue: function(val) {
    // Note, this needs to be its own function because setValue gets
    // overridden in BooleanField
    if (this.params_.buttons) {
      $('input', this.el_).each(function(i, el) {
        $(el).attr('checked', $(el).val() == val);
      });
    } else {
      this.el_.val(val);
    }
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

  setValue: function(val) {
    this.base(val ? '1' : '0');
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
        range: 'min',
        value: this.getValue(),
  			slide: function(evt, ui) {
  				me.setValue(ui.value);
  				me.form_.notifyChanged_();
  			}
      })
      .appendTo(fieldContainer);
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

  setValue: function(val) {
    this.value_ = val;
  }
});


/**
 * Represents a form field for image values.
 */
studio.forms.ImageField = studio.forms.Field.extend({
  constructor: function(id, params) {
    this.valueType_ = null;
    this.textParams_ = {};
    this.imageParams_ = {};
    this.trimFormValues_ = {};
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
            $('img', clipartParamsEl).removeClass('selected');
            $(this).addClass('selected');
            me.imageParams_ = {svgUri: clipartSrc};
            me.valueFilename_ = clipartSrc.match(/[^/]+$/)[0];
            me.renderValueAndNotifyChanged_();
          };
        }(clipartSrc))
        .appendTo(clipartListEl);
    }

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

    var fontOptions = [];
    for (var i = 0; i < studio.forms.ImageField.fontList_.length; i++) {
      fontOptions.push({
        id: i + 1,
        title: studio.forms.ImageField.fontList_[i].title
      });
    }

    this.textForm_ = new studio.forms.Form(
      this.form_.id_ + '-' + this.id_ + '-textform', {
        onChange: function() {
          var values = me.textForm_.getValues();
          me.textParams_.text = values['text'];
          me.textParams_.fontStack = values['font']
              ? studio.forms.ImageField.fontList_[values['font'] - 1].stack
              : 'sans-serif';
          me.valueFilename_ = values['text'];
          me.renderValueAndNotifyChanged_();
        },
        fields: [
          new studio.forms.TextField('text', {
            title: 'Text',
          }),
          new studio.forms.EnumField('font', {
            title: 'Font',
            options: fontOptions
          }),
        ]
      });
    this.textForm_.createUI(textParamsEl);

    typeEls.text.click(function(evt) {
      me.setValueType_('text');
      me.renderValueAndNotifyChanged_();
    });

    // Create trim subform
    this.trimFormValues_ = {};
    this.trimForm_ = new studio.forms.Form(
      this.form_.id_ + '-' + this.id_ + '-trimform', {
        onChange: function() {
          me.trimFormValues_ = me.trimForm_.getValues();
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
            min: 0,
            max: 15
          }),
        ]
      });
    this.trimForm_.createUI($('<div>')
      .addClass('form-subform')
      .appendTo(fieldContainer));
    this.trimFormValues_ = this.trimForm_.getValues();

    // Create image preview element
    this.imagePreview_ = $('<img>')
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
      alert('Please choose a valid image file (PNG, JPG, GIF, SVG, PSD, etc.)');
      callback(null);
      return;
    }

    var svgHack = false;
    if (file.type == 'image/svg+xml' && window.canvg)
      svgHack = true;

    var fileReader = new FileReader();

    // Closure to capture the file information.
    fileReader.onload = function(e) {
      callback({
        uri: svgHack ? null : e.target.result,
        svgText: svgHack ? e.target.result : null,
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
    if (svgHack)
      fileReader.readAsText(file);
    else
      fileReader.readAsDataURL(file);
  },

  clearValue: function() {
    this.valueType_ = null;
    this.valueFilename_ = null;
    this.valueUri_ = null;
    this.fileEl_.val('');
    this.imagePreview_.hide();
  },

  getValue: function() {
    return {
      uri: this.valueUri_,
      name: this.valueFilename_
    };
  },

  // this function is asynchronous
  renderValueAndNotifyChanged_: function() {
    if (!this.valueType_) {
      this.valueUri_ = null;
    }

    var me = this;

    // Render the base image (text, clipart, or image)
    switch (this.valueType_) {
      case 'image':
      case 'clipart':
        if (this.imageParams_.svgText || this.imageParams_.svgUri) {
          var canvas = document.createElement('canvas');
          canvas.className = 'offscreen';
          canvas.style.width = '480px';
          canvas.style.height = '480px';
          document.body.appendChild(canvas);

          canvg(canvas, this.imageParams_.svgText || this.imageParams_.svgUri,
              {ignoreMouse: true, ignoreAnimation: true});
          continue_(canvas.getContext('2d'), { w: 480, h: 480 });

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
        var size = { w: 3000, h: 480 };
        var ctx = imagelib.drawing.context(size);
        var text = this.textParams_.text || '';

        ctx.fillStyle = '#000';
        ctx.font = 'bold 480px/480px ' + (this.textParams_.fontStack ||
                                          'sans-serif');
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, 0, 480);
        size.w = ctx.measureText(text).width || 480;

        continue_(ctx, size);
        break;
    }

    function continue_(srcCtx, srcSize) {
      // Apply trimming
      var trimRect = { x: 0, y: 0, w: srcSize.w, h: srcSize.h };
      if (me.trimFormValues_['trim']) {
        trimRect = imagelib.drawing.getTrimRect(srcCtx, srcSize);
      }

      var padPx = (me.trimFormValues_['pad'] || 0) * 10;
      var targetRect = { x: padPx, y: padPx, w: trimRect.w, h: trimRect.h };
      var outCtx = imagelib.drawing.context({
        w: trimRect.w + padPx * 2,
        h: trimRect.h + padPx * 2
      });

      // TODO: replace with a simple draw() as the centering is useless
      imagelib.drawing.drawCenterInside(outCtx, srcCtx, targetRect, trimRect);

      // Set the final URI value and show a preview
      me.valueUri_ = outCtx.canvas.toDataURL();

      if (me.imagePreview_) {
        me.imagePreview_.attr('src', me.valueUri_);
        me.imagePreview_.show();
      }

      me.form_.notifyChanged_();
    }
  }
});

studio.forms.ImageField.clipartList_ = [
  'icons/add.svg',
  'icons/back.svg',
  'icons/block.svg',
  'icons/camera.svg',
  'icons/edit.svg',
  'icons/export.svg',
  'icons/home.svg',
  'icons/map_pin.svg',
  'icons/mylocation.svg',
  'icons/play_clip.svg',
  'icons/refresh.svg',
  'icons/search.svg',
  'icons/share.svg',
  'icons/sort_by_size.svg',
  'icons/star.svg',
  'icons/stop.svg'
];

studio.forms.ImageField.fontList_ = [
  { title: 'Helvetica / Arial', stack: 'helvetica, arial, sans-serif' },
  { title: 'Georgia', stack: 'georgia, serif' },
  { title: 'Book Antiqua / Palatino',
    stack: '"Book Antiqua", palatino, "Palatino Linotype", serif' },
  { title: 'Courier', stack: 'courier, monospace' },
  { title: 'Courier New', stack: '"Courier New", monospace' },
  { title: 'Webdings', stack: '"Webdings"' },
  { title: 'Wingdings', stack: '"Wingdings"' },
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

studio.ui.createImageOutputSlot = function(params) {
  $('<div>')
    .addClass('out-image-container')
    .append($('<div>')
      .text(params.label))
    .append($('<img>')
      .attr('id', params.id))
    .appendTo(params.container);
};

window.studio = studio;

})();

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

//#REQUIRE "fields.js"

/**
 * Represents a form field for image values.
 */
studio.forms.ImageField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));

    var me = this;

    // Set up drag+drop on the entire field container
    fieldContainer.addClass('form-image-drop-target');
    fieldContainer.get(0).ondragenter = studio.forms.ImageField.dragenterHandler_;
    fieldContainer.get(0).ondragleave = studio.forms.ImageField.dragleaveHandler_;
    fieldContainer.get(0).ondragover = studio.forms.ImageField.dragoverHandler_;
    fieldContainer.get(0).ondrop = studio.forms.ImageField.makeDropHandler_(function(evt) {
      if (me.loadFromFileList_(evt.dataTransfer.files)) {
        me.setTypeUI_('image');
      }
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
        if (me.loadFromFileList_(me.fileEl_.get(0).files))
          me.setTypeUI_('image');
      })
      .appendTo(this.el_);

    typeEls.image.click(function(evt) {
      me.fileEl_.trigger('click');
      me.setTypeUI_(null);
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

            var canvas = document.createElement('canvas');
            canvas.className = 'offscreen';
            canvas.style.width = '300px';
            canvas.style.height = '300px';
            document.body.appendChild(canvas);

            canvg(canvas, clipartSrc, {ignoreMouse: true, ignoreAnimation: true});
            me.setValueImageUri(canvas.toDataURL());

            document.body.removeChild(canvas);

            me.form_.notifyChanged_();
          };
        }(clipartSrc))
        .appendTo(clipartListEl);
    }

    typeEls.clipart.click(function(evt) {
      me.setTypeUI_('clipart');
    });

    // Prepare UI for the 'text' type
    var textParamsEl = $('<div>')
      .addClass('form-image-type-params form-image-type-params-text')
      .hide()
      .appendTo(this.el_);

    $('<input>')
      .addClass('form-image-clipart-item')
      .attr('type', 'text')
      .keyup(function(clipartSrc) {
        return function() {
          var canvas = document.createElement('canvas');
          canvas.className = 'offscreen';
          canvas.style.width = '300px';
          canvas.style.height = '100px';
          document.body.appendChild(canvas);

          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#000';
          ctx.font = 'bold 100px/100px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText($(this).val(), 150, 100);
          me.setValueImageUri(canvas.toDataURL());

          document.body.removeChild(canvas);

          me.form_.notifyChanged_();
        };
      }(clipartSrc))
      .appendTo(textParamsEl);

    typeEls.text.click(function(evt) {
      me.setTypeUI_('text');
    });

    // Create image preview element
    this.imagePreview_ = $('<img>')
      .addClass('form-image-preview')
      .hide()
      .appendTo(fieldContainer);
  },

  setTypeUI_: function(type) {
    $('label', this.el_).removeClass('ui-state-active');
    $('.form-image-type-params', this.el_).hide();
    if (type) {
      $('label[for=' + this.getHtmlId() + '-' + type + ']').addClass('ui-state-active');
      $('.form-image-type-params-' + type, this.el_).show();
    }
  },

  loadFromFileList_: function(fileList) {
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
      this.clearValue();
      this.form_.notifyChanged_();
      alert('Please choose a valid image file (PNG, JPG, GIF, SVG, PSD, etc.)');
      return false;
    }

    var svgHack = false;
    if (file.type == 'image/svg+xml' && window.canvg)
      svgHack = true;

    var fileReader = new FileReader();

    // Closure to capture the file information.
    fileReader.onload = function(e) {
      if (svgHack) {
        var canvas = document.createElement('canvas');
        canvas.className = 'offscreen';
        canvas.style.width = '300px';
        canvas.style.height = '300px';
        document.body.appendChild(canvas);

        canvg(canvas, e.target.result, {ignoreMouse: true, ignoreAnimation: true});
        me.setValueImageUri(canvas.toDataURL());

        document.body.removeChild(canvas);
      } else {
        me.setValueImageUri(e.target.result);
      }
      me.form_.notifyChanged_();
    };
    fileReader.onerror = function(e) {
      me.clearValue();
      me.form_.notifyChanged_();
      switch(e.target.error.code) {
        case e.target.error.NOT_FOUND_ERR:
          alert('File Not Found!');
          break;
        case e.target.error.NOT_READABLE_ERR:
          alert('File is not readable');
          break;
        case e.target.error.ABORT_ERR:
          break; // noop
        default:
          alert('An error occurred reading this file.');
      }
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
      me.clearValue();
      me.form_.notifyChanged_();
      alert('File read cancelled');
    };
    /*fileReader.onloadstart = function(e) {
      $('#read-progress').css('visibility', 'visible');
    };*/
    if (svgHack)
      fileReader.readAsText(file);
    else
      fileReader.readAsDataURL(file);

    return true;
  },

  clearValue: function() {
    this.valueImageUri_ = null;
    this.fileEl_.val('');
    this.imagePreview_.hide();
  },

  getValue: function() {
    return this.valueImageUri_;
  },

  setValueImageUri: function(uri) {
    this.valueImageUri_ = uri;
    if (this.imagePreview_) {
      this.imagePreview_.attr('src', uri);
      this.imagePreview_.show();
    }
  }
});

studio.forms.ImageField.clipartList_ = [
  'icons/home.svg',
  'icons/map_pin.svg',
  'icons/refresh.svg',
  'icons/search.svg',
  'icons/share.svg',
  'icons/export.svg'
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

studio.forms.ImageField.makeDropHandler_ = function(handler) {
  return function(evt) {
    $(this).removeClass('drag-hover');
    handler(evt);
  };
};

studio.forms.ImageField.dragoverHandler_ = function(evt) {
  evt.dataTransfer.dropEffect = 'link';
  evt.preventDefault();
};

studio.forms.ImageField.dragenterHandler_ = function(evt) {
  $(this).addClass('drag-hover');
  evt.preventDefault();
};

studio.forms.ImageField.dragleaveHandler_ = function(evt) {
  $(this).removeClass('drag-hover');
};

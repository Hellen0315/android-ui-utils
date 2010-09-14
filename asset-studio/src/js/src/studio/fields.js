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

//#REQUIRE "forms.js"

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
      )
      .append(
        $('<div>')
          .addClass('form-field-container')
      )
      .appendTo(container);
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
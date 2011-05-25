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
    var p = pairs[i].split('=');
    var key = p[0] ? decodeURIComponent(p[0]) : p[0];
    var val = p[1] ? decodeURIComponent(p[1]) : p[1];
    if (val === '0')
      val = 0;
    if (val === '1')
      val = 1;
    if (key in params) {
      // Handle array values.
      if (params[key] && 'push' in params[key]) {
        params[key].push(val);
      } else {
        params[key] = [params[key], val];
      }
    } else {
      params[key] = val;
    }
  }

  return params;
}

studio.hash.paramsToHash = function(params) {
  var hashArr = [];

  for (var key in params) {
    var val = params[key];
    if (val === undefined || val === null) {
      continue;
    }

    if (typeof val === 'object' &&
        'split' in val &&
        'splice' in val &&
        val.length) {
      for (var i = 0; i < val.length; i++) {
        var subVal = val[i];
        if (subVal === false) subVal = 0;
        if (subVal === true) subVal = 1;
        hashArr.push(encodeURIComponent(key) + '=' +
                     encodeURIComponent(subVal.toString()));
      }
    } else {
      if (val === false) val = 0;
      if (val === true) val = 1;
      hashArr.push(encodeURIComponent(key) + '=' +
                   encodeURIComponent(val.toString()));
    }
  }

  return hashArr.join('&');
}

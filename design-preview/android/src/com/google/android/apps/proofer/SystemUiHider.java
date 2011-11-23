/*
 * Copyright 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.google.android.apps.proofer;

import android.os.Handler;
import android.view.View;

public class SystemUiHider {
    private int HIDE_DELAY_MILLIS = 2000;

    private Handler mHandler;
    private View mView;

    public SystemUiHider(View view) {
        mView = view;
    }

    public void setup() {
        hideSystemUi();

        mHandler = new Handler();
        mView.setOnSystemUiVisibilityChangeListener(new View.OnSystemUiVisibilityChangeListener() {
            @Override
            public void onSystemUiVisibilityChange(int visibility) {
                if (visibility != View.SYSTEM_UI_FLAG_HIDE_NAVIGATION) {
                    delay();
                }
            }
        });
    }

    private void hideSystemUi() {
        mView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_HIDE_NAVIGATION);
    }

    private Runnable mHideRunnable = new Runnable() {
        public void run() {
            hideSystemUi();
        }
    };

    public void delay() {
        mHandler.removeCallbacks(mHideRunnable);
        mHandler.postDelayed(mHideRunnable, HIDE_DELAY_MILLIS);
    }
}

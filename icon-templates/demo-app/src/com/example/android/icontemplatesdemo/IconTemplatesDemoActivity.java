/*
 * Copyright (C) 2010 The Android Open Source Project
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

package com.example.android.icontemplatesdemo;

import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.TabActivity;
import android.content.DialogInterface;
import android.content.DialogInterface.OnClickListener;
import android.content.Intent;
import android.content.res.Resources;
import android.os.Bundle;
import android.view.Menu;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemClickListener;
import android.widget.AdapterView.OnItemLongClickListener;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.ListView;
import android.widget.TabHost;
import android.widget.TabHost.TabContentFactory;
import android.widget.TextView;

/**
 * Demonstrates the various icon templates.
 */
public class IconTemplatesDemoActivity extends TabActivity implements TabContentFactory {
    private static final String[] STRINGS = new String[]{ "Foo", "Bar", "Baz" };

    @Override
    protected void onCreate(Bundle icicle) {
        super.onCreate(icicle);
        setContentView(R.layout.activity_icon_templates_demo);

        final Resources res = getResources();
        final TabHost tabHost = getTabHost();
        tabHost.addTab(tabHost.newTabSpec("1")
                .setIndicator(STRINGS[0], res.getDrawable(R.drawable.ic_tab_template))
                .setContent(this));
        tabHost.addTab(tabHost.newTabSpec("2")
                .setIndicator(STRINGS[1], res.getDrawable(R.drawable.ic_tab_template))
                .setContent(this));
        tabHost.addTab(tabHost.newTabSpec("3")
                .setIndicator(STRINGS[2], res.getDrawable(R.drawable.ic_tab_template))
                .setContent(this));
        tabHost.setCurrentTab(0);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        menu.add(Menu.NONE, Menu.NONE, Menu.NONE, STRINGS[0]).setIcon(R.drawable.ic_menu_template);
        menu.add(Menu.NONE, Menu.NONE, Menu.NONE, STRINGS[1]).setIcon(R.drawable.ic_menu_template);
        menu.add(Menu.NONE, Menu.NONE, Menu.NONE, STRINGS[2]).setIcon(R.drawable.ic_menu_template);
        return super.onCreateOptionsMenu(menu);
    }

    public View createTabContent(String tag) {
        if (tag.equals("1")) {
            final ListView lv = new ListView(this);
            lv.setAdapter(new ArrayAdapter<String>(this, -1, android.R.id.text1, STRINGS) {
               @Override
                public View getView(int position, View convertView, ViewGroup parent) {
                    if (convertView == null) {
                        convertView = getLayoutInflater().inflate(
                                R.layout.list_item_icon_templates_demo, null);
                    }

                    ((ImageView) convertView.findViewById(android.R.id.icon))
                            .setImageResource(R.drawable.ic_list_template);
                    ((TextView) convertView.findViewById(android.R.id.text1))
                            .setText(STRINGS[position]);
                    return convertView;
                } 
            });
            lv.setOnItemClickListener(new OnItemClickListener() {
                public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                    final PendingIntent pi = PendingIntent.getActivity(
                            IconTemplatesDemoActivity.this, 1,
                            new Intent(IconTemplatesDemoActivity.this,
                                    IconTemplatesDemoActivity.class),
                            0);
                    
                    final Notification n = new Notification();
                    n.defaults = Notification.DEFAULT_ALL;
                    n.icon = R.drawable.ic_stat_notify_template;
                    n.tickerText = "Test notification";
                    n.setLatestEventInfo(IconTemplatesDemoActivity.this,
                            "Test notification", "Test notification", pi);

                    final NotificationManager nm = (NotificationManager)
                            getSystemService(NOTIFICATION_SERVICE);
                    nm.notify(1, n);

                    new AlertDialog.Builder(IconTemplatesDemoActivity.this)
                            .setMessage("Test dialog")
                            .setIcon(R.drawable.ic_dialog_template)
                            .setTitle("Test dialog")
                            .setPositiveButton("Close", new OnClickListener() {
                                public void onClick(DialogInterface dialog, int which) {}
                            })
                            .show();
                }
            });
            lv.setOnItemLongClickListener(new OnItemLongClickListener() {
                public boolean onItemLongClick(AdapterView<?> arg0, View arg1, int arg2,
                        long arg3) {
                    return false;
                }
            });
            return lv;
        } else {
            return new View(this);
        }
    }
}

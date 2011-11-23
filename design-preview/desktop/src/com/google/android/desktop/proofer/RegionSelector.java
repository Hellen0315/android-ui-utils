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

package com.google.android.desktop.proofer;

import com.sun.awt.AWTUtilities;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Frame;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.GraphicsConfiguration;
import java.awt.GraphicsDevice;
import java.awt.GraphicsEnvironment;
import java.awt.Paint;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.Stroke;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionListener;
import java.awt.font.LineMetrics;
import java.awt.geom.Rectangle2D;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Properties;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import javax.swing.JFrame;

public class RegionSelector {
    private JFrame parentFrame;
    private JRegionSelectorFrame frame;

    private Rectangle region = new Rectangle(100, 100, 480, 800);
    private RegionChangeCallback regionChangeCallback;

    public static interface RegionChangeCallback {
        public void onRegionChanged(Rectangle region);
    }

    public RegionSelector(RegionChangeCallback regionChangeCallback) {
        this.regionChangeCallback = regionChangeCallback;
        setupUI();
    }

    private void setupUI() {
        // http://java.sun.com/developer/technicalArticles/GUI/translucent_shaped_windows/

        if (AWTUtilities.isTranslucencySupported(AWTUtilities.Translucency.TRANSLUCENT)) {
            //perform translucency operations here

            GraphicsEnvironment env =
                    GraphicsEnvironment.getLocalGraphicsEnvironment();
            GraphicsDevice[] devices = env.getScreenDevices();
            GraphicsConfiguration translucencyCapableGC = null;
            for (int i = 0; i < devices.length && translucencyCapableGC == null; i++) {
                GraphicsConfiguration[] configs = devices[i].getConfigurations();
                for (int j = 0; j < configs.length && translucencyCapableGC == null; j++) {
                    if (AWTUtilities.isTranslucencyCapable(configs[j])) {
                        translucencyCapableGC = configs[j];
                    }
                }
            }

            frame = new JRegionSelectorFrame(translucencyCapableGC);
            frame.setUndecorated(true);
            AWTUtilities.setWindowOpaque(frame, false);
        } else {
            frame = new JRegionSelectorFrame(null);
            frame.setUndecorated(true);
        }

        frame.setAlwaysOnTop(true);
        frame.setBounds(region);
        tryLoadFrameConfig();

        frame.setResizable(true);
        setRegion(frame.getBounds());
    }

    public void showWindow(boolean show) {
        frame.setVisible(show);
    }

    public void toggleWindow() {
        frame.setVisible(!frame.isVisible());
    }

    public Rectangle getRegion() {
        return region;
    }

    private void setRegion(Rectangle region) {
        this.region = region;
        if (regionChangeCallback != null) {
            regionChangeCallback.onRegionChanged(this.region);
        }
    }

    public void requestSize(int width, int height) {
        this.region.width = width;
        this.region.height = height;
        frame.setSize(width, height);
    }

    void trySaveFrameConfig() {
        try {
            Properties props = new Properties();
            props.setProperty("x", String.valueOf(frame.getX()));
            props.setProperty("y", String.valueOf(frame.getY()));
            props.storeToXML(new FileOutputStream(
                    new File(Util.getCacheDirectory(), "region.xml")), null);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private final ScheduledExecutorService worker = Executors.newSingleThreadScheduledExecutor();

    private Runnable saveFrameConfigRunnable = new Runnable() {
        @Override
        public void run() {
            trySaveFrameConfig();
        }
    };

    private ScheduledFuture<?> saveFrameConfigScheduleHandle;

    void delayedTrySaveFrameConfig() {
        if (saveFrameConfigScheduleHandle != null) {
            saveFrameConfigScheduleHandle.cancel(false);
        }

        saveFrameConfigScheduleHandle = worker
                .schedule(saveFrameConfigRunnable, 1, TimeUnit.SECONDS);
    }

    void tryLoadFrameConfig() {
        try {
            Properties props = new Properties();
            props.loadFromXML(
                    new FileInputStream(new File(Util.getCacheDirectory(), "region.xml")));
            frame.setLocation(
                    Integer.parseInt(props.getProperty("x", String.valueOf(frame.getX()))),
                    Integer.parseInt(props.getProperty("y", String.valueOf(frame.getY()))));
        } catch (FileNotFoundException e) {
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private class JRegionSelectorFrame extends Frame implements MouseListener, MouseMotionListener,
            KeyListener {
        private Paint strokePaint;
        private Paint fillPaint;
        private Stroke stroke;
        private Font font;

        private Point startDragPoint;
        private Point startLocation;

        private JRegionSelectorFrame(GraphicsConfiguration graphicsConfiguration) {
            super(graphicsConfiguration);
            fillPaint = new Color(0, 0, 0, 32);
            strokePaint = new Color(255, 0, 0, 128);
            stroke = new BasicStroke(5, BasicStroke.CAP_SQUARE, BasicStroke.JOIN_MITER);
            font = new Font(Font.DIALOG, Font.BOLD, 30);

            addMouseListener(this);
            addMouseMotionListener(this);
            addKeyListener(this);
        }

        @Override
        public void paint(Graphics graphics) {
            if (graphics instanceof Graphics2D) {
                Graphics2D g2d = (Graphics2D) graphics;
                g2d.setPaint(fillPaint);
                g2d.fillRect(0, 0, getWidth(), getHeight());

                g2d.setPaint(strokePaint);
                g2d.setStroke(stroke);
                g2d.drawRect(0, 0, getWidth() - 1, getHeight() - 1);

                g2d.setFont(font);
                String s = getWidth() + " x " + getHeight();
                Rectangle2D r = font.getStringBounds(s, g2d.getFontRenderContext());
                g2d.drawString(s, (int) (getWidth() - r.getWidth()) / 2, getHeight() / 2);

                int offsY = (int) r.getHeight();
                s = "(Double-click or ESC to hide)";
                r = font.getStringBounds(s, g2d.getFontRenderContext());
                g2d.drawString(s, (int) (getWidth() - r.getWidth()) / 2, getHeight() / 2 + offsY);
            } else {
                super.paint(graphics);
            }
        }

        // http://www.java2s.com/Tutorial/Java/0240__Swing/Dragandmoveaframefromitscontentarea.htm

        public void mousePressed(MouseEvent mouseEvent) {
            startDragPoint = getScreenLocation(mouseEvent);
            startLocation = getLocation();

            if (mouseEvent.getClickCount() == 2) {
                showWindow(false);
            }
        }

        public void mouseDragged(MouseEvent mouseEvent) {
            Point current = getScreenLocation(mouseEvent);
            Point offset = new Point(
                    (int) current.getX() - (int) startDragPoint.getX(),
                    (int) current.getY() - (int) startDragPoint.getY());
            Point newLocation = new Point(
                    (int) (startLocation.getX() + offset.getX()),
                    (int) (startLocation.getY() + offset.getY()));
            setLocation(newLocation);
            setRegion(getBounds());

            delayedTrySaveFrameConfig();
        }

        private Point getScreenLocation(MouseEvent e) {
            Point cursor = e.getPoint();
            Point targetLocation = getLocationOnScreen();
            return new Point(
                    (int) (targetLocation.getX() + cursor.getX()),
                    (int) (targetLocation.getY() + cursor.getY()));
        }

        public void mouseMoved(MouseEvent mouseEvent) {
        }

        public void mouseClicked(MouseEvent mouseEvent) {
        }

        public void mouseReleased(MouseEvent mouseEvent) {
        }

        public void mouseEntered(MouseEvent mouseEvent) {
        }

        public void mouseExited(MouseEvent mouseEvent) {
        }

        public void keyTyped(KeyEvent keyEvent) {
        }

        public void keyPressed(KeyEvent keyEvent) {
            if (keyEvent.getKeyCode() == KeyEvent.VK_ESCAPE) {
                showWindow(false);
                return;
            }

            Point newLocation = getLocation();

            int val = keyEvent.isShiftDown() ? 10 : 1;

            switch (keyEvent.getKeyCode()) {
                case KeyEvent.VK_UP:
                    newLocation.y -= val;
                    break;
                case KeyEvent.VK_LEFT:
                    newLocation.x -= val;
                    break;
                case KeyEvent.VK_DOWN:
                    newLocation.y += val;
                    break;
                case KeyEvent.VK_RIGHT:
                    newLocation.x += val;
                    break;
                default:
                    return;
            }

            setLocation(newLocation);
            setRegion(getBounds());

            delayedTrySaveFrameConfig();
        }

        public void keyReleased(KeyEvent keyEvent) {
        }
    }
}

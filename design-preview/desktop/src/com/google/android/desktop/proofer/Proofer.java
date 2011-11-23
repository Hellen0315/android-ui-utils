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

import java.awt.AWTException;
import java.awt.Dimension;
import java.awt.Rectangle;
import java.awt.Robot;
import java.awt.Toolkit;
import java.awt.image.BufferedImage;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.File;
import java.io.IOException;
import java.net.Socket;

import javax.imageio.ImageIO;

public class Proofer {
    private boolean debug = Util.isDebug();

    private AdbRunner adbRunner;
    private ProoferClient client;

    private State state = State.Unknown;
    private ProoferCallbacks prooferCallbacks;

    public static interface ProoferCallbacks {
        public void onStateChange(State newState);

        public void onRequestedSizeChanged(int width, int height);
    }

    public static enum State {
        ConnectedActive,
        ConnectedIdle,
        Disconnected,
        Unknown,
    }

    public Proofer(ProoferCallbacks prooferCallbacks) {
        this.adbRunner = new AdbRunner();
        this.client = new ProoferClient();
        this.prooferCallbacks = prooferCallbacks;
    }

    public void startConnectionLoop() {
        new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        client.connectAndWaitForRequests();
                    } catch (CannotConnectException e) {
                        // Can't connect to device, try re-setting up port forwarding.
                        // If no devices are connected, this will fail.
                        try {
                            setupPortForwarding();
                        } catch (ProoferException e2) {
                            // If we get an error here, we're disconnected.
                            updateState(State.Disconnected);
                        }
                    }

                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException e) {
                        break;
                    }
                }
            }
        }).start();
    }

    public void runAndroidApp() throws ProoferException {
        adbRunner.adb(new String[]{
                "shell", "am", "start",
                "-a", "android.intent.action.MAIN",
                "-c", "android.intent.category.LAUNCHER",
                "-n", Config.ANDROID_APP_PACKAGE_NAME + "/.DesktopViewerActivity"
        });
    }

    public void killAndroidApp() throws ProoferException {
        adbRunner.adb(new String[]{
                "shell", "am", "force-stop",
                Config.ANDROID_APP_PACKAGE_NAME
        });
    }

    public void uninstallAndroidApp() throws ProoferException {
        adbRunner.adb(new String[]{
                "uninstall", Config.ANDROID_APP_PACKAGE_NAME
        });
    }

    public void installAndroidApp(boolean force) throws ProoferException {
        if (force || !isAndroidAppInstalled()) {
            File apkPath = new File(Util.getCacheDirectory(), "Proofer.apk");
            if (Util.extractResource("assets/Proofer.apk", apkPath)) {
                adbRunner.adb(new String[]{
                        "install", "-r", apkPath.toString()
                });
            } else {
                throw new ProoferException("Error extracting Android APK.");
            }
        }
    }

    public void setupPortForwarding() throws ProoferException {
        try {
            adbRunner.adb(new String[]{
                    "forward", "tcp:" + Config.PORT_LOCAL, "tcp:" + Config.PORT_DEVICE
            });
        } catch (ProoferException e) {
            throw new ProoferException("Couldn't automatically setup port forwarding. "
                    + "You'll need to "
                    + "manually run "
                    + "\"adb forward tcp:" + Config.PORT_LOCAL + " "
                    + "tcp:" + Config.PORT_DEVICE + "\" "
                    + "on the command line.", e);
        }
    }

    public boolean isAndroidAppInstalled() throws ProoferException {
        String out = adbRunner.adb(new String[]{
                "shell", "pm", "list", "packages"
        });
        return out.contains(Config.ANDROID_APP_PACKAGE_NAME);
    }

    public void setRequestedRegion(Rectangle region) {
        client.setRequestedRegion(region);
    }

    public State getState() {
        return state;
    }

    private void updateState(State newState) {
        if (this.state != newState && debug) {
            switch (newState) {
                case ConnectedActive:
                    System.out.println("State: Connected and active");
                    break;
                case ConnectedIdle:
                    System.out.println("State: Connected and idle");
                    break;
                case Disconnected:
                    System.out.println("State: Disconnected");
                    break;
            }
        }

        if (this.state != newState && prooferCallbacks != null) {
            prooferCallbacks.onStateChange(newState);
        }

        this.state = newState;
    }

    public static class CannotConnectException extends ProoferException {
        public CannotConnectException(Throwable throwable) {
            super(throwable);
        }
    }

    public class ProoferClient {
        private Rectangle requestedRegion = new Rectangle(0, 0, 0, 0);
        private Robot robot;
        private Dimension screenSize;

        private int curWidth = 0;
        private int curHeight = 0;

        public ProoferClient() {
            try {
                this.robot = new Robot();
            } catch (AWTException e) {
                System.err.println("Error getting robot.");
                e.printStackTrace();
                System.exit(1);
            }

            this.screenSize = Toolkit.getDefaultToolkit().getScreenSize();
        }

        public void setRequestedRegion(Rectangle region) {
            requestedRegion = region;
        }

        public void connectAndWaitForRequests() throws CannotConnectException {
            Socket socket;

            // Establish the connection.
            try {
                socket = new Socket("localhost", Config.PORT_LOCAL);
            } catch (IOException e) {
                throw new CannotConnectException(e);
            }

            if (debug) {
                System.out.println(
                        "Local socket established " + socket.getRemoteSocketAddress().toString());
            }

            // Wait for requests.
            try {
                DataInputStream dis = new DataInputStream(socket.getInputStream());
                BufferedOutputStream bos = new BufferedOutputStream(socket.getOutputStream());

                while (true) {
                    // Try processing a request.
                    int x = dis.readInt();
                    int y = dis.readInt();
                    int width = dis.readInt();
                    int height = dis.readInt();

                    // If we reach this point, we didn't hit an IOException and we've received
                    // a request from the device.

                    x = requestedRegion.x;
                    y = requestedRegion.y;

                    if ((width != curWidth || height != curHeight) && prooferCallbacks != null) {
                        prooferCallbacks.onRequestedSizeChanged(width, height);
                    }

                    curWidth = width;
                    curHeight = height;

                    updateState(State.ConnectedActive);

                    if (debug) {
                        System.out.println(
                                "Got request: [" + x + ", " + y + ", " + width + ", " + height
                                        + "]");
                    }

                    if (width > 1 && height > 1) {
                        BufferedImage bi = capture(x, y, width, height);
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        ImageIO.write(bi, "PNG", baos);
                        byte[] out = baos.toByteArray();
                        int len = out.length;
                        byte[] outlen = new byte[4];
                        outlen[0] = (byte) ((len >> 24) & 0xFF);
                        outlen[1] = (byte) ((len >> 16) & 0xFF);
                        outlen[2] = (byte) ((len >> 8) & 0xFF);
                        outlen[3] = (byte) (len & 0xFF);

                        if (debug) {
                            System.out.println("Writing " + len + " bytes.");
                        }

                        bos.write(outlen, 0, 4);
                        bos.write(out, 0, len);
                        bos.flush();
                    }

                    // This loop will exit only when an IOException is thrown, indicating there's
                    // nothing further to read.
                }
            } catch (IOException e) {
                // If we're not "connected", this just means we haven't received any requests yet
                // on the socket, so there's no error to log.
                if (debug) {
                    System.out.println("No activity.");
                }
            }

            // No (or no more) requests.
            updateState(State.ConnectedIdle);
        }

        private BufferedImage capture(int x, int y, int width, int height) {
            if (x + width > screenSize.width) {
                x = screenSize.width - width;
            }

            if (y + height > screenSize.height) {
                y = screenSize.height - height;
            }

            Rectangle rect = new Rectangle(x, y, width, height);
            long before = System.currentTimeMillis();
            BufferedImage bi = robot.createScreenCapture(rect);
            long after = System.currentTimeMillis();

            if (debug) {
                System.out.println("Capture time: " + (after - before) + " msec");
            }

            return bi;
        }
    }
}


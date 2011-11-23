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

import com.google.android.desktop.proofer.os.OSBinder;

import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.awt.Rectangle;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.WindowEvent;
import java.awt.event.WindowListener;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Properties;

import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;

public class ControllerForm
        implements WindowListener, OSBinder.Callbacks, Proofer.ProoferCallbacks,
        RegionSelector.RegionChangeCallback {
    private JFrame frame;

    private JPanel contentPanel;
    private JButton reinstallButton;
    private JLabel statusLabel;
    private JButton regionButton;

    private OSBinder osBinder = OSBinder.getBinder(this);

    private RegionSelector regionSelector;
    private Proofer proofer;

    public ControllerForm() {
        setupUI();
        setupProofer();
    }

    public static void main(String[] args) {
        // OSX only
        //System.setProperty("com.apple.mrj.application.apple.menu.about.name",
        //        "Android Design Preview");
        new ControllerForm();
    }

    private void setupProofer() {
        proofer = new Proofer(this);

        try {
            proofer.setupPortForwarding();
        } catch (ProoferException e) {
//            JOptionPane.showMessageDialog(frame,
//                    e.getMessage(),
//                    "Android Design Preview",
//                    JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }

        try {
            proofer.installAndroidApp(false);
            proofer.runAndroidApp();
        } catch (ProoferException e) {
            e.printStackTrace();
        }

        proofer.startConnectionLoop();
        proofer.setRequestedRegion(regionSelector.getRegion());
    }

    private void setupUI() {
        frame = new JFrame(ControllerForm.class.getName());
        frame.setTitle("Android Design Preview");
        frame.setIconImages(Arrays.asList(Util.getAppIconMipmap()));
        frame.setAlwaysOnTop(true);
        frame.setMinimumSize(new Dimension(250, 150));

        frame.setLocationByPlatform(true);
        tryLoadFrameConfig();

        frame.setContentPane(contentPanel);
        frame.setResizable(false);
        frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        frame.setVisible(true);
        frame.addWindowListener(this);

        reinstallButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent actionEvent) {
                try {
                    proofer.installAndroidApp(true);
                    proofer.runAndroidApp();
                } catch (ProoferException e) {
                    JOptionPane.showMessageDialog(frame,
                            "Couldn't install the app: " + e.getMessage(),
                            "Android Design Preview",
                            JOptionPane.ERROR_MESSAGE);
                    e.printStackTrace();
                }
            }
        });

        regionSelector = new RegionSelector(this);

        regionButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent actionEvent) {
                regionSelector.toggleWindow();
            }
        });
    }

    void trySaveFrameConfig() {
        try {
            Properties props = new Properties();
            props.setProperty("x", String.valueOf(frame.getX()));
            props.setProperty("y", String.valueOf(frame.getY()));
            props.storeToXML(new FileOutputStream(
                    new File(Util.getCacheDirectory(), "config.xml")), null);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    void tryLoadFrameConfig() {
        try {
            Properties props = new Properties();
            props.loadFromXML(
                    new FileInputStream(new File(Util.getCacheDirectory(), "config.xml")));
            frame.setLocation(
                    Integer.parseInt(props.getProperty("x", String.valueOf(frame.getX()))),
                    Integer.parseInt(props.getProperty("y", String.valueOf(frame.getY()))));
        } catch (FileNotFoundException e) {
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void windowClosing(WindowEvent windowEvent) {
        onQuit();
    }

    public void onQuit() {
        try {
            proofer.killAndroidApp();
        } catch (ProoferException e) {
            e.printStackTrace();
        }

        trySaveFrameConfig();
        frame.dispose();
        System.exit(0);
    }

    public void windowOpened(WindowEvent windowEvent) {
    }

    public void windowClosed(WindowEvent windowEvent) {
    }

    public void windowIconified(WindowEvent windowEvent) {
    }

    public void windowDeiconified(WindowEvent windowEvent) {
    }

    public void windowActivated(WindowEvent windowEvent) {
    }

    public void windowDeactivated(WindowEvent windowEvent) {
    }

    public void onStateChange(Proofer.State newState) {
        switch (newState) {
            case ConnectedActive:
                statusLabel.setText("Connected, active");
                break;
            case ConnectedIdle:
                statusLabel.setText("Connected, inactive");
                break;
            case Disconnected:
                statusLabel.setText("Disconnected");
                break;
            case Unknown:
                statusLabel.setText("N/A");
                break;
        }
    }

    public void onRequestedSizeChanged(int width, int height) {
        regionSelector.requestSize(width, height);
    }

    public void onRegionChanged(Rectangle region) {
        if (proofer != null) {
            proofer.setRequestedRegion(region);
        }
    }

    {
// GUI initializer generated by IntelliJ IDEA GUI Designer
// >>> IMPORTANT!! <<<
// DO NOT EDIT OR ADD ANY CODE HERE!
        $$$setupUI$$$();
    }

    /**
     * Method generated by IntelliJ IDEA GUI Designer >>> IMPORTANT!! <<< DO NOT edit this method OR
     * call it in your code!
     *
     * @noinspection ALL
     */
    private void $$$setupUI$$$() {
        contentPanel = new JPanel();
        contentPanel.setLayout(new GridBagLayout());
        reinstallButton = new JButton();
        reinstallButton.setText("Re-install App");
        reinstallButton.setMnemonic('R');
        reinstallButton.setDisplayedMnemonicIndex(0);
        GridBagConstraints gbc;
        gbc = new GridBagConstraints();
        gbc.gridx = 0;
        gbc.gridy = 2;
        gbc.weightx = 1.0;
        gbc.weighty = 1.0;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.insets = new Insets(8, 8, 8, 8);
        contentPanel.add(reinstallButton, gbc);
        final JPanel panel1 = new JPanel();
        panel1.setLayout(new FlowLayout(FlowLayout.CENTER, 5, 5));
        gbc = new GridBagConstraints();
        gbc.gridx = 0;
        gbc.gridy = 0;
        gbc.fill = GridBagConstraints.BOTH;
        gbc.insets = new Insets(8, 8, 8, 8);
        contentPanel.add(panel1, gbc);
        final JLabel label1 = new JLabel();
        label1.setText("Status:");
        panel1.add(label1);
        statusLabel = new JLabel();
        statusLabel.setFont(new Font(statusLabel.getFont().getName(), Font.BOLD,
                statusLabel.getFont().getSize()));
        statusLabel.setText("N/A");
        panel1.add(statusLabel);
        regionButton = new JButton();
        regionButton.setText("Select Mirror Region");
        regionButton.setMnemonic('M');
        regionButton.setDisplayedMnemonicIndex(7);
        gbc = new GridBagConstraints();
        gbc.gridx = 0;
        gbc.gridy = 1;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.insets = new Insets(8, 8, 8, 8);
        contentPanel.add(regionButton, gbc);
    }

    /**
     * @noinspection ALL
     */
    public JComponent $$$getRootComponent$$$() {
        return contentPanel;
    }
}

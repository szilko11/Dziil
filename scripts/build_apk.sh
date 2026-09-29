#!/bin/bash
set -e

echo "=========================================================="
echo "  📦 NEXUS HORIZON RP - NATIVE ANDROID APK BUILDER"
echo "=========================================================="

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
DX_TOOL="/usr/lib/android-sdk/build-tools/debian/dx"

if [ ! -f "$ANDROID_JAR" ]; then
    echo "❌ android.jar not found at $ANDROID_JAR"
    exit 1
fi

WORK_DIR="/tmp/nexus_apk_build"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR/src/hu/nexushorizon/rp"
mkdir -p "$WORK_DIR/res/values"
mkdir -p "$WORK_DIR/res/mipmap-mdpi"
mkdir -p "$WORK_DIR/res/mipmap-hdpi"
mkdir -p "$WORK_DIR/res/mipmap-xhdpi"
mkdir -p "$WORK_DIR/res/mipmap-xxhdpi"
mkdir -p "$WORK_DIR/assets"
mkdir -p "$WORK_DIR/bin"
mkdir -p dist public

# Copy app icons from public
cp public/pwa-192x192.png "$WORK_DIR/res/mipmap-mdpi/ic_launcher.png"
cp public/pwa-192x192.png "$WORK_DIR/res/mipmap-hdpi/ic_launcher.png"
cp public/pwa-192x192.png "$WORK_DIR/res/mipmap-xhdpi/ic_launcher.png"
cp public/pwa-512x512.png "$WORK_DIR/res/mipmap-xxhdpi/ic_launcher.png"

# Copy dist web assets to assets/
if [ -d "dist" ]; then
    cp -r dist/* "$WORK_DIR/assets/" || true
fi

# 1. AndroidManifest.xml
cat << 'EOF' > "$WORK_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="hu.nexushorizon.rp"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 2. strings.xml
cat << 'EOF' > "$WORK_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Nexus Horizon RP</string>
</resources>
EOF

# 3. MainActivity.java
cat << 'EOF' > "$WORK_DIR/src/hu/nexushorizon/rp/MainActivity.java"
package hu.nexushorizon.rp;

import android.app.Activity;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

public class MainActivity extends Activity {
    private WebView mWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        mWebView = new WebView(this);
        setContentView(mWebView);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });
        mWebView.setWebChromeClient(new WebChromeClient());

        // Load bundled web app directly from assets
        mWebView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
EOF

echo "⚙️ [1/6] Generating R.java with aapt..."
aapt package -f -m \
    -J "$WORK_DIR/src" \
    -M "$WORK_DIR/AndroidManifest.xml" \
    -S "$WORK_DIR/res" \
    -I "$ANDROID_JAR"

echo "⚙️ [2/6] Compiling Java code with javac..."
javac -source 1.8 -target 1.8 \
    -cp "$ANDROID_JAR" \
    -d "$WORK_DIR/bin" \
    "$WORK_DIR/src/hu/nexushorizon/rp/"*.java

echo "⚙️ [3/6] Converting to Dalvik bytecode (classes.dex) with dx..."
"$DX_TOOL" --dex --output="$WORK_DIR/bin/classes.dex" "$WORK_DIR/bin"

echo "⚙️ [4/6] Packaging APK with resources and web assets..."
aapt package -f \
    -M "$WORK_DIR/AndroidManifest.xml" \
    -S "$WORK_DIR/res" \
    -A "$WORK_DIR/assets" \
    -I "$ANDROID_JAR" \
    -F "$WORK_DIR/bin/unaligned.apk" \
    "$WORK_DIR/bin"

echo "⚙️ [5/6] Aligning APK with zipalign..."
zipalign -f -p 4 "$WORK_DIR/bin/unaligned.apk" "$WORK_DIR/bin/aligned.apk"

echo "⚙️ [6/6] Signing APK with apksigner..."
KEYSTORE="/tmp/nexus_debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkey -v -keystore "$KEYSTORE" \
        -alias androiddebugkey \
        -keypass android -storepass android \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -dname "CN=NexusHorizonRP, OU=Dev, O=Nexus, L=Budapest, C=HU"
fi

apksigner sign --ks "$KEYSTORE" \
    --ks-pass pass:android \
    --key-pass pass:android \
    --out "$WORK_DIR/nexus-horizon-rp.apk" \
    "$WORK_DIR/bin/aligned.apk"

# Copy final APK to dist and public
cp "$WORK_DIR/nexus-horizon-rp.apk" dist/nexus-horizon-rp.apk
cp "$WORK_DIR/nexus-horizon-rp.apk" public/nexus-horizon-rp.apk

APK_SIZE=$(ls -lh dist/nexus-horizon-rp.apk | awk '{print $5}')
echo ""
echo "=========================================================="
echo "  🎉 SIKERES APK BUILD!"
echo "  📁 Fájl: dist/nexus-horizon-rp.apk (Méret: $APK_SIZE)"
echo "  🌐 Letölthető: /nexus-horizon-rp.apk"
echo "=========================================================="

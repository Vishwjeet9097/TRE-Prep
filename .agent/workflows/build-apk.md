---
description: Convert the React web app into an Android APK using Capacitor
---

This workflow will set up Ionic Capacitor in your project to generate a mobile application.

# Prerequisites
- Node.js (Installed)
- Android Studio (For final APK compilation) - *You can download this later if not installed*

# Steps

1. **Install Capacitor Dependencies**
   Install the necessary packages to wrap your web app.
   ```bash
   npm install @capacitor/core
   npm install -D @capacitor/cli @capacitor/android
   ```

2. **Initialize Capacitor**
   Initialize the configuration with your app name and ID.
   ```bash
   npx cap init "TRE Prep AI" "com.treprep.app" --web-dir dist
   ```

3. **Build the Web Application**
   Compile your React code into static assets.
   ```bash
   npm run build
   ```

4. **Add Android Platform**
   Create the Android native project folder.
   ```bash
   npx cap add android
   ```

5. **Sync Assets**
   Copy the built web assets into the Android project.
   ```bash
   npx cap sync
   ```

# Permissions Configuration (Microphone)

To allow the app to access the microphone (required for voice features), you must edit the Android Manifest.

1. Open `android/app/src/main/AndroidManifest.xml`
2. Add the following line inside the `<manifest>` tag, above the `<application>` tag:

   ```xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   ```

   *Note: If you need internet access (which you do for API calls), Capacitor usually adds `INTERNET` permission by default, but verify it exists:*
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```

# Final Step: Build APK

1. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
2. Wait for Gradle sync to complete.
3. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Locate the generated APK in `android/app/build/outputs/apk/debug/app-debug.apk` (or release folder).

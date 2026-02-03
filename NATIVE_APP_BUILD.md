# aok Native App Build Guide

This guide explains how to build the aok native apps for iOS and Android using Capacitor.

## Prerequisites

### For iOS builds:
- macOS computer (required by Apple)
- Xcode 14+ installed from the Mac App Store
- Apple Developer account ($99/year) for App Store distribution
- CocoaPods: `sudo gem install cocoapods`

### For Android builds:
- Android Studio installed
- Java JDK 17+
- Google Play Developer account ($25 one-time) for Play Store distribution

## Project Setup

The project is already configured with Capacitor. The key configuration file is `capacitor.config.ts`.

### App Configuration

| Setting | Value |
|---------|-------|
| App ID | `care.aok.app` |
| App Name | `aok` |
| Web Directory | `dist/public` |
| URL Scheme (iOS) | `aok://` |

## Building the Apps

### Step 1: Build the Web App

First, build the production web app:

```bash
npm run build
```

This creates the optimised web assets in `dist/public/`.

### Step 2: Add Native Platforms

Run these commands once to add the native platforms:

```bash
# Add iOS platform
npx cap add ios

# Add Android platform
npx cap add android
```

### Step 3: Sync Web Assets to Native Projects

After any web changes, sync the assets:

```bash
npx cap sync
```

This copies `dist/public/` to the native projects and updates native dependencies.

### Step 4: Open Native IDEs

```bash
# Open Xcode for iOS
npx cap open ios

# Open Android Studio for Android
npx cap open android
```

## iOS-Specific Setup

### App Icons

Replace the default icons in:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

Required sizes: 20, 29, 40, 60, 76, 83.5, 1024 points (various scales).

### Splash Screen

Configure in:
```
ios/App/App/Assets.xcassets/Splash.imageset/
```

### Push Notifications

1. Enable "Push Notifications" capability in Xcode
2. Create an APNs key in Apple Developer Portal
3. Upload the key to your push notification service (e.g., Firebase)

### Deep Links (Universal Links)

1. Enable "Associated Domains" capability in Xcode
2. Add: `applinks:aok.care`
3. Host `apple-app-site-association` file at `https://aok.care/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.care.aok.app",
      "paths": ["/org/client-login*", "/dashboard*", "/app*"]
    }]
  }
}
```

## Android-Specific Setup

### App Icons

Replace icons in:
```
android/app/src/main/res/mipmap-*/ic_launcher.png
```

Use Android Studio's Image Asset Studio for easy generation.

### Splash Screen

Configure in:
```
android/app/src/main/res/drawable/splash.png
```

### Push Notifications (Firebase)

1. Create a Firebase project
2. Add `google-services.json` to `android/app/`
3. Push tokens will be sent to your backend

### Deep Links (App Links)

1. Add intent filter in `android/app/src/main/AndroidManifest.xml`
2. Host `assetlinks.json` at `https://aok.care/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "care.aok.app",
    "sha256_cert_fingerprints": ["YOUR_SIGNING_KEY_FINGERPRINT"]
  }
}]
```

## Native Plugins Installed

| Plugin | Purpose |
|--------|---------|
| `@capacitor/push-notifications` | Firebase/APNs push notifications |
| `@capacitor/local-notifications` | Check-in reminders, alarms |
| `@capacitor/geolocation` | GPS for emergency location |
| `@capacitor/motion` | Shake-to-SOS detection |
| `@capacitor/haptics` | Vibration feedback |
| `@capacitor/status-bar` | Status bar styling |
| `@capacitor/splash-screen` | App launch screen |
| `@capacitor/app` | App lifecycle events |

## Common Commands

```bash
# Build web app
npm run build

# Sync to native platforms
npx cap sync

# Open iOS project
npx cap open ios

# Open Android project
npx cap open android

# Live reload during development (requires local server)
npx cap run ios --livereload --external
npx cap run android --livereload --external
```

## App Store Submission Checklist

### iOS App Store

- [ ] App icons (all required sizes)
- [ ] Screenshots (6.7", 6.5", 5.5" iPhones, iPad Pro)
- [ ] App description and keywords
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating questionnaire
- [ ] In-app purchases configured
- [ ] Push notification capability
- [ ] Associated domains configured

### Google Play Store

- [ ] App icons and feature graphic
- [ ] Screenshots (phone and tablet)
- [ ] App description
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Signing key configured
- [ ] In-app products configured
- [ ] Firebase configured

## Testing

### On Physical Devices

```bash
# iOS (requires provisioning profile)
npx cap run ios

# Android
npx cap run android
```

### On Simulators/Emulators

```bash
# iOS Simulator
npx cap run ios --target="iPhone 15 Pro"

# Android Emulator
npx cap run android
```

## Troubleshooting

### iOS Build Fails

```bash
cd ios/App
pod install --repo-update
```

### Android Build Fails

- Ensure JAVA_HOME is set to JDK 17+
- Run: `./gradlew clean` in the `android/` directory

### Push Notifications Not Working

- Verify APNs/Firebase configuration
- Check device tokens are being registered
- Ensure background modes are enabled

## Updating the App

1. Make web changes
2. Run `npm run build`
3. Run `npx cap sync`
4. Increment version in Xcode/Android Studio
5. Build and submit to app stores

## Support

For issues with native builds, check:
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Development Guide](https://developer.apple.com/ios/)
- [Android Development Guide](https://developer.android.com/)

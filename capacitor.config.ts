import type { CapacitorConfig } from "@capacitor/cli";
import type { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

// Sentia native shells (Android + iOS) around the static export in ./out.
// Build the web bundle for the app with `npm run build:mobile` (no base path; NOT the Pages build).
//
// appId is the permanent store identifier once the app is published. "com.sentia.papertrading"
// is a placeholder you can still change before the first upload (see STORE_RELEASE.md).
const config: CapacitorConfig = {
  appId: "com.sentia.papertrading",
  appName: "Sentia",
  webDir: "out",
  backgroundColor: "#070a1c",
  android: {
    // Served from https://localhost (allowed by the Sentia API's CORS list).
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    // Served from capacitor://localhost (allowed by the Sentia API's CORS list).
    contentInset: "never",
    backgroundColor: "#070a1c",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#070a1c",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
    Keyboard: {
      // iOS: shrink the WebView ("native") so focused inputs in the trade / feedback / coach
      // forms stay above the keyboard; Android uses adjustResize (see AndroidManifest).
      resize: "native" as unknown as KeyboardResize,
      style: "DARK" as unknown as KeyboardStyle,
      resizeOnFullScreen: true,
    },
  },
};

export default config;

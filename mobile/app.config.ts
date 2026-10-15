import type { ExpoConfig } from "expo/config";
const api = process.env.EXPO_PUBLIC_API_URL;
if (
  process.env.EAS_BUILD_PROFILE &&
  process.env.EAS_BUILD_PROFILE !== "development" &&
  (!api?.startsWith("https://") ||
    /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(api))
)
  throw new Error(
    "El APK requiere EXPO_PUBLIC_API_URL con un backend HTTPS accesible desde Android.",
  );
const config: ExpoConfig = {
  name: "StockFlow",
  slug: "stockflow-estanga",
  version: "1.0.0",
  scheme: "stockflow",
  orientation: "default",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  android: {
    package: "com.estanga.stockflow",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#E1F3EA",
    },
    permissions: [],
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.VIBRATE",
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
    ],
  },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          usesCleartextTraffic:
            !process.env.EAS_BUILD_PROFILE ||
            process.env.EAS_BUILD_PROFILE === "development",
        },
      },
    ],
    "expo-router",
    "expo-font",
    "expo-secure-store",
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        image: "./assets/icon.png",
        imageWidth: 180,
        backgroundColor: "#F3F7F5",
      },
    ],
  ],
  web: { bundler: "metro" },
  extra: process.env.EAS_PROJECT_ID
    ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
    : {},
};
export default config;

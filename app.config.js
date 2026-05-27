const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return "com.shifashareef.dev";
  }
  if (IS_PREVIEW) {
    return "com.shifashareef.preview";
  }
  return "com.shifashareef";
};

const getAppName = () => {
  if (IS_DEV) {
    return "Shifa Shareef (Dev)";
  }
  if (IS_PREVIEW) {
    return "Shifa Shareef (Preview)";
  }
  return "Shifa Shareef";
};

export default {
  expo: {
    name: getAppName(),
    slug: "shifa-shareef",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "shifashareef",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
    },
    android: {
      versionCode: 2,
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getUniqueIdentifier(),
    },
    web: {
      output: "static",
      favicon: "./assets/images/icon.png",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-asset",
      "@config-plugins/react-native-blob-util",
      "@config-plugins/react-native-pdf",
      "expo-web-browser",
      "expo-screen-orientation",
      "expo-brightness",
      [
        "expo-av",
        {
          microphonePermission:
            "Allow $(PRODUCT_NAME) to access your microphone for audio features.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#173D31",
          sounds: [],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      "eas": {
        "projectId": "53403c76-73ed-4ca6-b313-a36d3fe374c6"
      }
    },
  },
};

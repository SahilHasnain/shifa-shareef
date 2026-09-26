import { forwardRef, useImperativeHandle, useRef } from "react";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { StyleProp, ViewStyle } from "react-native";

export type ReaderSurfaceHandle = {
  injectJavaScript: (js: string) => void;
  postMessage: (message: string) => void;
};

export type ReaderSurfaceProps = {
  source?: { html: string } | undefined;
  style?: StyleProp<ViewStyle>;
  onMessage?: (event: WebViewMessageEvent) => void;
  onLoadEnd?: () => void;
  onError?: () => void;
};

const ReaderSurface = forwardRef<ReaderSurfaceHandle, ReaderSurfaceProps>(function ReaderSurface(props, ref) {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    injectJavaScript: (js: string) => {
      webViewRef.current?.injectJavaScript(js);
    },
    postMessage: (message: string) => {
      webViewRef.current?.postMessage(message);
    },
  }));

  return (
    <WebView
      ref={webViewRef}
      source={props.source}
      onMessage={props.onMessage}
      onLoadEnd={props.onLoadEnd}
      onError={props.onError}
      style={props.style}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      mixedContentMode="always"
      showsVerticalScrollIndicator={false}
    />
  );
});

export default ReaderSurface;
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

export type ReaderSurfaceHandle = {
  injectJavaScript: (js: string) => void;
  postMessage: (message: string) => void;
};

export type ReaderSurfaceProps = {
  source?: { html: string } | undefined;
  style?: StyleProp<ViewStyle>;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  onLoadEnd?: () => void;
  onError?: () => void;
};

// The reader page posts host messages through window.ReactNativeWebView.postMessage. The shim
// below forwards those messages to the parent window, where they arrive as window "message"
// events. The page also listens for RESTORE instructions on window "message", so the parent can
// deliver progress restoration through iframe.contentWindow.postMessage(...).
const BRIDGE_SHIM =
  "window.ReactNativeWebView = { postMessage: function (message) { window.parent.postMessage(message, '*'); } };";

function evalInFrame(win: Window, code: string) {
  (win as unknown as { eval(code: string): unknown }).eval(code);
}

const ReaderSurface = forwardRef<ReaderSurfaceHandle, ReaderSurfaceProps>(function ReaderSurface(props, ref) {
  const hostRef = useRef<View | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const loadedRef = useRef(false);
  const pendingJsRef = useRef<string[]>([]);
  const propsRef = useRef(props);
  propsRef.current = props;

  const runJavaScript = (js: string) => {
    if (!loadedRef.current) {
      pendingJsRef.current.push(js);
      return;
    }
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      evalInFrame(win, js);
    } catch {
      // ignore eval failures
    }
  };

  useImperativeHandle(ref, () => ({
    injectJavaScript: runJavaScript,
    postMessage: (message: string) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(message, "*");
      } catch {
        // ignore delivery failures
      }
    },
  }));

  useEffect(() => {
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host) return;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;border:0;background:transparent;display:block;";
    host.appendChild(iframe);
    iframeRef.current = iframe;

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const raw = event.data;
      const data =
        typeof raw === "string" ? raw : typeof raw === "object" && raw !== null ? JSON.stringify(raw) : String(raw ?? "");
      propsRef.current.onMessage?.({ nativeEvent: { data } });
    };
    window.addEventListener("message", handleWindowMessage);

    return () => {
      window.removeEventListener("message", handleWindowMessage);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      iframeRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    const html = props.source?.html;
    if (!iframe || typeof html !== "string") return;

    loadedRef.current = false;
    pendingJsRef.current = [];

    iframe.setAttribute("srcdoc", html);

    const onLoad = () => {
      loadedRef.current = true;
      const win = iframe.contentWindow;
      if (win) {
        try {
          evalInFrame(win, BRIDGE_SHIM);
        } catch {
          // ignore bridge registration failures
        }
      }
      const pending = pendingJsRef.current.splice(0);
      for (const js of pending) runJavaScript(js);
      propsRef.current.onLoadEnd?.();
    };

    iframe.addEventListener("load", onLoad);
    return () => {
      iframe.removeEventListener("load", onLoad);
    };
  }, [props.source?.html]);

  return <View ref={hostRef} style={[{ flex: 1, position: "relative" }, props.style]} />;
});

export default ReaderSurface;
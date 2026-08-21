import * as Brightness from "expo-brightness";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform } from "react-native";

export function useReaderBrightness() {
  const [brightness, setBrightness] = useState(0.5);
  const [trackWidth, setTrackWidth] = useState(0);
  const originalBrightnessRef = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let isMounted = true;

    void Brightness.getBrightnessAsync()
      .then((currentBrightness) => {
        if (isMounted) {
          originalBrightnessRef.current = currentBrightness;
          setBrightness(currentBrightness);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;

      if (originalBrightnessRef.current !== null) {
        void Brightness.setBrightnessAsync(originalBrightnessRef.current).catch(() => {});
      }
    };
  }, []);

  const updateFromGesture = useCallback(
    (locationX: number) => {
      if (trackWidth <= 0 || Platform.OS === "web") {
        return;
      }

      const nextBrightness = Math.min(Math.max(locationX / trackWidth, 0.05), 1);
      setBrightness(nextBrightness);
      void Brightness.setBrightnessAsync(nextBrightness).catch(() => {});
    },
    [trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          updateFromGesture(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateFromGesture(event.nativeEvent.locationX);
        },
      }),
    [updateFromGesture],
  );

  const setTrackWidthFromLayout = useCallback((width: number) => {
    setTrackWidth(width);
  }, []);

  return { brightness, panResponder, setTrackWidthFromLayout };
}

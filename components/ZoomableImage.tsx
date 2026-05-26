import { Image, ImageSourcePropType, View } from "react-native";
import { useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

interface ZoomableImageProps {
    source: ImageSourcePropType;
    width: number;
    height: number;
    onPress?: () => void;
    onZoomChange?: (isZoomed: boolean) => void;
    onError?: () => void;
}

export function ZoomableImage({ source, width, height, onPress, onZoomChange, onError }: ZoomableImageProps) {
    const [isPanEnabled, setIsPanEnabled] = useState(false);
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const clamp = (value: number, min: number, max: number) => {
        "worklet";
        return Math.min(Math.max(value, min), max);
    };

    const getPanBounds = (currentScale: number) => {
        "worklet";
        const horizontal = Math.max(0, ((width * currentScale) - width) / 2);
        const vertical = Math.max(0, ((height * currentScale) - height) / 2);
        return {
            minX: -horizontal,
            maxX: horizontal,
            minY: -vertical,
            maxY: vertical,
        };
    };

    const notifyZoomChange = (isZoomed: boolean) => {
        setIsPanEnabled(isZoomed);
        if (onZoomChange) {
            onZoomChange(isZoomed);
        }
    };

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            const nextScale = clamp(savedScale.value * e.scale, 1, 3);
            scale.value = nextScale;

            const bounds = getPanBounds(nextScale);
            translateX.value = clamp(savedTranslateX.value, bounds.minX, bounds.maxX);
            translateY.value = clamp(savedTranslateY.value, bounds.minY, bounds.maxY);
        })
        .onEnd(() => {
            savedScale.value = clamp(scale.value, 1, 3);
            scale.value = withSpring(savedScale.value);

            if (savedScale.value <= 1) {
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                const bounds = getPanBounds(savedScale.value);
                const nextX = clamp(translateX.value, bounds.minX, bounds.maxX);
                const nextY = clamp(translateY.value, bounds.minY, bounds.maxY);
                translateX.value = withSpring(nextX);
                translateY.value = withSpring(nextY);
                savedTranslateX.value = nextX;
                savedTranslateY.value = nextY;
            }

            if (onZoomChange) {
                runOnJS(notifyZoomChange)(savedScale.value > 1);
            }
        });

    // Pan gesture only active when zoomed in
    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .activeOffsetY([-10, 10])
        .onUpdate((e) => {
            if (savedScale.value > 1) {
                const bounds = getPanBounds(savedScale.value);
                translateX.value = clamp(savedTranslateX.value + e.translationX, bounds.minX, bounds.maxX);
                translateY.value = clamp(savedTranslateY.value + e.translationY, bounds.minY, bounds.maxY);
            }
        })
        .onEnd(() => {
            if (savedScale.value > 1) {
                savedTranslateX.value = translateX.value;
                savedTranslateY.value = translateY.value;
            }
        });

    const tapGesture = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
            if (onPress) {
                runOnJS(onPress)();
            }
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            // Double tap to reset zoom
            if (scale.value > 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                if (onZoomChange) {
                    runOnJS(notifyZoomChange)(false);
                }
            } else {
                // Double tap to zoom in 2x
                scale.value = withSpring(2);
                savedScale.value = 2;
                if (onZoomChange) {
                    runOnJS(notifyZoomChange)(true);
                }
            }
        });

    const composed = Gesture.Race(
        doubleTapGesture,
        Gesture.Simultaneous(
            tapGesture,
            pinchGesture,
            panGesture.enabled(isPanEnabled),
        ),
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <View style={{ width, height }}>
            <GestureDetector gesture={composed}>
                <Animated.View style={[{ width, height }, animatedStyle]}>
                    <Image
                        source={source}
                        style={{ width, height }}
                        resizeMode="contain"
                        onError={onError}
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

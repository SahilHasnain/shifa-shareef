import { Image, ImageSourcePropType, View } from "react-native";
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
}

export function ZoomableImage({ source, width, height, onPress }: ZoomableImageProps) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            // Limit zoom between 1x and 3x
            if (scale.value < 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
            } else if (scale.value > 3) {
                scale.value = withSpring(3);
                savedScale.value = 3;
            } else {
                savedScale.value = scale.value;
            }
        });

    // Pan gesture only active when zoomed in
    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .activeOffsetY([-10, 10])
        .onUpdate((e) => {
            // Only allow panning when zoomed in
            if (savedScale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
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
            } else {
                // Double tap to zoom in 2x
                scale.value = withSpring(2);
                savedScale.value = 2;
            }
        });

    // Only enable pan when zoomed, otherwise let FlatList handle horizontal swipes
    const composed = Gesture.Race(
        doubleTapGesture,
        Gesture.Simultaneous(
            tapGesture,
            pinchGesture,
            Gesture.Race(
                panGesture.enabled(savedScale.value > 1),
            ),
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
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing, Platform } from 'react-native';
import { useFestival } from '../contexts/FestivalContext';

const NUM_SNOWFLAKES = 50;

const Snowflake = () => {
    const { width, height } = Dimensions.get('window');
    const startX = Math.random() * width;
    const startY = -20;
    const endY = height + 20;
    const duration = 5000 + Math.random() * 5000;
    const delay = Math.random() * 5000;
    const size = Math.random() * 4 + 2;

    const translateY = useRef(new Animated.Value(startY)).current;
    const translateX = useRef(new Animated.Value(startX)).current;

    useEffect(() => {
        const animate = () => {
            translateY.setValue(startY);
            // Reset X to a new random position each loop to make it look more dynamic? 
            // Or keep it same? Let's keep it same for now to avoid jumps.

            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(translateY, {
                    toValue: endY,
                    duration: duration,
                    easing: Easing.linear,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start(() => {
                animate();
            });
        };

        animate();
    }, []);

    return (
        <Animated.View
            style={[
                styles.snowflake,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    transform: [{ translateY }, { translateX }],
                },
            ]}
        />
    );
};

export const FestivalOverlay = () => {
    const { currentFestival } = useFestival();

    if (currentFestival !== 'christmas') return null;

    return (
        <View style={[styles.container, { pointerEvents: 'none' } as any]}>
            {Array.from({ length: NUM_SNOWFLAKES }).map((_, i) => (
                <Snowflake key={i} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        elevation: 9999,
    },
    snowflake: {
        position: 'absolute',
        backgroundColor: 'white',
        opacity: 0.6,
    },
});

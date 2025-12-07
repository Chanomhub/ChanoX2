import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useFestival } from '@/contexts/FestivalContext';

const NUM_SPARKLES = 20;

const Sparkle = () => {
    const { width, height } = Dimensions.get('window');
    // Random position fixed for lifetime of component to avoid jumping
    const left = useRef(Math.random() * width).current;
    const top = useRef(Math.random() * height).current;

    // Random params for animation
    const duration = 2000 + Math.random() * 3000;
    const delay = Math.random() * 2000;
    const maxOpacity = 0.5 + Math.random() * 0.5;
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = () => {
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: maxOpacity,
                        duration: duration / 2,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 1,
                        duration: duration / 2,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: duration / 2,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 0,
                        duration: duration / 2,
                        useNativeDriver: true,
                    }),
                ])
            ]).start(() => animate());
        };

        animate();
    }, []);

    return (
        <Animated.View
            style={[
                styles.sparkle,
                {
                    left,
                    top,
                    opacity,
                    transform: [{ scale }],
                },
            ]}
        />
    );
};

export const FestivalOverlay = () => {
    const { currentFestival } = useFestival();

    // Show for both christmas and new_year, or just generally for "year end"
    if (currentFestival !== 'christmas' && currentFestival !== 'new_year') return null;

    return (
        <View style={[styles.container, { pointerEvents: 'none' } as any]}>
            {Array.from({ length: NUM_SPARKLES }).map((_, i) => (
                <Sparkle key={i} />
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
    sparkle: {
        position: 'absolute',
        width: 4,
        height: 4,
        backgroundColor: '#ffd700', // Gold color for year-end/new year
        borderRadius: 2,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
    },
});

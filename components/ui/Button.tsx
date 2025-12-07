import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
    title?: string;
    onPress: () => void;
    variant?: ButtonVariant;
    icon?: keyof typeof Ionicons.glyphMap;
    isLoading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    children?: React.ReactNode;
}

export const Button = ({
    title,
    onPress,
    variant = 'primary',
    icon,
    isLoading,
    disabled,
    style,
    textStyle,
    children
}: ButtonProps) => {

    const getBackgroundColor = () => {
        if (disabled) return '#2a2e36'; // Disabled state
        switch (variant) {
            case 'primary': return '#4cff00'; // Xbox Green / Steam Green
            case 'secondary': return '#2a3f55'; // Steam Blue-ish
            case 'danger': return '#d9534f';
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return '#4cff00';
        }
    };

    const getTextColor = () => {
        if (disabled) return '#6e7681';
        switch (variant) {
            case 'primary': return '#fff';
            case 'secondary': return '#fff';
            case 'outline': return '#dcdedf';
            case 'ghost': return '#dcdedf';
            default: return '#fff';
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                variant === 'outline' && styles.outline,
                disabled && styles.disabled,
                style
            ]}
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={getTextColor()} />
            ) : (
                <>
                    {icon && <Ionicons name={icon} size={18} color={getTextColor()} style={title ? styles.iconRight : undefined} />}
                    {title && (
                        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                            {title}
                        </Text>
                    )}
                    {children}
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 4,
    },
    outline: {
        borderWidth: 1,
        borderColor: '#6e7681',
    },
    disabled: {
        opacity: 0.6,
    },
    text: {
        fontWeight: '600',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    iconRight: {
        marginRight: 8,
    },
});

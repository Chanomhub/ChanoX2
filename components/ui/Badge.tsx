import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
    label: string;
    value?: string;
    style?: ViewStyle;
    labelStyle?: TextStyle;
    valueStyle?: TextStyle;
}

export const Badge = ({ label, value, style, labelStyle, valueStyle }: BadgeProps) => {
    return (
        <View style={[styles.container, style]}>
            <Text style={[styles.label, labelStyle]}>{label}</Text>
            {value && <Text style={[styles.value, valueStyle]}>{value}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 5,
    },
    label: {
        color: '#acb2b8',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    value: {
        color: '#dcdedf',
        fontSize: 13,
        fontWeight: '500',
    },
});

import React, { useMemo } from 'react';
import { useWindowDimensions, ScrollView } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { Colors } from '@/constants/Colors';

interface HtmlRendererProps {
    html: string;
}

export default function HtmlRenderer({ html }: HtmlRendererProps) {
    const { width } = useWindowDimensions();

    const tagsStyles = useMemo(() => ({
        body: {
            color: Colors.dark.text,
            fontSize: 14,
            lineHeight: 22,
        },
        p: {
            marginBottom: 10,
        },
        a: {
            color: Colors.dark.accent,
            textDecorationLine: 'none',
        },
        img: {
            marginVertical: 10,
            borderRadius: 4,
        },
        blockquote: {
            backgroundColor: Colors.dark.surface,
            borderLeftWidth: 4,
            borderLeftColor: Colors.dark.accent,
            padding: 10,
            marginVertical: 10,
            fontStyle: 'italic',
        },
        code: {
            backgroundColor: '#1a1d23',
            color: '#dcdedf',
            fontFamily: 'monospace',
            padding: 2,
            borderRadius: 2,
        },
        pre: {
            backgroundColor: '#1a1d23',
            padding: 10,
            borderRadius: 4,
        },
        // Headings
        h1: { color: Colors.dark.text, fontSize: 24, fontWeight: 'bold', marginVertical: 10 },
        h2: { color: Colors.dark.text, fontSize: 20, fontWeight: 'bold', marginVertical: 8 },
        h3: { color: Colors.dark.text, fontSize: 18, fontWeight: 'bold', marginVertical: 6 },
        h4: {
            color: Colors.dark.text,
            fontSize: 18,
            fontWeight: 'bold',
            marginVertical: 6,
            marginTop: 10,
        },
        h5: {
            color: Colors.dark.text,
            fontSize: 16,
            fontWeight: 'bold',
            marginVertical: 4,
            marginTop: 8,
        },
        h6: {
            color: Colors.dark.text,
            fontSize: 14,
            fontWeight: 'bold',
            marginVertical: 4,
            marginTop: 8,
        },
        // Lists
        ul: {
            marginVertical: 8,
            paddingLeft: 20,
        },
        ol: {
            marginVertical: 8,
            paddingLeft: 20,
        },
        li: {
            marginBottom: 4,
            lineHeight: 22,
        },
        // Text formatting
        strong: {
            fontWeight: 'bold',
        },
        b: {
            fontWeight: 'bold',
        },
        em: {
            fontStyle: 'italic',
        },
        i: {
            fontStyle: 'italic',
        },
        u: {
            textDecorationLine: 'underline',
        },
        s: {
            textDecorationLine: 'line-through',
        },
        del: {
            textDecorationLine: 'line-through',
        },
        mark: {
            backgroundColor: '#fef08a',
            color: '#000',
        },
        // Table
        table: {
            marginVertical: 10,
            borderWidth: 1,
            borderColor: Colors.dark.border || '#333',
            borderRadius: 4,
        },
        thead: {
            backgroundColor: Colors.dark.surface,
        },
        th: {
            padding: 8,
            fontWeight: 'bold',
            borderWidth: 1,
            borderColor: Colors.dark.border || '#333',
        },
        td: {
            padding: 8,
            borderWidth: 1,
            borderColor: Colors.dark.border || '#333',
        },
        tr: {
            borderBottomWidth: 1,
            borderBottomColor: Colors.dark.border || '#333',
        },
        // Horizontal rule
        hr: {
            marginVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: Colors.dark.border || '#333',
        },
        // Task list (checkbox)
        input: {
            marginRight: 8,
        },
    } as const), []);

    const renderers = useMemo(() => ({
        pre: ({ TDefaultRenderer, ...props }: any) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginVertical: 10 }}>
                <TDefaultRenderer {...props} />
            </ScrollView>
        )
    }), []);

    const classesStyles = useMemo(() => ({
        'task-list-item': {
            listStyleType: 'none',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
        },
        'task-list': {
            paddingLeft: 0,
        },
    } as const), []);

    const source = useMemo(() => ({
        html: html
    }), [html]);

    return (
        <RenderHtml
            contentWidth={width - 32}
            source={source}
            tagsStyles={tagsStyles}
            renderers={renderers}
            classesStyles={classesStyles}
            baseStyle={{
                color: Colors.dark.text,
                fontFamily: 'System',
            }}
            systemFonts={['System']}
            defaultTextProps={{
                selectable: true,
            }}
            enableExperimentalMarginCollapsing={true}
        />
    );
}
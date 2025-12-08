import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
    KeyboardAvoidingView, Platform, Modal, Alert, ScrollView
} from 'react-native';
import { useChatSystem, ChatMessage, OnlineUser, ReplyReference } from '@/hooks/useChatSystem';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Quick reactions - gaming themed
const QUICK_REACTIONS = ['🎮', '👍', '🔥', '💯', '😂', '❤️', '🚀', '⭐'];

interface GlobalChatProps {
    visible: boolean;
    onClose: () => void;
}

// Typing indicator component
const TypingIndicator = ({ users }: { users: string[] }) => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 400);
        return () => clearInterval(interval);
    }, []);

    if (users.length === 0) return null;

    const text = users.length === 1
        ? `${users[0]} กำลังพิมพ์`
        : users.length === 2
            ? `${users[0]} และ ${users[1]} กำลังพิมพ์`
            : `${users[0]} และอีก ${users.length - 1} คน กำลังพิมพ์`;

    return (
        <View style={styles.typingContainer}>
            <Text style={styles.typingText}>{text}{dots}</Text>
        </View>
    );
};

// Emoji picker component
const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) => {
    return (
        <View style={styles.reactionPicker}>
            <View style={styles.reactionPickerRow}>
                {QUICK_REACTIONS.map(emoji => (
                    <TouchableOpacity
                        key={emoji}
                        style={styles.reactionBtn}
                        onPress={() => {
                            onSelect(emoji);
                            onClose();
                        }}
                    >
                        <Text style={styles.reactionBtnText}>{emoji}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// Message reactions display
const MessageReactions = ({
    reactions,
    onReactionPress,
    currentUserId
}: {
    reactions: { [emoji: string]: string[] };
    onReactionPress: (emoji: string) => void;
    currentUserId: string;
}) => {
    const reactionEntries = Object.entries(reactions || {}).filter(([, users]) => users.length > 0);

    if (reactionEntries.length === 0) return null;

    return (
        <View style={styles.reactionsRow}>
            {reactionEntries.map(([emoji, users]) => {
                const hasReacted = users.includes(currentUserId);
                return (
                    <TouchableOpacity
                        key={emoji}
                        style={[styles.reactionChip, hasReacted && styles.reactionChipActive]}
                        onPress={() => onReactionPress(emoji)}
                    >
                        <Text style={styles.chipEmoji}>{emoji}</Text>
                        <Text style={[styles.chipCount, hasReacted && styles.chipCountActive]}>
                            {users.length}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

// Online users sidebar
const ActiveUsersPanel = ({ users, onClose }: { users: OnlineUser[]; onClose: () => void }) => {
    return (
        <View style={styles.usersPanel}>
            <View style={styles.usersPanelHeader}>
                <Text style={styles.usersPanelTitle}>🟢 ออนไลน์ ({users.length})</Text>
                <TouchableOpacity onPress={onClose} style={styles.closePanelBtn}>
                    <Ionicons name="chevron-forward" size={20} color="#8f98a0" />
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.usersList} showsVerticalScrollIndicator={false}>
                {users.map(user => (
                    <View key={user.id} style={styles.userItem}>
                        <LinearGradient
                            colors={['#4cff00', '#2a9d2a']}
                            style={styles.userAvatar}
                        >
                            <Text style={styles.userAvatarText}>
                                {user.username.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.username}</Text>
                            <Text style={styles.userStatus}>Active</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

export function GlobalChat({ visible, onClose }: GlobalChatProps) {
    const {
        messages,
        sendMessage,
        editMessage,
        deleteMessage,
        isConnected,
        onlineUsers,
        onlineUsersList,
        typingUsers,
        sendTyping,
        addReaction,
        removeReaction
    } = useChatSystem();
    const { user } = useAuth();

    const [inputText, setInputText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [replyTo, setReplyTo] = useState<ReplyReference | null>(null);
    const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
    const [showUsers, setShowUsers] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);

    const currentUserId = user ? String(user.id) : '';

    // Group consecutive messages from same sender
    const groupedMessages = useMemo(() => {
        return messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const isGrouped = prevMsg &&
                prevMsg.sender === msg.sender &&
                (msg.timestamp - prevMsg.timestamp) < 180000; // 3 minutes
            return { ...msg, isGrouped };
        });
    }, [messages]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (visible && messages.length > 0 && !editingId) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, visible, editingId]);

    // Handle typing indicator
    const handleInputChange = (text: string) => {
        setInputText(text);
        if (text.length > 0) {
            sendTyping();
        }
    };

    const handleSend = () => {
        if (!inputText.trim()) return;

        if (editingId && editMessage) {
            editMessage(editingId, inputText.trim());
            setEditingId(null);
            setSelectedMessageId(null);
        } else {
            sendMessage(inputText.trim(), replyTo || undefined);
            setReplyTo(null);
        }
        setInputText('');
    };

    const handleEdit = (msg: ChatMessage) => {
        setInputText(msg.text);
        setEditingId(msg.id);
        setSelectedMessageId(null);
        inputRef.current?.focus();
    };

    const handleDelete = (msgId: string) => {
        Alert.alert(
            "ลบข้อความ",
            "คุณต้องการลบข้อความนี้หรือไม่?",
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ลบ",
                    style: "destructive",
                    onPress: () => deleteMessage && deleteMessage(msgId)
                }
            ]
        );
        setSelectedMessageId(null);
    };

    const handleReply = (msg: ChatMessage) => {
        setReplyTo({
            id: msg.id,
            text: msg.text.length > 40 ? msg.text.substring(0, 40) + '...' : msg.text,
            sender: msg.sender
        });
        setSelectedMessageId(null);
        inputRef.current?.focus();
    };

    const handleReaction = (messageId: string, emoji: string) => {
        const msg = messages.find(m => m.id === messageId);
        if (!msg) return;

        const hasReacted = msg.reactions?.[emoji]?.includes(currentUserId);
        if (hasReacted) {
            removeReaction(messageId, emoji);
        } else {
            addReaction(messageId, emoji);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setInputText('');
        inputRef.current?.blur();
    };

    const handleCancelReply = () => {
        setReplyTo(null);
    };

    if (!visible) return null;

    const renderMessage = ({ item }: { item: ChatMessage & { isGrouped?: boolean } }) => {
        const isSelf = item.isSelf;
        const isSelected = selectedMessageId === item.id;
        const showPickerForThis = showReactionPicker === item.id;

        return (
            <View style={[styles.messageWrapper, isSelected && styles.messageSelected]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setSelectedMessageId(isSelected ? null : item.id)}
                    onLongPress={() => setSelectedMessageId(item.id)}
                    style={[styles.messageRow, item.isGrouped && styles.messageRowCompact]}
                >
                    {/* Avatar */}
                    {!item.isGrouped ? (
                        <LinearGradient
                            colors={isSelf ? ['#4cff00', '#2a9d2a'] : ['#66c0f4', '#1b6fa4']}
                            style={styles.messageAvatar}
                        >
                            <Text style={styles.avatarLetter}>
                                {item.sender.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    ) : (
                        <View style={styles.avatarSpacer} />
                    )}

                    {/* Content */}
                    <View style={styles.messageBody}>
                        {/* Header */}
                        {!item.isGrouped && (
                            <View style={styles.messageHeader}>
                                <Text style={[styles.senderText, isSelf && styles.senderTextSelf]}>
                                    {item.sender}
                                </Text>
                                <Text style={styles.timeText}>
                                    {new Date(item.timestamp).toLocaleTimeString('th-TH', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                                {item.isEdited && (
                                    <Text style={styles.editedLabel}>(แก้ไขแล้ว)</Text>
                                )}
                            </View>
                        )}

                        {/* Reply reference */}
                        {item.replyTo && (
                            <View style={styles.replyRef}>
                                <View style={styles.replyLine} />
                                <View style={styles.replyRefContent}>
                                    <Text style={styles.replyRefSender}>↩ {item.replyTo.sender}</Text>
                                    <Text style={styles.replyRefText} numberOfLines={1}>
                                        {item.replyTo.text}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Message bubble */}
                        <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
                            <Text style={styles.messageText}>{item.text}</Text>
                        </View>

                        {/* Reactions */}
                        <MessageReactions
                            reactions={item.reactions || {}}
                            onReactionPress={(emoji) => handleReaction(item.id, emoji)}
                            currentUserId={currentUserId}
                        />
                    </View>
                </TouchableOpacity>

                {/* Action buttons */}
                {isSelected && (
                    <View style={styles.actionBar}>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => setShowReactionPicker(showPickerForThis ? null : item.id)}
                        >
                            <Text style={styles.actionIcon}>😊</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => handleReply(item)}
                        >
                            <Ionicons name="arrow-undo" size={18} color="#8f98a0" />
                        </TouchableOpacity>
                        {isSelf && (
                            <>
                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => handleEdit(item)}
                                >
                                    <Ionicons name="create" size={18} color="#8f98a0" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => handleDelete(item.id)}
                                >
                                    <Ionicons name="trash" size={18} color="#c94a4a" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {/* Reaction picker */}
                {showPickerForThis && (
                    <ReactionPicker
                        onSelect={(emoji) => handleReaction(item.id, emoji)}
                        onClose={() => setShowReactionPicker(null)}
                    />
                )}
            </View>
        );
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.container}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

                    <View style={styles.chatLayout}>
                        {/* Users panel */}
                        {showUsers && (
                            <ActiveUsersPanel
                                users={onlineUsersList}
                                onClose={() => setShowUsers(false)}
                            />
                        )}

                        <View style={styles.chatWindow}>
                            {/* Header */}
                            <LinearGradient
                                colors={['#1b2838', '#171a21']}
                                style={styles.header}
                            >
                                <View style={styles.headerLeft}>
                                    <Text style={styles.headerIcon}>💬</Text>
                                    <View>
                                        <Text style={styles.headerTitle}>Community Chat</Text>
                                        <Text style={styles.headerSub}>
                                            {isConnected ? `🟢 ${onlineUsers} คนออนไลน์` : '⚪ กำลังเชื่อมต่อ...'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.headerActions}>
                                    <TouchableOpacity
                                        style={styles.headerBtn}
                                        onPress={() => setShowUsers(!showUsers)}
                                    >
                                        <Ionicons name="people" size={22} color="#66c0f4" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
                                        <Ionicons name="close" size={24} color="#8f98a0" />
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>

                            {/* Connection banner */}
                            {!isConnected && (
                                <View style={styles.connectionBar}>
                                    <Ionicons name="wifi" size={16} color="#faa61a" />
                                    <Text style={styles.connectionText}>กำลังเชื่อมต่อ...</Text>
                                </View>
                            )}

                            {/* Messages */}
                            <FlatList
                                ref={flatListRef}
                                data={groupedMessages}
                                renderItem={renderMessage}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.messageList}
                                showsVerticalScrollIndicator={false}
                                onContentSizeChange={() => {
                                    if (!editingId) flatListRef.current?.scrollToEnd({ animated: true });
                                }}
                            />

                            {/* Typing indicator */}
                            <TypingIndicator users={typingUsers} />

                            {/* Reply preview */}
                            {replyTo && (
                                <View style={styles.replyBanner}>
                                    <View style={styles.replyBannerContent}>
                                        <Text style={styles.replyBannerLabel}>
                                            ตอบกลับ <Text style={styles.replyBannerName}>{replyTo.sender}</Text>
                                        </Text>
                                        <Text style={styles.replyBannerText} numberOfLines={1}>
                                            {replyTo.text}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={handleCancelReply} style={styles.replyBannerClose}>
                                        <Ionicons name="close-circle" size={22} color="#8f98a0" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Edit mode */}
                            {editingId && (
                                <View style={styles.editBanner}>
                                    <Ionicons name="create" size={18} color="#4cff00" />
                                    <Text style={styles.editBannerText}>กำลังแก้ไขข้อความ</Text>
                                    <TouchableOpacity onPress={handleCancelEdit}>
                                        <Text style={styles.editCancelBtn}>ยกเลิก</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Input area */}
                            <View style={styles.inputContainer}>
                                <TextInput
                                    ref={inputRef}
                                    style={styles.textInput}
                                    value={inputText}
                                    onChangeText={handleInputChange}
                                    placeholder={editingId ? "แก้ไขข้อความ..." : "พิมพ์ข้อความ..."}
                                    placeholderTextColor="#4e5a65"
                                    onSubmitEditing={handleSend}
                                    returnKeyType="send"
                                    multiline
                                />
                                {inputText.trim() ? (
                                    <TouchableOpacity
                                        style={styles.sendBtn}
                                        onPress={handleSend}
                                        disabled={!isConnected}
                                    >
                                        <LinearGradient
                                            colors={['#4cff00', '#2a9d2a']}
                                            style={styles.sendBtnGradient}
                                        >
                                            <Ionicons name="send" size={18} color="#fff" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.emojiBtn}>
                                        <Text style={styles.emojiBtnText}>😊</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    backdrop: {
        flex: 1,
    },
    chatLayout: {
        flexDirection: 'row',
        height: '100%',
    },
    chatWindow: {
        width: 400,
        backgroundColor: '#171a21',
        height: '100%',
        flexDirection: 'column',
        paddingTop: Platform.OS === 'ios' ? 44 : 0,
        borderLeftWidth: 1,
        borderLeftColor: '#2a475e',
    },
    // Header
    header: {
        height: 64,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#2a475e',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 28,
        marginRight: 12,
    },
    headerTitle: {
        color: '#c6d4df',
        fontWeight: 'bold',
        fontSize: 17,
    },
    headerSub: {
        color: '#8f98a0',
        fontSize: 12,
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(102,192,244,0.1)',
    },
    // Connection bar
    connectionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1b2838',
        padding: 8,
        gap: 8,
    },
    connectionText: {
        color: '#faa61a',
        fontSize: 13,
    },
    // Message list
    messageList: {
        padding: 12,
        paddingBottom: 8,
    },
    messageWrapper: {
        marginBottom: 4,
    },
    messageSelected: {
        backgroundColor: 'rgba(102,192,244,0.08)',
        borderRadius: 8,
        marginHorizontal: -8,
        paddingHorizontal: 8,
    },
    messageRow: {
        flexDirection: 'row',
        paddingVertical: 6,
    },
    messageRowCompact: {
        paddingTop: 2,
    },
    messageAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarLetter: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    avatarSpacer: {
        width: 36,
        marginRight: 12,
    },
    messageBody: {
        flex: 1,
    },
    messageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    senderText: {
        color: '#66c0f4',
        fontWeight: '600',
        fontSize: 14,
        marginRight: 8,
    },
    senderTextSelf: {
        color: '#4cff00',
    },
    timeText: {
        color: '#4e5a65',
        fontSize: 11,
    },
    editedLabel: {
        color: '#4e5a65',
        fontSize: 10,
        marginLeft: 6,
        fontStyle: 'italic',
    },
    // Bubble
    bubble: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        maxWidth: '95%',
    },
    bubbleSelf: {
        backgroundColor: '#1b3a2f',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: '#1b2838',
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 12,
    },
    messageText: {
        color: '#c6d4df',
        fontSize: 14,
        lineHeight: 20,
    },
    // Reply reference
    replyRef: {
        flexDirection: 'row',
        marginBottom: 6,
        alignItems: 'stretch',
    },
    replyLine: {
        width: 3,
        backgroundColor: '#66c0f4',
        borderRadius: 2,
        marginRight: 8,
    },
    replyRefContent: {
        flex: 1,
    },
    replyRefSender: {
        color: '#66c0f4',
        fontSize: 11,
        fontWeight: '600',
    },
    replyRefText: {
        color: '#8f98a0',
        fontSize: 12,
    },
    // Reactions
    reactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 6,
        gap: 6,
    },
    reactionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1b2838',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#2a475e',
    },
    reactionChipActive: {
        borderColor: '#4cff00',
        backgroundColor: 'rgba(76,255,0,0.1)',
    },
    chipEmoji: {
        fontSize: 14,
    },
    chipCount: {
        color: '#8f98a0',
        fontSize: 12,
        marginLeft: 4,
    },
    chipCountActive: {
        color: '#4cff00',
    },
    // Action bar
    actionBar: {
        flexDirection: 'row',
        paddingLeft: 48,
        marginTop: 4,
        gap: 4,
    },
    actionItem: {
        padding: 8,
        backgroundColor: '#1b2838',
        borderRadius: 6,
    },
    actionIcon: {
        fontSize: 16,
    },
    // Reaction picker
    reactionPicker: {
        backgroundColor: '#1b2838',
        borderRadius: 12,
        padding: 8,
        marginTop: 8,
        marginLeft: 48,
        borderWidth: 1,
        borderColor: '#2a475e',
    },
    reactionPickerRow: {
        flexDirection: 'row',
        gap: 4,
    },
    reactionBtn: {
        padding: 8,
        borderRadius: 8,
    },
    reactionBtnText: {
        fontSize: 22,
    },
    // Typing
    typingContainer: {
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    typingText: {
        color: '#8f98a0',
        fontSize: 12,
        fontStyle: 'italic',
    },
    // Reply banner
    replyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1b2838',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#2a475e',
    },
    replyBannerContent: {
        flex: 1,
    },
    replyBannerLabel: {
        color: '#8f98a0',
        fontSize: 12,
    },
    replyBannerName: {
        color: '#66c0f4',
        fontWeight: '600',
    },
    replyBannerText: {
        color: '#4e5a65',
        fontSize: 13,
    },
    replyBannerClose: {
        padding: 4,
    },
    // Edit banner
    editBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1b2838',
        padding: 12,
        gap: 8,
    },
    editBannerText: {
        flex: 1,
        color: '#8f98a0',
        fontSize: 13,
    },
    editCancelBtn: {
        color: '#66c0f4',
        fontSize: 13,
        fontWeight: '600',
    },
    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        backgroundColor: '#171a21',
        borderTopWidth: 1,
        borderTopColor: '#2a475e',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#1b2838',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#c6d4df',
        fontSize: 14,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: '#2a475e',
    },
    sendBtn: {
        marginLeft: 8,
    },
    sendBtnGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiBtn: {
        marginLeft: 8,
        padding: 8,
    },
    emojiBtnText: {
        fontSize: 24,
    },
    // Users panel
    usersPanel: {
        width: 200,
        backgroundColor: '#1b2838',
        height: '100%',
        borderRightWidth: 1,
        borderRightColor: '#2a475e',
    },
    usersPanelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2a475e',
    },
    usersPanelTitle: {
        color: '#c6d4df',
        fontWeight: '600',
        fontSize: 13,
    },
    closePanelBtn: {
        padding: 4,
    },
    usersList: {
        flex: 1,
        padding: 8,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        marginBottom: 4,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    userAvatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: '#c6d4df',
        fontSize: 13,
        fontWeight: '500',
    },
    userStatus: {
        color: '#4cff00',
        fontSize: 11,
    },
});
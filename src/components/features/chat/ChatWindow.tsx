import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Send, MessageCircle, X, Minimize2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function ChatWindow() {
    const { messages, sendMessage, isConnected, onlineCount, username } = useChat(); // Removed unused currentChannel
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        await sendMessage(inputValue);
        setInputValue('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-transform hover:scale-110 active:scale-95 group"
            >
                <MessageCircle className="w-6 h-6 text-primary-foreground" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    {isConnected && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={cn("relative inline-flex rounded-full h-3 w-3", isConnected ? "bg-emerald-500" : "bg-destructive")}></span>
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[350px] h-[500px] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-muted/40 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500" : "bg-destructive")} />
                    <h3 className="font-bold text-foreground text-sm">Global Chat</h3>
                    <div className="flex items-center gap-1 ml-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{onlineCount}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                        <Minimize2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2">
                        <MessageCircle className="w-8 h-8 opacity-20" />
                        <p>No messages yet. Say hello!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender === username;
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex flex-col max-w-[85%]",
                                    isMe ? "ml-auto items-end" : "items-start"
                                )}
                            >
                                {!isMe && <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">{msg.sender}</span>}
                                <div className={cn(
                                    "px-3 py-2 rounded-lg text-sm break-words shadow-sm",
                                    isMe
                                        ? "bg-primary text-primary-foreground rounded-tr-none font-medium"
                                        : "bg-muted text-foreground border border-border/50 rounded-tl-none"
                                )}>
                                    {msg.text}
                                </div>
                                <span className="text-[9px] text-muted-foreground mt-0.5 mx-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-muted/40 border-t border-border">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    <Button
                        type="submit"
                        disabled={!isConnected || !inputValue.trim()}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 h-auto"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                {!isConnected && (
                    <p className="text-[10px] text-destructive mt-1 text-center">Connecting to chat server...</p>
                )}
            </form>
        </div>
    );
}

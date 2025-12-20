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
                className="fixed bottom-6 right-6 z-50 p-4 bg-[#66c0f4] rounded-full shadow-lg hover:bg-[#4a90e2] transition-transform hover:scale-110 active:scale-95 group"
            >
                <MessageCircle className="w-6 h-6 text-[#1b2838]" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    {isConnected && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    )}
                    <span className={cn("relative inline-flex rounded-full h-3 w-3", isConnected ? "bg-green-500" : "bg-red-500")}></span>
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[350px] h-[500px] bg-[#1b2838] border border-[#2a475e] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-[#171a21] border-b border-[#2a475e]">
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-[#4cff00]" : "bg-red-500")} />
                    <h3 className="font-bold text-[#dcdedf] text-sm">Global Chat</h3>
                    <div className="flex items-center gap-1 ml-2 text-xs text-[#6e7681]">
                        <Users className="w-3 h-3" />
                        <span>{onlineCount}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-[#2a475e] rounded text-[#6e7681] hover:text-[#dcdedf]">
                        <Minimize2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-[#c92a2a] rounded text-[#6e7681] hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#2a475e] scrollbar-track-[#171a21] bg-[#171a21]/50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#6e7681] text-xs gap-2">
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
                                {!isMe && <span className="text-[10px] text-[#8b929a] mb-0.5 ml-1">{msg.sender}</span>}
                                <div className={cn(
                                    "px-3 py-2 rounded-lg text-sm break-words shadow-sm",
                                    isMe
                                        ? "bg-[#66c0f4] text-[#1b2838] rounded-tr-none"
                                        : "bg-[#2a475e] text-[#dcdedf] rounded-tl-none"
                                )}>
                                    {msg.text}
                                </div>
                                <span className="text-[9px] text-[#6e7681] mt-0.5 mx-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-[#171a21] border-t border-[#2a475e]">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-[#1b2838] border border-[#2a475e] rounded px-3 py-2 text-sm text-[#dcdedf] placeholder-[#6e7681] focus:outline-none focus:border-[#66c0f4] transition-colors"
                    />
                    <Button
                        type="submit"
                        disabled={!isConnected || !inputValue.trim()}
                        className="bg-[#66c0f4] hover:bg-[#4a90e2] text-[#1b2838] p-2 h-auto"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                {!isConnected && (
                    <p className="text-[10px] text-red-400 mt-1 text-center">Connecting to chat server...</p>
                )}
            </form>
        </div>
    );
}

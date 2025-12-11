import React, { useState, useRef, useEffect } from 'react';
import yukonImage from '../assets/yukon.png';
import { PaperAirplaneIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

const YukonAssistant = ({ contextData = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'yukon',
            text: "Hello! I'm Yukon, your kitchen assistant. Ask me about active orders, inventory, or staff status."
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const userMessage = {
            id: Date.now(),
            sender: 'user',
            text: text.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        // Simulate backend delay or fetch real API
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await fetch(`${API_URL}/api/yukon/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage.text,
                    context: contextData
                })
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const data = await response.json();

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'yukon',
                text: data.reply || "I'm having trouble connecting to my brain right now."
            }]);

        } catch (error) {
            console.error("Yukon Error:", error);
            // Fallback for demo if backend isn't ready
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    sender: 'yukon',
                    text: "I'm currently offline, but I can tell you that I'm being built right now!"
                }]);
            }, 1000);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    // Quick Actions
    const quickActions = [
        { label: 'Inventory', query: 'Check inventory status', icon: '🗃️' },
        { label: 'Occupancy', query: 'Check occupancy and reservations', icon: '🪑' },
        { label: 'Analytics', query: 'Show me active order stats', icon: '📊' },
        { label: 'Employees', query: 'Who is working today?', icon: '🧑‍🍳' },
    ];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 group hover:scale-105 transition-transform duration-300"
            >
                <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-brand-orange shadow-[0_0_20px_rgba(227,85,4,0.5)] bg-black">
                        <img src={yukonImage} alt="Yukon AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Ask Yukon
                    </div>
                </div>
            </button>
        );
    }

    return (
        <div className={`fixed z-50 transition-all duration-300 ease-in-out shadow-2xl border border-white/10 overflow-hidden flex flex-col font-sans
      ${isMinimized
                ? 'bottom-6 right-6 w-72 h-14 rounded-2xl bg-dark-card'
                : 'bottom-6 right-6 w-80 md:w-96 h-[500px] max-h-[80vh] rounded-2xl bg-[#1a1a1a]/95 backdrop-blur-xl'
            }`}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 bg-gradient-to-r from-brand-orange/20 to-transparent border-b border-white/5 cursor-pointer"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-brand-orange/50">
                        <img src={yukonImage} alt="Yukon" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Yukon Assistant</h3>
                        <span className="text-green-500 text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                        className="text-gray-400 hover:text-white p-1"
                    >
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        className="text-gray-400 hover:text-red-400 p-1"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* QUICK ACTION TOOLBAR */}
            {!isMinimized && (
                <div className="flex flex-col border-b border-white/5 bg-black/20">
                    <div className="flex justify-around p-3">
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => sendMessage(action.query)}
                                className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-lg hover:scale-110 transition-all shadow-sm group relative"
                                title={action.label}
                            >
                                <span>{action.icon}</span>
                            </button>
                        ))}
                    </div>

                    {/* STATUS INFO STRIP */}
                    <div className="flex items-center justify-around px-2 py-1.5 text-[10px] sm:text-xs bg-white/5 text-gray-400">
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></span>
                            <span className="font-bold text-gray-200">{contextData.stats?.pending || 0}</span> New
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                            <span className="font-bold text-gray-200">{contextData.stats?.preparing || 0}</span> Prep
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            <span className="font-bold text-gray-200">{contextData.stats?.ready || 0}</span> Ready
                        </div>
                        <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
                            <span className="font-bold text-brand-lime">{contextData.stats?.totalOrders || 0}</span> Active
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Area */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
                                ${msg.sender === 'user'
                                            ? 'bg-brand-orange text-white rounded-tr-none'
                                            : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-white/5 bg-black/20">
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask Yukon..."
                                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-brand-orange/50 focus:bg-white/10 transition-all placeholder:text-gray-500 text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isTyping}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default YukonAssistant;

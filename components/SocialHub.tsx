import React, { useState, useEffect } from 'react';
import { User, Post, ChatSession, Message, Book } from '../types';
import { Button } from './Button';
import { interactWithPersona } from '../services/geminiService';
import { MessageSquare, Heart, Send, Users, User as UserIcon, Bot, Sparkles, Zap, Shield, BookOpen, Clock } from 'lucide-react';

interface SocialHubProps {
    currentUser: User;
    allBooks: Book[];
}

export const SocialHub: React.FC<SocialHubProps> = ({ currentUser, allBooks }) => {
    const [activeTab, setActiveTab] = useState<'feed' | 'chats'>('feed');
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    
    // Chat States
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);

    // Mock initial data
    useEffect(() => {
        // Mock Posts if empty
        if (posts.length === 0) {
            setPosts([
                {
                    id: '1',
                    userId: 'nexus_system',
                    userName: 'Nexus Oficial',
                    content: 'Bem-vindo ao Nexus Social! Conecte-se com autores e nossas IAs residentes.',
                    timestamp: Date.now() - 100000,
                    likes: [],
                    comments: [],
                    type: 'announcement'
                }
            ]);
        }
        
        // Setup AI Personas
        if (chats.length === 0) {
            setChats([
                { id: 'ai-muse', participants: [currentUser.id, 'ai-muse'], isAI: true, aiPersona: 'muse', messages: [], lastMessageAt: Date.now() },
                { id: 'ai-critic', participants: [currentUser.id, 'ai-critic'], isAI: true, aiPersona: 'critic', messages: [], lastMessageAt: Date.now() },
                { id: 'ai-guardian', participants: [currentUser.id, 'ai-guardian'], isAI: true, aiPersona: 'guardian', messages: [], lastMessageAt: Date.now() }
            ]);
        }
    }, []);

    const handleCreatePost = () => {
        if (!newPostContent.trim()) return;
        const newPost: Post = {
            id: crypto.randomUUID(),
            userId: currentUser.id,
            userName: currentUser.name,
            content: newPostContent,
            timestamp: Date.now(),
            likes: [],
            comments: [],
            type: 'thought'
        };
        setPosts([newPost, ...posts]);
        setNewPostContent('');
    };

    const handleLikePost = (postId: string) => {
        setPosts(posts.map(p => {
            if (p.id === postId) {
                const likes = p.likes.includes(currentUser.id) 
                    ? p.likes.filter(id => id !== currentUser.id)
                    : [...p.likes, currentUser.id];
                return { ...p, likes };
            }
            return p;
        }));
    };

    const handleSendMessage = async () => {
        if (!activeChatId || !messageInput.trim()) return;
        
        const activeChat = chats.find(c => c.id === activeChatId);
        if (!activeChat) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            senderId: currentUser.id,
            content: messageInput,
            timestamp: Date.now()
        };

        const updatedChats = chats.map(c => 
            c.id === activeChatId 
                ? { ...c, messages: [...c.messages, userMsg], lastMessageAt: Date.now() } 
                : c
        );
        setChats(updatedChats);
        setMessageInput('');

        // AI Response Logic
        if (activeChat.isAI && activeChat.aiPersona) {
            setIsAiTyping(true);
            const history = activeChat.messages.map(m => m.content);
            const response = await interactWithPersona(userMsg.content, activeChat.aiPersona, history);
            
            const aiMsg: Message = {
                id: crypto.randomUUID(),
                senderId: activeChat.aiPersona, // AI ID matches persona
                content: response,
                timestamp: Date.now()
            };

            setChats(prev => prev.map(c => 
                c.id === activeChatId 
                    ? { ...c, messages: [...c.messages, aiMsg], lastMessageAt: Date.now() } 
                    : c
            ));
            setIsAiTyping(false);
        }
    };

    const renderPersonaIcon = (persona?: string) => {
        switch(persona) {
            case 'muse': return <Sparkles size={20} className="text-purple-400" />;
            case 'critic': return <Zap size={20} className="text-yellow-400" />;
            case 'guardian': return <Shield size={20} className="text-cyan-400" />;
            default: return <Bot size={20} className="text-slate-400" />;
        }
    };

    const getPersonaName = (persona?: string) => {
        switch(persona) {
            case 'muse': return 'A Musa';
            case 'critic': return 'O Crítico';
            case 'guardian': return 'O Guardião';
            default: return 'Nexus AI';
        }
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            {/* Sidebar Navigation */}
            <div className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 font-serif font-bold text-amber-500 hidden md:block">
                    NEXUS SOCIAL
                </div>
                
                <nav className="p-2 space-y-1">
                    <button 
                        onClick={() => setActiveTab('feed')}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'feed' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                        <Users size={20} />
                        <span className="hidden md:inline font-medium">Feed Global</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('chats')}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'chats' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                        <MessageSquare size={20} />
                        <span className="hidden md:inline font-medium">Conexões</span>
                    </button>
                </nav>

                {activeTab === 'chats' && (
                    <div className="mt-4 px-2 flex-1 overflow-y-auto">
                        <div className="text-xs font-bold text-slate-500 uppercase px-2 mb-2 hidden md:block">Sintéticos (IA)</div>
                        {chats.filter(c => c.isAI).map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => setActiveChatId(chat.id)}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg mb-1 transition-colors ${activeChatId === chat.id ? 'bg-slate-800 border-l-2 border-amber-500' : 'hover:bg-slate-800/50'}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
                                    {renderPersonaIcon(chat.aiPersona)}
                                </div>
                                <div className="hidden md:block text-left">
                                    <div className={`text-sm font-bold ${activeChatId === chat.id ? 'text-white' : 'text-slate-300'}`}>{getPersonaName(chat.aiPersona)}</div>
                                    <div className="text-[10px] text-slate-500 truncate">Sempre disponível</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-slate-950/50">
                {activeTab === 'feed' ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 max-w-3xl mx-auto w-full">
                        {/* Post Creator */}
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-8 shadow-lg">
                            <textarea 
                                className="w-full bg-transparent border-none focus:ring-0 text-slate-300 placeholder-slate-500 resize-none h-24"
                                placeholder="O que você está escrevendo hoje?"
                                value={newPostContent}
                                onChange={e => setNewPostContent(e.target.value)}
                            />
                            <div className="flex justify-between items-center pt-2 border-t border-slate-800 mt-2">
                                <div className="text-xs text-slate-500">Compartilhe com a comunidade</div>
                                <Button size="sm" variant="gold" onClick={handleCreatePost} icon={<Send size={14}/>}>Publicar</Button>
                            </div>
                        </div>

                        {/* Posts Feed */}
                        <div className="space-y-6">
                            {posts.map(post => (
                                <div key={post.id} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                                    <div className="p-4 flex gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-amber-500 font-bold border border-slate-700">
                                            {post.userName[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-200">{post.userName}</span>
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">Autor</span>
                                                <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                                                    <Clock size={12}/> {new Date(post.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className="text-slate-300 mt-2 text-sm leading-relaxed">{post.content}</p>
                                            
                                            {post.bookTitle && (
                                                <div className="mt-3 p-3 bg-slate-950 rounded border border-slate-800 flex items-center gap-3">
                                                    <div className="bg-amber-900/20 p-2 rounded text-amber-500"><BookOpen size={20}/></div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase">Projeto Mencionado</div>
                                                        <div className="font-serif font-bold text-slate-200">{post.bookTitle}</div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-4 mt-4 pt-3 border-t border-slate-800/50">
                                                <button 
                                                    onClick={() => handleLikePost(post.id)}
                                                    className={`flex items-center gap-1.5 text-xs transition-colors ${post.likes.includes(currentUser.id) ? 'text-red-500' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    <Heart size={16} fill={post.likes.includes(currentUser.id) ? "currentColor" : "none"}/>
                                                    {post.likes.length}
                                                </button>
                                                <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                                                    <MessageSquare size={16} />
                                                    {post.comments.length}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full">
                        {/* Chat Area */}
                        {activeChatId ? (
                            <div className="flex-1 flex flex-col h-full">
                                {(() => {
                                    const chat = chats.find(c => c.id === activeChatId);
                                    if (!chat) return null;
                                    const isPersona = chat.isAI;
                                    
                                    return (
                                        <>
                                            {/* Chat Header */}
                                            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isPersona ? 'bg-slate-950 border-cyan-500/30' : 'bg-slate-800 border-amber-500/30'}`}>
                                                    {isPersona ? renderPersonaIcon(chat.aiPersona) : <UserIcon className="text-amber-500"/>}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                                                        {isPersona ? getPersonaName(chat.aiPersona) : 'Usuário'}
                                                        {isPersona && <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded uppercase">Sintético</span>}
                                                    </h3>
                                                    <p className="text-xs text-slate-500">{isPersona ? 'Online no Nexus Core' : 'Online'}</p>
                                                </div>
                                            </div>

                                            {/* Messages */}
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                                                {chat.messages.map(msg => {
                                                    const isMe = msg.senderId === currentUser.id;
                                                    return (
                                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                                                                isMe 
                                                                    ? 'bg-amber-600 text-white rounded-br-none' 
                                                                    : isPersona 
                                                                        ? 'bg-slate-900 border border-cyan-900/30 text-cyan-100 rounded-bl-none shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                                                                        : 'bg-slate-800 text-slate-200 rounded-bl-none'
                                                            }`}>
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {isAiTyping && (
                                                    <div className="flex justify-start">
                                                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-bl-none text-xs text-slate-500 animate-pulse">
                                                            Digitando...
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Input */}
                                            <div className="p-4 bg-slate-900 border-t border-slate-800">
                                                <div className="flex gap-2">
                                                    <input 
                                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-amber-500 outline-none placeholder-slate-600"
                                                        placeholder="Digite sua mensagem..."
                                                        value={messageInput}
                                                        onChange={e => setMessageInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                                    />
                                                    <Button variant={isPersona ? 'secondary' : 'gold'} onClick={handleSendMessage} disabled={isAiTyping}>
                                                        <Send size={18} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                                    <MessageSquare size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-300 mb-2">Conexões Nexus</h3>
                                <p className="max-w-xs">Selecione uma persona IA à esquerda para obter feedback, inspiração ou apenas conversar.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
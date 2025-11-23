import React, { useState } from 'react';
import { Book, User, Comment } from '../types';
import { Download, Heart, MessageSquare, X, Send, User as UserIcon, ChevronDown } from 'lucide-react';
import { Button } from './Button';

interface BookReaderProps {
    book: Book;
    currentUser: User;
    onClose: () => void;
    onUpdateBook: (book: Book) => void;
}

export const BookReader: React.FC<BookReaderProps> = ({ book, currentUser, onClose, onUpdateBook }) => {
    const [commentText, setCommentText] = useState('');
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const [showMobileComments, setShowMobileComments] = useState(false);

    const activeChapter = book.chapters[activeChapterIndex];
    const isLiked = book.likes?.includes(currentUser.id);

    const handleLike = () => {
        const currentLikes = book.likes || [];
        const newLikes = isLiked 
            ? currentLikes.filter(id => id !== currentUser.id)
            : [...currentLikes, currentUser.id];
        
        onUpdateBook({ ...book, likes: newLikes });
    };

    const handleComment = () => {
        if (!commentText.trim()) return;
        const newComment: Comment = {
            id: crypto.randomUUID(),
            userId: currentUser.id,
            userName: currentUser.name,
            content: commentText,
            timestamp: Date.now()
        };
        onUpdateBook({ ...book, comments: [newComment, ...(book.comments || [])] });
        setCommentText('');
    };

    const handleDownload = () => {
        // Simple download simulation - creates a text file
        let content = `TÍTULO: ${book.title}\nAUTOR: ${book.authorName}\n\n`;
        book.chapters.forEach(ch => {
            content += `\n--- ${ch.title} ---\n\n`;
            if (book.type === 'comic') {
                ch.panels?.forEach((p, i) => {
                    content += `[Painel ${i+1}]: ${p.description}\n${p.speaker || 'Narrador'}: ${p.dialogue}\n\n`;
                });
            } else {
                content += ch.content + "\n";
            }
        });

        const element = document.createElement("a");
        const file = new Blob([content], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `${book.title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(element);
        element.click();
    };

    const CommentSection = () => (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-800 font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-2"><MessageSquare size={18} /> Discussão</span>
                <button className="lg:hidden text-slate-500" onClick={() => setShowMobileComments(false)}><ChevronDown size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(book.comments || []).length === 0 && (
                    <div className="text-center text-slate-600 py-10 text-sm">Seja o primeiro a criticar esta obra-prima.</div>
                )}
                {(book.comments || []).map(comment => (
                    <div key={comment.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs text-amber-500 font-bold">
                                {comment.userName[0]}
                            </div>
                            <span className="text-xs text-slate-300 font-bold">{comment.userName}</span>
                            <span className="text-[10px] text-slate-600 ml-auto">{new Date(comment.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-400">{comment.content}</p>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900 pb-safe">
                <div className="flex gap-2">
                    <input 
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                        placeholder="Adicionar reação..."
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleComment()}
                    />
                    <button onClick={handleComment} className="bg-amber-600 text-white p-2 rounded hover:bg-amber-500 transition-colors">
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 bg-slate-900 shadow-lg shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
                    <div className="overflow-hidden">
                        <h2 className="font-serif font-bold text-lg md:text-xl text-amber-500 truncate">{book.title}</h2>
                        <span className="text-slate-500 text-xs hidden md:inline-block border-l border-slate-700 pl-4">por {book.authorName}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button 
                        onClick={handleLike}
                        className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-all ${isLiked ? 'bg-red-900/30 text-red-500' : 'bg-slate-800 text-slate-400 hover:text-red-400'}`}
                    >
                        <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                        <span className="font-bold text-sm hidden md:inline">{(book.likes || []).length}</span>
                    </button>
                    
                    <button 
                        onClick={() => setShowMobileComments(true)}
                        className="lg:hidden p-2 rounded-full bg-slate-800 text-slate-400 relative"
                    >
                        <MessageSquare size={18} />
                        {(book.comments || []).length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                                {(book.comments || []).length}
                            </span>
                        )}
                    </button>

                    <div className="hidden md:block">
                        <Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={handleDownload}>
                            Baixar
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Reader Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-950">
                    <div className="max-w-3xl mx-auto space-y-8 pb-20">
                        {book.type === 'comic' ? (
                            <div className="space-y-12">
                                {activeChapter?.panels?.map((panel) => (
                                    <div key={panel.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
                                        <div className="aspect-video bg-black flex items-center justify-center">
                                            {panel.imageUrl ? (
                                                <img src={panel.imageUrl} className="max-h-full max-w-full object-contain" />
                                            ) : (
                                                <span className="text-slate-700 italic">Carregando imagem...</span>
                                            )}
                                        </div>
                                        <div className="p-4 md:p-6">
                                            {panel.speaker && <div className="text-amber-500 text-xs font-bold uppercase mb-1">{panel.speaker}</div>}
                                            <div className="font-serif text-base md:text-lg text-slate-200">"{panel.dialogue}"</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="font-serif text-lg leading-loose text-slate-300 space-y-6">
                                <h3 className="text-2xl font-bold text-amber-500 mb-8 border-b border-amber-500/20 pb-4">{activeChapter?.title}</h3>
                                <div className="whitespace-pre-wrap">{activeChapter?.content}</div>
                            </div>
                        )}
                        
                        {/* Navigation */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between pt-10 border-t border-slate-800">
                            <Button 
                                variant="secondary" 
                                disabled={activeChapterIndex === 0}
                                onClick={() => setActiveChapterIndex(i => i - 1)}
                                className="w-full md:w-auto"
                            >
                                Anterior
                            </Button>
                            <span className="text-slate-500 text-sm self-center">Capítulo {activeChapterIndex + 1} de {book.chapters.length}</span>
                            <Button 
                                variant="secondary" 
                                disabled={activeChapterIndex === book.chapters.length - 1}
                                onClick={() => setActiveChapterIndex(i => i + 1)}
                                className="w-full md:w-auto"
                            >
                                Próximo
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Social Sidebar (Desktop) */}
                <div className="hidden lg:flex w-80 bg-slate-900 border-l border-slate-800 flex-col shrink-0">
                   <CommentSection />
                </div>

                {/* Social Drawer (Mobile) */}
                {showMobileComments && (
                    <div className="lg:hidden absolute inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
                         <div className="bg-slate-900 w-full h-[80%] sm:h-[600px] sm:w-[400px] sm:rounded-xl rounded-t-xl shadow-2xl overflow-hidden flex flex-col border-t border-slate-700 animate-in slide-in-from-bottom duration-300">
                             <CommentSection />
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};
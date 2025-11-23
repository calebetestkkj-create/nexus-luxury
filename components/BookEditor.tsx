import React, { useState, useEffect } from 'react';
import { Book, Chapter, AIState, ReviewSuggestion, User, ComicPanel } from '../types';
import { generateChapterContent, improveText, reviewChapterContent, continueWriting, generateImage } from '../services/geminiService';
import { Save, Sparkles, ChevronLeft, Trash2, Plus, PenLine, CheckCheck, X as XIcon, Image as ImageIcon, Globe, Lock, Palette, MessageSquare, Menu, List, Settings } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface BookEditorProps {
  book: Book;
  user: User;
  onUpdateBook: (updatedBook: Book) => void;
  onPublishBook: (bookId: string, signature: string) => void;
  onBack: () => void;
}

type MobileTab = 'editor' | 'chapters' | 'settings';

export const BookEditor: React.FC<BookEditorProps> = ({ book, user, onUpdateBook, onPublishBook, onBack }) => {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(
    book.chapters.length > 0 ? book.chapters[0].id : null
  );
  
  const [activeChapter, setActiveChapter] = useState<Chapter | undefined>(
    book.chapters.find(c => c.id === activeChapterId)
  );

  const [aiState, setAiState] = useState<AIState>({ isGenerating: false, error: null });
  const [showAIMenu, setShowAIMenu] = useState(false);
  
  // Review System State
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);

  // Publish Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [signatureInput, setSignatureInput] = useState(user.signature || user.name);

  // Mobile State
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor');

  useEffect(() => {
    setActiveChapter(book.chapters.find(c => c.id === activeChapterId));
    setSuggestions([]);
    setIsReviewMode(false);
  }, [activeChapterId, book.chapters]);

  // Handle content changes
  const handleContentChange = (content: string) => {
    if (!activeChapter) return;
    const updatedChapters = book.chapters.map(ch => 
      ch.id === activeChapter.id 
        ? { ...ch, content: content, lastModified: Date.now() } 
        : ch
    );
    onUpdateBook({ ...book, chapters: updatedChapters, lastModified: Date.now() });
  };

  const handleUpdatePanels = (panels: ComicPanel[]) => {
    if (!activeChapter) return;
    const updatedChapters = book.chapters.map(ch => 
      ch.id === activeChapter.id 
        ? { ...ch, panels, lastModified: Date.now() } 
        : ch
    );
    onUpdateBook({ ...book, chapters: updatedChapters, lastModified: Date.now() });
  };

  // Add a new empty chapter
  const handleAddChapter = () => {
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: `Capítulo ${book.chapters.length + 1}`,
      content: '',
      panels: [],
      lastModified: Date.now()
    };
    onUpdateBook({ 
      ...book, 
      chapters: [...book.chapters, newChapter],
      lastModified: Date.now()
    });
    setActiveChapterId(newChapter.id);
    setMobileTab('editor'); // Switch back to editor on mobile
  };

  // Delete current chapter
  const handleDeleteChapter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (book.chapters.length <= 1) return;
    if (!window.confirm("Tem certeza que deseja excluir este capítulo?")) return;
    
    const updatedChapters = book.chapters.filter(ch => ch.id !== id);
    onUpdateBook({ ...book, chapters: updatedChapters });
    
    if (activeChapterId === id) {
      setActiveChapterId(updatedChapters.length > 0 ? updatedChapters[0].id : null);
    }
  };

  // AI Actions for Novels
  const handleGenerateContent = async () => {
    if (!activeChapter) return;
    setAiState({ isGenerating: true, error: null });

    try {
      const content = await generateChapterContent(
        book.title,
        activeChapter.title,
        activeChapter.summary || "Sem resumo fornecido.",
        activeChapter.content 
      );
      handleContentChange(activeChapter.content + (activeChapter.content ? "\n\n" : "") + content);
    } catch (err: any) {
      setAiState({ isGenerating: false, error: err.message || "Falha ao gerar conteúdo" });
    } finally {
      setAiState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  // AI Actions for Images (Cover)
  const handleGenerateCover = async () => {
    setAiState({ isGenerating: true, error: null });
    try {
        const prompt = `A cinematic, highly detailed book cover for a ${book.type} titled "${book.title}". 
        Description: ${book.description}. 
        Style: Luxury, Professional, ${book.type === 'comic' ? 'Comic Art' : 'Realistic'}.`;
        
        const base64Image = await generateImage(prompt);
        onUpdateBook({ ...book, coverImage: base64Image });
    } catch (err: any) {
        setAiState({ isGenerating: false, error: err.message || "Falha ao gerar capa" });
    } finally {
        setAiState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  // Comic Panel Actions
  const handleAddPanel = () => {
      if (!activeChapter) return;
      const newPanel: ComicPanel = {
          id: crypto.randomUUID(),
          description: '',
          dialogue: '',
          speaker: ''
      };
      handleUpdatePanels([...(activeChapter.panels || []), newPanel]);
  };

  const handleGeneratePanelArt = async (panelId: string, description: string) => {
      if(!description) return;
      setAiState({ isGenerating: true, error: null });
      try {
          const img = await generateImage(`Comic book panel: ${description}. Style: Detailed, ink and color.`);
          const updatedPanels = (activeChapter?.panels || []).map(p => 
            p.id === panelId ? { ...p, imageUrl: img } : p
          );
          handleUpdatePanels(updatedPanels);
      } catch (err: any) {
        setAiState({ isGenerating: false, error: err.message });
      } finally {
        setAiState(prev => ({ ...prev, isGenerating: false }));
      }
  };

  const handleReview = async () => {
      if (!activeChapter || book.type === 'comic') return;
      setIsReviewMode(true);
      setAiState({ isGenerating: true, error: null });
      try {
        const results = await reviewChapterContent(activeChapter.content);
        setSuggestions(results);
      } catch (err: any) {
          setAiState({ isGenerating: false, error: err.message });
      } finally {
          setAiState(prev => ({ ...prev, isGenerating: false }));
      }
  };

  // Helper to render sidebar content (used in both mobile and desktop views)
  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
             {/* Cover Image Area */}
             <div className="relative group w-32 h-48 mx-auto mb-4 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.2)] overflow-hidden bg-slate-800 border border-slate-700">
                {book.coverImage ? (
                    <img src={book.coverImage} alt="Capa" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <ImageIcon size={32} />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="gold" onClick={handleGenerateCover} isLoading={aiState.isGenerating}>
                        <Sparkles size={14} className="mr-1" /> Capa IA
                    </Button>
                </div>
             </div>

             <div className="text-center">
                 <h2 className="font-serif font-bold text-amber-500 text-lg leading-tight mb-1">{book.title}</h2>
                 <span className="text-[10px] uppercase tracking-widest text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full">
                     {book.type === 'comic' ? 'Graphic Novel' : 'Livro'}
                 </span>
             </div>
        </div>

        <div className="p-4 border-t border-slate-800 mt-auto">
             <Button variant="gold" className="w-full justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]" onClick={() => setIsPublishModalOpen(true)}>
                <Globe size={16} className="mr-2"/> Lançamento Global
             </Button>
        </div>
    </>
  );

  const ChapterListContent = () => (
     <div className="flex-1 overflow-y-auto p-2 space-y-1 h-full">
          {book.chapters.map((chapter) => (
            <div 
              key={chapter.id}
              onClick={() => {
                setActiveChapterId(chapter.id);
                setMobileTab('editor');
              }}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                activeChapterId === chapter.id 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                  : 'border-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              <span className="font-medium text-sm truncate">{chapter.title}</span>
              <button onClick={(e) => handleDeleteChapter(chapter.id, e)} className="opacity-100 md:opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button onClick={handleAddChapter} className="w-full flex items-center justify-center gap-2 p-3 mt-4 text-xs text-slate-500 hover:text-amber-500 transition-colors uppercase tracking-widest border border-dashed border-slate-800 rounded hover:border-amber-500">
            <Plus size={14} /> Adicionar Capítulo
          </button>
        </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden md:flex w-72 bg-slate-900 border-r border-slate-800 flex-col h-full flex-shrink-0 z-20 shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <button onClick={onBack} className="text-slate-400 hover:text-amber-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-slate-100 tracking-wide">ESTÚDIO</span>
        </div>
        <SidebarContent />
        <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Capítulos</div>
            <ChapterListContent />
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full relative bg-[#0f172a] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
        
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-30">
             <button onClick={onBack} className="text-slate-400"><ChevronLeft size={24}/></button>
             <span className="font-serif font-bold text-amber-500 truncate max-w-[200px]">{book.title}</span>
             {book.type === 'novel' ? (
                 <button onClick={handleReview} className="text-slate-400"><CheckCheck size={20}/></button>
             ) : (
                 <div className="w-5"></div>
             )}
        </div>

        {/* Mobile View Switching */}
        <div className={`flex-1 overflow-hidden relative ${mobileTab !== 'editor' ? 'md:hidden' : ''}`}>
             
             {/* Mobile Settings/Cover Tab */}
             {mobileTab === 'settings' && (
                 <div className="absolute inset-0 bg-slate-950 z-20 overflow-y-auto">
                     <SidebarContent />
                 </div>
             )}

             {/* Mobile Chapters Tab */}
             {mobileTab === 'chapters' && (
                 <div className="absolute inset-0 bg-slate-950 z-20 overflow-y-auto p-4">
                     <h3 className="text-lg font-serif font-bold text-amber-500 mb-4">Índice</h3>
                     <ChapterListContent />
                 </div>
             )}

             {/* Editor Area (Visible if tab is editor or on Desktop) */}
             <div className={`h-full flex flex-col ${mobileTab === 'editor' ? 'block' : 'hidden md:flex'}`}>
                {activeChapter ? (
                <>
                    <div className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10">
                    <input 
                        value={activeChapter.title}
                        onChange={(e) => {
                            const updatedChapters = book.chapters.map(ch => ch.id === activeChapterId ? { ...ch, title: e.target.value } : ch);
                            onUpdateBook({ ...book, chapters: updatedChapters });
                        }}
                        className="text-xl md:text-2xl font-serif font-bold text-slate-200 bg-transparent border-none focus:ring-0 placeholder-slate-600 w-full"
                    />
                    <div className="hidden md:block">
                        {book.type === 'novel' && (
                            <Button variant="ghost" icon={<CheckCheck size={16}/>} onClick={handleReview}>Revisar</Button>
                        )}
                    </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
                        {book.type === 'novel' ? (
                            <div className="max-w-3xl mx-auto bg-slate-900/80 p-6 md:p-12 rounded-lg shadow-2xl border border-slate-800 min-h-[60vh] md:min-h-[80vh]">
                                {activeChapter.summary && !activeChapter.content && (
                                    <div className="bg-amber-900/10 border border-amber-500/20 p-4 md:p-6 rounded mb-8">
                                        <p className="text-amber-500/80 text-sm italic">{activeChapter.summary}</p>
                                        <Button variant="ghost" size="sm" className="mt-2 text-amber-500" onClick={handleGenerateContent} isLoading={aiState.isGenerating}>
                                            Escrita Automática
                                        </Button>
                                    </div>
                                )}
                                <textarea
                                    value={activeChapter.content}
                                    onChange={(e) => handleContentChange(e.target.value)}
                                    placeholder="Comece a escrever..."
                                    className="w-full h-full min-h-[50vh] bg-transparent border-none resize-none focus:ring-0 text-base md:text-lg leading-relaxed text-slate-300 font-serif selection:bg-amber-500/30"
                                />
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                                {/* Comic Editor */}
                                {(activeChapter.panels || []).map((panel, idx) => (
                                    <div key={panel.id} className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-lg flex flex-col md:flex-row gap-6">
                                        <div className="w-full md:w-1/3 flex-shrink-0">
                                            <div className="aspect-square bg-slate-950 rounded border border-slate-800 overflow-hidden relative group">
                                                {panel.imageUrl ? (
                                                    <img src={panel.imageUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                                                        <ImageIcon size={32}/>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                                                    <textarea 
                                                        className="w-full h-20 text-xs bg-transparent text-white border border-slate-500 rounded p-2 mb-2 placeholder-slate-400"
                                                        placeholder="Descreva a imagem..."
                                                        value={panel.description}
                                                        onChange={(e) => {
                                                            const newPanels = activeChapter.panels!.map(p => p.id === panel.id ? {...p, description: e.target.value} : p);
                                                            handleUpdatePanels(newPanels);
                                                        }}
                                                    />
                                                    <Button size="sm" variant="gold" onClick={() => handleGeneratePanelArt(panel.id, panel.description)} isLoading={aiState.isGenerating}>
                                                        Gerar Arte
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-amber-500 font-bold text-sm">PAINEL {idx + 1}</span>
                                                <button onClick={() => handleUpdatePanels(activeChapter.panels!.filter(p => p.id !== panel.id))} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase">Personagem</label>
                                                <input 
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:border-amber-500 outline-none"
                                                    value={panel.speaker || ''}
                                                    onChange={(e) => {
                                                        const newPanels = activeChapter.panels!.map(p => p.id === panel.id ? {...p, speaker: e.target.value} : p);
                                                        handleUpdatePanels(newPanels);
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase">Diálogo / Legenda</label>
                                                <textarea 
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-300 focus:border-amber-500 outline-none h-24"
                                                    value={panel.dialogue}
                                                    onChange={(e) => {
                                                        const newPanels = activeChapter.panels!.map(p => p.id === panel.id ? {...p, dialogue: e.target.value} : p);
                                                        handleUpdatePanels(newPanels);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                <button onClick={handleAddPanel} className="w-full py-6 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-amber-500 hover:border-amber-500/50 transition-all flex flex-col items-center justify-center gap-2">
                                    <Plus size={32} />
                                    <span className="font-bold tracking-widest">ADICIONAR PAINEL</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Suggestions Panel (Novel Mode) */}
                    {isReviewMode && book.type === 'novel' && (
                        <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-1/2 md:h-full shadow-2xl z-20 absolute right-0 bottom-0 md:top-16 md:bottom-0 rounded-t-2xl md:rounded-none">
                            <div className="p-4 border-b border-slate-800 flex justify-between">
                                <span className="font-bold text-slate-200">Sugestões do Editor</span>
                                <button onClick={() => setIsReviewMode(false)}><XIcon size={16} /></button>
                            </div>
                            <div className="overflow-y-auto p-4 space-y-4">
                                {suggestions.map(s => (
                                    <div key={s.id} className="bg-slate-800 p-3 rounded text-sm space-y-2 border border-slate-700">
                                        <div className="line-through text-red-400">{s.originalText}</div>
                                        <div className="text-emerald-400 font-medium">{s.suggestedText}</div>
                                        <p className="text-xs text-slate-400">{s.explanation}</p>
                                    </div>
                                ))}
                                {suggestions.length === 0 && <p className="text-slate-500 text-center py-4">Nenhum problema encontrado.</p>}
                            </div>
                        </div>
                    )}
                </>
                ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                    <Palette size={48} className="mb-4 opacity-50"/>
                    <p>Selecione um capítulo para começar a criar.</p>
                </div>
                )}
             </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex items-center justify-around h-16 z-40 pb-safe">
         <button 
            onClick={() => setMobileTab('chapters')}
            className={`flex flex-col items-center gap-1 ${mobileTab === 'chapters' ? 'text-amber-500' : 'text-slate-500'}`}
         >
             <List size={20} />
             <span className="text-[10px] font-bold">Capítulos</span>
         </button>
         <button 
            onClick={() => setMobileTab('editor')}
            className={`flex flex-col items-center gap-1 ${mobileTab === 'editor' ? 'text-amber-500' : 'text-slate-500'}`}
         >
             <PenLine size={20} />
             <span className="text-[10px] font-bold">Escrever</span>
         </button>
         <button 
            onClick={() => setMobileTab('settings')}
            className={`flex flex-col items-center gap-1 ${mobileTab === 'settings' ? 'text-amber-500' : 'text-slate-500'}`}
         >
             <Settings size={20} />
             <span className="text-[10px] font-bold">Info</span>
         </button>
      </div>

      <Modal isOpen={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)} title="Assinar & Publicar">
            <div className="space-y-6">
                <div className="text-center p-4 bg-slate-800 rounded-lg border border-amber-500/20">
                    <div className="flex justify-center mb-3">
                    <Lock size={32} className="text-amber-500" />
                    </div>
                    <h4 className="text-slate-200 font-medium mb-1">Garantia de Autenticidade</h4>
                    <p className="text-xs text-slate-400">Ao assinar abaixo, você certifica que este trabalho é seu e autoriza seu lançamento na Biblioteca Global Nexus.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Assinatura do Autor</label>
                    <input 
                    type="text" 
                    value={signatureInput}
                    onChange={(e) => setSignatureInput(e.target.value)}
                    className="w-full text-center text-4xl p-4 bg-slate-800 border-b-2 border-amber-500 text-amber-500 font-signature focus:outline-none focus:bg-slate-700/50 transition-colors rounded-t-lg"
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <Button variant="secondary" className="flex-1" onClick={() => setIsPublishModalOpen(false)}>Cancelar</Button>
                    <Button variant="gold" className="flex-1" onClick={() => { onPublishBook(book.id, signatureInput); setIsPublishModalOpen(false); }}>
                    Lançar Livro
                    </Button>
                </div>
            </div>
      </Modal>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { BookEditor } from './components/BookEditor';
import { BookReader } from './components/BookReader';
import { SocialHub } from './components/SocialHub';
import { Modal } from './components/Modal';
import { Button } from './components/Button';
import { Book, Chapter, BookIdea, User, BookType } from './types';
import { generateBookOutline, generateBookIdeas } from './services/geminiService';
import { Book as BookIcon, Plus, Sparkles, LayoutGrid, Lightbulb, Globe, User as UserIcon, LogOut, ShieldCheck, Feather, Trash2, Heart, MessageSquare, Image as ImageIcon, Users } from 'lucide-react';

const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [authName, setAuthName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [showAuthModal, setShowAuthModal] = useState(() => !currentUser);
  const [securityCheck, setSecurityCheck] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [readingBookId, setReadingBookId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-books' | 'library' | 'social'>('my-books');
  
  // New Book Form State
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');
  const [newBookType, setNewBookType] = useState<BookType>('novel');
  const [useAIOutline, setUseAIOutline] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Idea Generator State
  const [bookIdeas, setBookIdeas] = useState<BookIdea[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);

  // Load data from local storage
  useEffect(() => {
    const savedBooks = localStorage.getItem('nexus_books_platinum');
    if (savedBooks) {
      try {
        setBooks(JSON.parse(savedBooks));
      } catch (e) {
        console.error("Failed to load books", e);
      }
    }

    if (!currentUser) {
        const lastUser = localStorage.getItem('nexus_last_username');
        if (lastUser) setAuthName(lastUser);
    }
  }, []); 

  // Save to local storage whenever books change
  useEffect(() => {
    localStorage.setItem('nexus_books_platinum', JSON.stringify(books));
  }, [books]);

  // Auth Logic
  const handleLogin = () => {
    if (!authName.trim()) return;
    setIsLoggingIn(true);
    setSecurityCheck(true);

    setTimeout(() => {
        const existingBook = books.find(b => b.authorName.toLowerCase() === authName.trim().toLowerCase());
        
        const userId = existingBook ? existingBook.authorId : (currentUser?.id || crypto.randomUUID());

        const newUser: User = {
            id: userId,
            name: authName,
            email: `${authName.toLowerCase().replace(/\s/g, '.')}@nexus.ai`,
            joinedAt: existingBook ? existingBook.createdAt : Date.now(),
            signature: authName
        };
        setCurrentUser(newUser);
        
        localStorage.setItem('nexus_user', JSON.stringify(newUser));
        localStorage.setItem('nexus_last_username', authName); 
        
        setIsLoggingIn(false);
        setSecurityCheck(false);
        setShowAuthModal(false);
    }, 1500);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('nexus_user');
      setShowAuthModal(true);
  };

  const handleGenerateIdeas = async () => {
    setIsLoadingIdeas(true);
    try {
        const ideas = await generateBookIdeas();
        setBookIdeas(ideas);
    } catch (error) {
        alert("Não foi possível gerar ideias no momento.");
    } finally {
        setIsLoadingIdeas(false);
    }
  };

  const handleSelectIdea = (idea: BookIdea) => {
    setNewBookTitle(idea.title);
    setNewBookDesc(idea.description);
    setNewBookType(idea.type || 'novel');
    setBookIdeas([]); 
  };

  const handleCreateBook = async () => {
    if (!newBookTitle.trim() || !currentUser) return;
    
    setIsCreating(true);
    
    try {
      const bookId = crypto.randomUUID();
      let initialChapters: Chapter[] = [];

      if (useAIOutline && newBookDesc && newBookType === 'novel') {
        const outline = await generateBookOutline(newBookTitle, newBookDesc);
        initialChapters = outline.map((ch, index) => ({
          id: crypto.randomUUID(),
          title: ch.title || `Capítulo ${index + 1}`,
          content: "",
          summary: ch.summary,
          lastModified: Date.now()
        }));
      } else {
        initialChapters = [{
          id: crypto.randomUUID(),
          title: "Capítulo 1",
          content: "",
          panels: [],
          lastModified: Date.now()
        }];
      }

      const newBook: Book = {
        id: bookId,
        type: newBookType,
        title: newBookTitle,
        authorId: currentUser.id,
        authorName: currentUser.name,
        description: newBookDesc,
        chapters: initialChapters,
        createdAt: Date.now(),
        lastModified: Date.now(),
        isPublished: false,
        likes: [],
        comments: []
      };

      setBooks(prev => [newBook, ...prev]);
      setIsModalOpen(false);
      setNewBookTitle('');
      setNewBookDesc('');
      setBookIdeas([]);
      setActiveBookId(bookId);
    } catch (error) {
      alert("Falha ao criar o projeto. Tente novamente.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
  };

  const handlePublishBook = (bookId: string, signature: string) => {
    if (!currentUser) return;
    setBooks(prev => prev.map(b => b.id === bookId ? {
        ...b,
        isPublished: true,
        publishedAt: Date.now(),
        signature: signature
    } : b));
    setActiveBookId(null);
    setActiveTab('library');
  };

  const handleDeleteBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm("Excluir este projeto?")) {
        setBooks(prev => prev.filter(b => b.id !== id));
    }
  }

  const activeBook = books.find(b => b.id === activeBookId);
  const readingBook = books.find(b => b.id === readingBookId);
  const myBooks = books.filter(b => b.authorId === currentUser?.id);
  const publishedBooks = books.filter(b => b.isPublished);

  // Auth Screen
  if (showAuthModal || !currentUser) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
              <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.1)] p-8 relative overflow-hidden">
                  <div className="text-center mb-8">
                      <div className="inline-flex p-4 bg-gradient-to-br from-slate-800 to-black rounded-2xl mb-4 shadow-lg ring-1 ring-amber-500/30">
                          <BookIcon size={40} className="text-amber-500" />
                      </div>
                      <h1 className="text-3xl font-serif font-bold text-white mb-2">Nexus Luxury</h1>
                      <p className="text-amber-500/80 text-sm tracking-widest uppercase">Suíte de Publicação Premium</p>
                  </div>

                  {securityCheck ? (
                      <div className="flex flex-col items-center justify-center py-8">
                          <ShieldCheck size={48} className="text-emerald-500 mb-4 animate-pulse" />
                          <p className="text-emerald-500 font-medium">Verificação Biométrica...</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Pseudônimo (Nome de Autor)</label>
                              <input 
                                  type="text" 
                                  value={authName}
                                  onChange={(e) => setAuthName(e.target.value)}
                                  className="w-full bg-black/50 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                  placeholder="Digite seu alias"
                              />
                          </div>
                          <Button 
                            variant="gold" 
                            className="w-full py-4 text-lg font-serif" 
                            onClick={handleLogin}
                            isLoading={isLoggingIn}
                            disabled={!authName.trim()}
                          >
                              Entrar no Estúdio
                          </Button>
                      </div>
                  )}
              </div>
          </div>
      )
  }

  // Render Editor
  if (activeBookId && activeBook) {
    return (
      <BookEditor 
        book={activeBook} 
        user={currentUser}
        onUpdateBook={handleUpdateBook} 
        onPublishBook={handlePublishBook}
        onBack={() => setActiveBookId(null)} 
      />
    );
  }

  // Render Reader
  if (readingBookId && readingBook) {
      return (
          <BookReader 
            book={readingBook}
            currentUser={currentUser}
            onClose={() => setReadingBookId(null)}
            onUpdateBook={handleUpdateBook}
          />
      )
  }

  // Render Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
      {/* Header */}
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-white p-2 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <BookIcon size={24} />
            </div>
            <h1 className="text-lg md:text-xl font-bold text-slate-100 tracking-wider font-serif">
              NEXUS <span className="text-amber-500">LUXURY</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-300">
                  <UserIcon size={14} className="text-amber-500"/>
                  <span className="font-medium tracking-wide">{currentUser.name}</span>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-2" title="Sair">
                  <LogOut size={20} />
              </button>
              <Button onClick={() => setIsModalOpen(true)} variant="gold" className="shadow-lg shadow-amber-900/20 px-3 md:px-5">
                <span className="hidden md:inline"><Plus size={18} className="inline mr-2"/>Novo Projeto</span>
                <span className="md:hidden"><Plus size={18} /></span>
              </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        
        {/* Navigation Tabs */}
        <div className="flex gap-4 md:gap-8 mb-8 md:mb-10 border-b border-slate-800 overflow-x-auto pb-1 scrollbar-hide">
            {['my-books', 'library', 'social'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-4 text-xs md:text-sm font-bold tracking-widest transition-colors relative uppercase whitespace-nowrap px-2 ${activeTab === tab ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <div className="flex items-center gap-2">
                        {tab === 'my-books' && <LayoutGrid size={16} />}
                        {tab === 'library' && <Globe size={16} />}
                        {tab === 'social' && <Users size={16} />}
                        
                        {tab === 'my-books' && 'Estúdio Privado'}
                        {tab === 'library' && 'Coleção Global'}
                        {tab === 'social' && 'Comunidade'}
                    </div>
                    {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>}
                </button>
            ))}
        </div>

        {activeTab === 'social' && (
            <SocialHub currentUser={currentUser} allBooks={books} />
        )}

        {activeTab === 'my-books' && (
             myBooks.length === 0 ? (
                <div className="text-center py-24 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 backdrop-blur-sm mx-4 md:mx-0">
                  <div className="mx-auto h-24 w-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-slate-700">
                    <Sparkles size={40} className="text-amber-500" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3">Comece Sua Obra-Prima</h2>
                  <p className="text-slate-400 max-w-md mx-auto mb-8 text-sm md:text-base px-4">
                    Crie Romances ou Histórias em Quadrinhos com o poder da IA generativa.
                  </p>
                  <Button size="lg" variant="gold" onClick={() => setIsModalOpen(true)} icon={<Plus size={20} />}>
                    Iniciar Projeto
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                  {myBooks.map(book => (
                    <div 
                      key={book.id} 
                      onClick={() => setActiveBookId(book.id)}
                      className="group relative bg-slate-900 rounded-xl overflow-hidden cursor-pointer shadow-2xl hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-300 border border-slate-800 hover:border-amber-500/50"
                    >
                      {/* Cover Image */}
                      <div className="aspect-[2/3] relative bg-slate-800 overflow-hidden">
                        {book.coverImage ? (
                            <img src={book.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-black">
                                <BookIcon size={48} className="text-slate-700" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
                        
                        <div className="absolute top-3 left-3 flex gap-2">
                             <span className={`text-[10px] font-bold px-2 py-1 rounded-sm backdrop-blur-md uppercase tracking-wider ${book.isPublished ? 'bg-amber-500 text-black' : 'bg-white/10 text-white border border-white/20'}`}>
                                 {book.isPublished ? 'Publicado' : 'Rascunho'}
                             </span>
                             <span className="text-[10px] font-bold px-2 py-1 rounded-sm bg-slate-900/80 text-slate-300 backdrop-blur-md uppercase tracking-wider border border-slate-700">
                                 {book.type === 'comic' ? 'Quadrinho' : 'Livro'}
                             </span>
                        </div>
                      </div>

                      <div className="p-5 absolute bottom-0 w-full">
                          <h3 className="text-lg font-serif font-bold text-white leading-tight mb-1 group-hover:text-amber-400 transition-colors">{book.title}</h3>
                          <p className="text-xs text-slate-400 mb-4 line-clamp-1">{book.description}</p>
                          
                          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-white/10 pt-3">
                              <span>{new Date(book.lastModified).toLocaleDateString()}</span>
                              <button onClick={(e) => handleDeleteBook(book.id, e)} className="hover:text-red-400"><Trash2 size={14}/></button>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
        )}

        {activeTab === 'library' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {publishedBooks.map(book => (
                    <div 
                        key={book.id} 
                        onClick={() => setReadingBookId(book.id)}
                        className="bg-slate-900 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-slate-800 group"
                    >
                         <div className="aspect-[2/3] relative bg-slate-800">
                            {book.coverImage ? (
                                <img src={book.coverImage} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-900/20 to-black">
                                    <BookIcon size={40} className="text-amber-700/50 mb-4" />
                                    <span className="text-amber-700/30 font-serif text-xl px-8 text-center">{book.title}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                            
                            <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                                <h4 className="font-serif font-bold text-white text-lg line-clamp-2 leading-tight mb-1">{book.title}</h4>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-amber-500 font-signature text-lg">{book.signature}</span>
                                </div>
                                <div className="flex gap-3 text-xs text-slate-300 font-medium">
                                    <span className="flex items-center gap-1"><Heart size={12} className="text-red-500"/> {(book.likes || []).length}</span>
                                    <span className="flex items-center gap-1"><MessageSquare size={12} /> {(book.comments || []).length}</span>
                                </div>
                            </div>
                         </div>
                    </div>
                ))}
             </div>
        )}
      </main>

      {/* New Book Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Iniciar Projeto">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {bookIdeas.length === 0 && (
             <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-6 flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-bold text-slate-200">Precisa de Inspiração?</h4>
                    <p className="text-xs text-slate-400">Gere conceitos prontos para o mercado.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleGenerateIdeas} isLoading={isLoadingIdeas} icon={<Lightbulb size={14}/>}>
                    Gerar Ideias
                </Button>
             </div>
          )}
          
          {bookIdeas.length > 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                 {bookIdeas.map((idea, idx) => (
                     <button key={idx} onClick={() => handleSelectIdea(idea)} className="text-left p-3 bg-slate-800 border border-slate-700 hover:border-amber-500 rounded-lg transition-colors group">
                         <div className="text-xs text-amber-500 font-bold uppercase mb-1">{idea.type === 'comic' ? 'Quadrinho' : 'Livro'}</div>
                         <div className="font-bold text-slate-200 text-sm mb-1">{idea.title}</div>
                         <div className="text-xs text-slate-500 line-clamp-2">{idea.description}</div>
                     </button>
                 ))}
             </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
              <button 
                onClick={() => setNewBookType('novel')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${newBookType === 'novel' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600'}`}
              >
                  <BookIcon size={24} />
                  <span className="font-bold text-sm">Livro Padrão</span>
              </button>
              <button 
                onClick={() => setNewBookType('comic')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${newBookType === 'comic' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600'}`}
              >
                  <ImageIcon size={24} />
                  <span className="font-bold text-sm">Graphic Novel</span>
              </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título do Projeto</label>
            <input 
              type="text" 
              className="w-full bg-slate-900 rounded-lg border border-slate-700 text-white px-3 py-3 focus:border-amber-500 outline-none"
              placeholder="Digite o título..."
              value={newBookTitle}
              onChange={e => setNewBookTitle(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sinopse</label>
            <textarea 
              className="w-full bg-slate-900 rounded-lg border border-slate-700 text-white px-3 py-3 focus:border-amber-500 outline-none"
              rows={3}
              placeholder="Sobre o que é a história?"
              value={newBookDesc}
              onChange={e => setNewBookDesc(e.target.value)}
            />
          </div>

          {newBookType === 'novel' && (
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <input 
                type="checkbox" 
                id="useAi" 
                checked={useAIOutline} 
                onChange={e => setUseAIOutline(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded bg-slate-900 border-slate-600"
                />
                <label htmlFor="useAi" className="text-sm text-slate-300 select-none cursor-pointer flex-1">
                <span className="font-bold text-amber-500 flex items-center gap-1"><Sparkles size={14}/> Arquitetura IA</span>
                <span className="block text-xs text-slate-500">Gerar capítulos automaticamente com base na sinopse.</span>
                </label>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button 
                variant="gold"
                onClick={handleCreateBook} 
                disabled={!newBookTitle} 
                isLoading={isCreating}
            >
              Iniciar Projeto
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
export interface User {
  id: string;
  name: string;
  email: string;
  signature?: string; 
  joinedAt: number;
  avatar?: string;
  followers?: string[];
  following?: string[];
  bio?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface ComicPanel {
  id: string;
  description: string; // The prompt for the AI
  imageUrl?: string;
  dialogue: string;
  speaker?: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string; // Used for Novels
  panels?: ComicPanel[]; // Used for Comics
  summary?: string;
  lastModified: number;
}

export type BookType = 'novel' | 'comic';

export interface Book {
  id: string;
  type: BookType;
  title: string;
  authorId: string; 
  authorName: string;
  description: string;
  coverImage?: string; // Base64 or URL
  chapters: Chapter[];
  createdAt: number;
  lastModified: number;
  isPublished: boolean;
  publishedAt?: number;
  signature?: string;
  likes: string[]; // Array of User IDs
  comments: Comment[];
}

export interface BookIdea {
  title: string;
  description: string;
  type?: BookType;
}

export interface ReviewSuggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  explanation: string;
  type: 'grammar' | 'spelling' | 'style' | 'clarity';
}

export interface AIState {
  isGenerating: boolean;
  error: string | null;
}

// Social Types
export interface Post {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  likes: string[];
  comments: Comment[];
  type: 'thought' | 'announcement' | 'book_share';
  bookId?: string; // If sharing a book
  bookTitle?: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  participants: string[]; // User IDs or AI IDs
  isAI: boolean;
  aiPersona?: 'muse' | 'critic' | 'guardian';
  messages: Message[];
  lastMessageAt: number;
}
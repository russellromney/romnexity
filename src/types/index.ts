// /src/types/index.ts

// Core search types
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface Citation {
  index: number;
  url: string;
  title: string;
}

export interface SearchResponse {
  query: string;
  answer: string;
  sources: SearchResult[];
  citations: Citation[];
}

// Chat history types
export interface ChatMessage {
  id: string;
  query: string;
  response: SearchResponse;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatHistoryState {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
}


// Component prop types
export interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export interface SearchResultsProps {
  results: SearchResponse;
  onNewSearch: (query: string) => void;
  onClear: () => void;
}

export interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onNewChat: () => void;
  onSwitchChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onClearAll: () => void;
}

// API types
export interface ConversationMessage {
  query: string;
  answer: string;
}

export interface SearchApiRequest {
  query: string;
  conversationContext?: ConversationMessage[];
}

export interface SearchApiResponse {
  query: string;
  answer: string;
  sources: SearchResult[];
  citations: Citation[];
}

export interface ApiError {
  error: string;
  details?: string;
}

// UI state types
export interface SearchState {
  isLoading: boolean;
  error: string | null;
  results: SearchResponse | null;
  searchHistory: string[];
}

// Utility types
export type LoadingVariant = 'search' | 'skeleton' | 'spinner';
export type CitationVariant = 'inline' | 'badge';
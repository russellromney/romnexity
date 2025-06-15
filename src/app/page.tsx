'use client';

import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from 'react';
import SearchInput from '@/components/SearchInput';
import SearchResults from '@/components/SearchResults';
import ChatSidebar from '@/components/ChatSidebar';
import { useChatHistory } from '@/hooks/useChatHistory';
import { Sparkles, Menu } from 'lucide-react';
import { SearchResponse } from '@/types';

interface SearchState {
  isLoading: boolean;
  error: string | null;
  results: SearchResponse | null;
}

export default function HomePage() {
  // Chat history
  const {
    chats,
    currentChat,
    currentChatId,
    createNewChat,
    addMessageToChat,
    switchToChat,
    deleteChat,
    clearAllChats
  } = useChatHistory();

  // Search state
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    error: null,
    results: null
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSearch = async (query: string) => {
    console.log('Searching for:', query);
    
    // Create new chat immediately if needed
    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat(query);
    }
    
    setSearchState({
      isLoading: true,
      error: null,
      results: null
    });

    try {
      // Prepare conversation context
      const conversationContext = currentChat ? currentChat.messages.map((msg: { query: any; response: { answer: any; }; }) => ({
        query: msg.query,
        answer: msg.response.answer
      })) : [];

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          conversationContext: conversationContext.length > 0 ? conversationContext : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: SearchResponse = await response.json();
      
      // Add to chat history
      addMessageToChat(query, data);
      
      setSearchState({
        isLoading: false,
        error: null,
        results: data
      });

    } catch (error) {
      console.error('Search error:', error);
      setSearchState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed',
        results: null
      });
    }
  };

  const handleNewChat = () => {
    createNewChat();
    setSearchState({ isLoading: false, error: null, results: null });
  };

  const handleSwitchToChat = (chatId: string) => {
    switchToChat(chatId);
    setSearchState({ isLoading: false, error: null, results: null });
  };

  // Generate continuation prompt based on current chat
  const getContinuationPrompt = () => {
    if (!currentChat || currentChat.messages.length === 0) {
      return "What would you like to know?";
    }
    
    const lastMessage = currentChat.messages[currentChat.messages.length - 1];
    const lastQuery = lastMessage.query.toLowerCase();
    
    // Generate contextual follow-up prompts
    if (lastQuery.includes('what') || lastQuery.includes('explain')) {
      return "Ask a follow-up question or dive deeper...";
    } else if (lastQuery.includes('how')) {
      return "Want to know more details or alternatives?";
    } else if (lastQuery.includes('compare') || lastQuery.includes('vs')) {
      return "Compare with something else or ask for more details...";
    } else {
      return "Continue the conversation...";
    }
  };

  // Check if we're viewing an existing chat with messages
  const isViewingExistingChat = currentChat && currentChat.messages.length > 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSwitchChat={handleSwitchToChat}
        onDeleteChat={deleteChat}
        onClearAll={clearAllChats}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Sparkles className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold">SearchGPT</h1>
            </div>
            <div className="text-sm text-gray-500">
              {chats.length} conversations
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            
            {/* Hero Section - Only show for new chats */}
            {!isViewingExistingChat && !searchState.isLoading && (
              <div className="text-center mb-12">
                <div className="mb-8">
                  <Sparkles className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Ask me anything
                  </h2>
                  <p className="text-gray-600">
                    Get instant answers with sources from across the web
                  </p>
                </div>
              </div>
            )}

            {/* Chat Context Header - Show when viewing existing chat */}
            {isViewingExistingChat && (
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-blue-900 mb-2">
                    {currentChat.title}
                  </h2>
                  <p className="text-blue-700 text-sm">
                    {currentChat.messages.length} message{currentChat.messages.length !== 1 ? 's' : ''} • 
                    Started {new Date(currentChat.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-3 text-sm text-blue-600">
                    💡 Continue this conversation or ask follow-up questions below
                  </div>
                </div>
              </div>
            )}

            {/* SEARCH INPUT - Context-aware placeholder */}
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                <SearchInput
                  onSearch={handleSearch}
                  isLoading={searchState.isLoading}
                  placeholder={getContinuationPrompt()}
                />
              </div>
              
              {/* Suggested follow-up questions for existing chats */}
              {isViewingExistingChat && !searchState.isLoading && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-3">💬 Suggested follow-ups:</p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const lastMessage = currentChat.messages[currentChat.messages.length - 1];
                      const baseQuery = lastMessage.query;
                      
                      return [
                        `Tell me more about ${baseQuery.toLowerCase()}`,
                        `What are the pros and cons of ${baseQuery.toLowerCase()}?`,
                        `How does this compare to alternatives?`,
                        `What are the latest developments?`
                      ].map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(suggestion)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                        >
                          {suggestion}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Error State */}
            {searchState.error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{searchState.error}</p>
                <button
                  onClick={() => setSearchState(prev => ({ ...prev, error: null }))}
                  className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Loading State */}
            {searchState.isLoading && (
              <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                  <span className="ml-2 text-blue-600 font-medium">Searching...</span>
                </div>
              </div>
            )}

            {/* Current Results */}
            {searchState.results && (
              <div className="mb-8">
                <SearchResults
                  results={searchState.results}
                  onNewSearch={handleSearch}
                  onClear={() => setSearchState({ isLoading: false, error: null, results: null })}
                />
              </div>
            )}

            {/* Chat History - Show previous messages when viewing existing chat */}
            {isViewingExistingChat && !searchState.results && (
              <div className="space-y-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Previous Conversation
                </h3>
                {currentChat.messages.map((message: { id: Key | null | undefined; query: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; timestamp: string | number | Date; response: SearchResponse; }, index: number) => (
                  <div key={message.id} className="border-l-4 border-blue-200 pl-4">
                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          Q{index + 1}: {message.query}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <SearchResults
                        results={message.response}
                        onNewSearch={handleSearch}
                        onClear={() => {}}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sample Questions - Only show for new chats */}
            {!isViewingExistingChat && !searchState.results && !searchState.isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "What's new in AI research?",
                  "Explain quantum computing",
                  "Best React practices 2024",
                  "Climate change updates"
                ].map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSearch(question)}
                    className="p-4 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import SearchInput from '@/components/SearchInput';
import SearchResults from '@/components/SearchResults';
import ChatSidebar from '@/components/ChatSidebar';
import { useChatHistory } from '@/hooks/useChatHistory';
import { Sparkles, Menu, RefreshCw } from 'lucide-react';
import { SearchResponse, SearchState } from '@/types';

export default function HomePage() {
  // Chat history hook with all functionality including AI title generation
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

  // Local search state for immediate UI updates
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    error: null,
    results: null,
    searchHistory: []
  });

  // Sidebar state for mobile responsiveness
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track current query for loading display
  const [currentQuery, setCurrentQuery] = useState<string>('');

  const handleSearch = async (query: string) => {
    console.log('Searching for:', query);
    setCurrentQuery(query);
    
    // Create new chat immediately if needed (for instant sidebar feedback)
    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat(query);
    }
    
    // Update local state for immediate UI feedback
    setSearchState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      results: null,
      searchHistory: [query, ...prev.searchHistory.filter(h => h !== query)].slice(0, 5)
    }));

    try {
      // Prepare conversation context for AI continuity
      const conversationContext = currentChat ? currentChat.messages.map(msg => ({
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
      
      // Add to chat history (this will auto-generate AI title for first message)
      await addMessageToChat(query, data);
      
      // Update local state for immediate display
      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        results: data
      }));

    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed',
        results: null
      }));
    } finally {
      setCurrentQuery('');
    }
  };

  const handleNewChat = () => {
    createNewChat();
    setSearchState({ 
      isLoading: false, 
      error: null, 
      results: null, 
      searchHistory: searchState.searchHistory 
    });
  };

  const handleSwitchToChat = (chatId: string) => {
    switchToChat(chatId);
    setSearchState({ 
      isLoading: false, 
      error: null, 
      results: null, 
      searchHistory: searchState.searchHistory 
    });
  };

  const handleClearResults = () => {
    setSearchState(prev => ({
      ...prev,
      results: null,
      error: null
    }));
  };

  const handleRetry = () => {
    if (searchState.results?.query) {
      handleSearch(searchState.results.query);
    } else if (currentQuery) {
      handleSearch(currentQuery);
    }
  };

  // Generate continuation prompt based on current chat context
  const getContinuationPrompt = () => {
    // Always use generic prompts, never show previous queries
    if (!currentChat || currentChat.messages.length === 0) {
      return "What would you like to know?";
    }
    
    // Generic continuation prompts based on conversation context
    const prompts = [
      "Ask a follow-up question...",
      "Continue the conversation...",
      "What else would you like to know?",
      "Ask another question...",
      "Dive deeper into this topic..."
    ];
    
    // Rotate through prompts based on message count for variety
    const promptIndex = currentChat.messages.length % prompts.length;
    return prompts[promptIndex];
  };

  // Check if we're viewing an existing chat with messages
  const isViewingExistingChat = currentChat && currentChat.messages.length > 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Chat Sidebar with full functionality */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with mobile menu and chat counter */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Sparkles className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Romnexity</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Clone
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {chats.length} conversation{chats.length !== 1 ? 's' : ''}
              </div>
              {isViewingExistingChat && (
                <button
                  onClick={() => handleNewChat()}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  New Chat
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area with scroll */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            
            {/* Hero Section - Only show for completely new users with no chats */}
            {!isViewingExistingChat && !searchState.isLoading && !searchState.results && chats.length === 0 && (
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-blue-900 mb-1">
                        {currentChat.title}
                      </h2>
                      <p className="text-blue-700 text-sm">
                        {currentChat.messages.length} message{currentChat.messages.length !== 1 ? 's' : ''} • 
                        Started {new Date(currentChat.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSearch(currentChat.messages[currentChat.messages.length - 1]?.query || '')}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Refresh last query"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error State with retry functionality */}
            {searchState.error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Search Error
                </h3>
                <p className="text-red-700 mb-4">{searchState.error}</p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => setSearchState(prev => ({ ...prev, error: null }))}
                    className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* ALL CHAT MESSAGES - Display chronologically in chat bubble style */}
            {(isViewingExistingChat || searchState.results || searchState.isLoading || currentQuery) && (
              <div className="space-y-6 mb-8">
                {/* Previous messages from chat history */}
                {isViewingExistingChat && currentChat.messages
                  .slice()
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map((message, index) => (
                    <div key={message.id} className="space-y-4">
                      {/* User Query */}
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-2">
                          <p className="text-sm font-medium mb-1">You</p>
                          <p>{message.query}</p>
                          <p className="text-xs text-blue-100 mt-1">
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* AI Response */}
                      <div className="flex justify-start">
                        <div className="max-w-[90%] bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
                            <p className="text-sm font-medium text-gray-900">Romnexity</p>
                          </div>
                          <SearchResults
                            results={message.response}
                            onNewSearch={handleSearch}
                            onClear={() => {}}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Current search in progress */}
                {searchState.isLoading && currentQuery && (
                  <div className="space-y-4">
                    {/* Show the query being processed */}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-2">
                        <p className="text-sm font-medium mb-1">You</p>
                        <p>{currentQuery}</p>
                        <p className="text-xs text-blue-100 mt-1">Just now</p>
                      </div>
                    </div>
                    
                    {/* Loading response */}
                    <div className="flex justify-start">
                      <div className="max-w-[90%] bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
                          <p className="text-sm font-medium text-gray-900">Romnexity</p>
                        </div>
                        <div className="animate-pulse">
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                            <span className="ml-2 text-blue-600 font-medium text-sm">Searching...</span>
                          </div>
                          <div className="space-y-3">
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current search results */}
                {searchState.results && (
                  <div className="space-y-4">
                    {/* Show user query if not already shown in loading */}
                    {!searchState.isLoading && (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-2">
                          <p className="text-sm font-medium mb-1">You</p>
                          <p>{searchState.results.query}</p>
                          <p className="text-xs text-blue-100 mt-1">Just now</p>
                        </div>
                      </div>
                    )}
                    
                    {/* AI Response */}
                    <div className="flex justify-start">
                      <div className="max-w-[90%] bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
                          <p className="text-sm font-medium text-gray-900">Romnexity</p>
                        </div>
                        <SearchResults
                          results={searchState.results}
                          onNewSearch={handleSearch}
                          onClear={handleClearResults}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sample Questions - Only show for completely new users */}
            {!isViewingExistingChat && !searchState.results && !searchState.isLoading && chats.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {[
                  "What's new in AI research?",
                  "Explain quantum computing",
                  "Best React practices 2024",
                  "Climate change updates"
                ].map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSearch(question)}
                    className="p-4 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-black font-medium"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {/* Search History - Show for users with history but no current chat */}
            {!isViewingExistingChat && !searchState.results && !searchState.isLoading && chats.length > 0 && searchState.searchHistory.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Searches</h3>
                <div className="flex flex-wrap gap-2">
                  {searchState.searchHistory.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(query)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm text-black font-medium"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* SEARCH INPUT - Fixed at bottom like a messaging app - ALWAYS SHOW */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-2">
              <SearchInput
                onSearch={handleSearch}
                isLoading={searchState.isLoading}
                placeholder={getContinuationPrompt()}
              />
            </div>
            
            {/* Suggested follow-up questions for existing chats */}
            {isViewingExistingChat && !searchState.isLoading && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "Tell me more",
                    "Pros and cons?",
                    "Compare alternatives",
                    "Latest updates"
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(suggestion)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-black text-sm rounded-full border border-blue-200 transition-colors font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick suggestions for new users */}
            {!isViewingExistingChat && chats.length === 0 && !searchState.isLoading && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "AI research trends",
                    "Quantum computing",
                    "React best practices",
                    "Climate solutions"
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(suggestion)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-black text-sm rounded-full border border-blue-200 transition-colors font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
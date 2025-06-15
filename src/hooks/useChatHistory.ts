import { Chat, ChatHistoryState, ChatMessage, SearchResponse } from '@/types';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'perplexity_chat_history';

export function useChatHistory() {
  const [chatState, setChatState] = useState<ChatHistoryState>({
    chats: [],
    currentChatId: null,
    isLoading: false
  });

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem(STORAGE_KEY);
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        // Convert date strings back to Date objects
        const chats = parsed.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChatState(prev => ({ ...prev, chats }));
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, []);

  // Save to localStorage whenever chats change
  const saveChats = (chats: Chat[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  };

  // Create a new chat
  const createNewChat = (firstQuery?: string): string => {
    const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const title = firstQuery 
      ? 'New Chat...' // Temporary title, will be updated when response comes
      : 'New Chat';

    const newChat: Chat = {
      id: newChatId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setChatState(prev => {
      const updatedChats = [newChat, ...prev.chats];
      saveChats(updatedChats);
      return {
        ...prev,
        chats: updatedChats,
        currentChatId: newChatId
      };
    });

    return newChatId;
  };

  // Add message to current chat and auto-rename if it's the first message
  const addMessageToChat = (query: string, response: SearchResponse) => {
    setChatState(prev => {
      let currentChatId = prev.currentChatId;
      
      // If no current chat, create one
      if (!currentChatId || !prev.chats.find(c => c.id === currentChatId)) {
        const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const title = generateChatTitle(query, response);

        const newChat: Chat = {
          id: newChatId,
          title,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        currentChatId = newChatId;
        prev = {
          ...prev,
          chats: [newChat, ...prev.chats],
          currentChatId: newChatId
        };
      }

      const newMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        query,
        response,
        timestamp: new Date()
      };

      const updatedChats = prev.chats.map(chat => {
        if (chat.id === currentChatId) {
          const isFirstMessage = chat.messages.length === 0;
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, newMessage],
            updatedAt: new Date(),
            // Auto-rename if this is the first message
            title: isFirstMessage ? generateChatTitle(query, response) : chat.title
          };
          return updatedChat;
        }
        return chat;
      });

      saveChats(updatedChats);
      return {
        ...prev,
        chats: updatedChats,
        currentChatId
      };
    });
  };

  // Generate a smart chat title based on query and response
  const generateChatTitle = (query: string, response: SearchResponse): string => {
    try {
      // Extract key topics from the query and response
      const queryWords = query.toLowerCase().split(' ').filter(word => 
        word.length > 3 && !['what', 'how', 'why', 'when', 'where', 'the', 'and', 'but', 'for', 'with', 'about'].includes(word)
      );
      
      // Try to extract main topics from the response
      const responseWords = response.answer.toLowerCase().split(' ').filter(word => 
        word.length > 4 && !['what', 'how', 'why', 'when', 'where', 'the', 'and', 'but', 'for', 'with', 'about', 'this', 'that', 'they', 'them', 'these', 'those'].includes(word)
      );
      
      // Look for capitalized words in the original response (likely proper nouns/important terms)
      const properNouns = response.answer.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      
      // Priority order for title generation
      let title = '';
      
      // 1. Try to use proper nouns from response
      if (properNouns.length > 0) {
        const mainTopic = properNouns[0];
        if (queryWords.some(word => word.includes('what'))) {
          title = `What is ${mainTopic}?`;
        } else if (queryWords.some(word => word.includes('how'))) {
          title = `How ${mainTopic} works`;
        } else {
          title = `About ${mainTopic}`;
        }
      }
      // 2. Use key words from query
      else if (queryWords.length > 0) {
        const mainKeywords = queryWords.slice(0, 3).join(' ');
        if (query.toLowerCase().startsWith('what')) {
          title = `What is ${mainKeywords}?`;
        } else if (query.toLowerCase().startsWith('how')) {
          title = `How to ${mainKeywords}`;
        } else if (query.toLowerCase().startsWith('why')) {
          title = `Why ${mainKeywords}?`;
        } else {
          title = `${mainKeywords.charAt(0).toUpperCase() + mainKeywords.slice(1)}`;
        }
      }
      // 3. Fallback to cleaned up original query
      else {
        title = query.length > 50 ? query.substring(0, 47) + '...' : query;
      }
      
      // Ensure title isn't too long
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }
      
      return title || query.substring(0, 50);
      
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Fallback to simple query truncation
      return query.length > 50 ? query.substring(0, 47) + '...' : query;
    }
  };

  // Switch to a different chat
  const switchToChat = (chatId: string) => {
    setChatState(prev => ({
      ...prev,
      currentChatId: chatId
    }));
  };

  // Delete a chat
  const deleteChat = (chatId: string) => {
    setChatState(prev => {
      const updatedChats = prev.chats.filter(chat => chat.id !== chatId);
      const newCurrentChatId = prev.currentChatId === chatId 
        ? (updatedChats.length > 0 ? updatedChats[0].id : null)
        : prev.currentChatId;
      
      saveChats(updatedChats);
      return {
        ...prev,
        chats: updatedChats,
        currentChatId: newCurrentChatId
      };
    });
  };

  // Clear all chat history
  const clearAllChats = () => {
    setChatState({
      chats: [],
      currentChatId: null,
      isLoading: false
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  // Get current chat
  const getCurrentChat = (): Chat | null => {
    if (!chatState.currentChatId) return null;
    return chatState.chats.find(chat => chat.id === chatState.currentChatId) || null;
  };

  return {
    chats: chatState.chats,
    currentChat: getCurrentChat(),
    currentChatId: chatState.currentChatId,
    createNewChat,
    addMessageToChat,
    switchToChat,
    deleteChat,
    clearAllChats
  };
}

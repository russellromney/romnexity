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
      ? firstQuery.slice(0, 50) + (firstQuery.length > 50 ? '...' : '')
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

  // Add message to current chat
  const addMessageToChat = (query: string, response: SearchResponse) => {
    setChatState(prev => {
      let currentChatId = prev.currentChatId;
      
      // If no current chat, create one
      if (!currentChatId || !prev.chats.find(c => c.id === currentChatId)) {
        const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const title = query.slice(0, 50) + (query.length > 50 ? '...' : '');

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
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, newMessage],
            updatedAt: new Date(),
            // Update title if this is the first message
            title: chat.messages.length === 0 
              ? query.slice(0, 50) + (query.length > 50 ? '...' : '')
              : chat.title
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

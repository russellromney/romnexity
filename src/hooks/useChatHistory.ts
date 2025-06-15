import { Chat, ChatHistoryState, ChatMessage, SearchResponse } from '@/types';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'perplexity_chat_history';

export function useChatHistory() {
  const [chatState, setChatState] = useState<ChatHistoryState>({
    chats: [],
    currentChatId: null,
    isLoading: false
  });

  useEffect(() => {
    const savedChats = localStorage.getItem(STORAGE_KEY);
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
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

  const saveChats = (chats: Chat[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  };

  const createNewChat = (firstQuery?: string): string => {
    const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const title = firstQuery 
      ? 'New Chat...'
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

  const generateAITitle = async (query: string): Promise<string> => {
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          generateTitle: true 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.title || query.substring(0, 50);
      } else {
        throw new Error('Title generation failed');
      }
    } catch (error) {
      console.error('Error generating AI title:', error);
      return query.length > 50 ? query.substring(0, 47) + '...' : query;
    }
  };

  const addMessageToChat = async (query: string, response: SearchResponse) => {
    setChatState(prev => {
      let currentChatId = prev.currentChatId;
      
      if (!currentChatId || !prev.chats.find(c => c.id === currentChatId)) {
        const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const title = 'Generating title...';

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
            title: isFirstMessage ? 'Generating title...' : chat.title
          };
          return updatedChat;
        }
        return chat;
      });

      saveChats(updatedChats);

      if (updatedChats.find(c => c.id === currentChatId)?.messages.length === 1) {
        generateAITitle(query).then(aiTitle => {
          setChatState(currentState => {
            const newChats = currentState.chats.map(chat => 
              chat.id === currentChatId 
                ? { ...chat, title: aiTitle }
                : chat
            );
            saveChats(newChats);
            return {
              ...currentState,
              chats: newChats
            };
          });
        });
      }

      return {
        ...prev,
        chats: updatedChats,
        currentChatId
      };
    });
  };

  const generateChatTitle = (query: string, response: SearchResponse): string => {
    try {
      const cleanQuery = query.trim();
      
      const queryWords = cleanQuery.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => 
          word.length > 2 && 
          !['what', 'how', 'why', 'when', 'where', 'who', 'which', 'the', 'and', 'but', 'for', 'with', 'about', 'this', 'that', 'are', 'is', 'can', 'could', 'would', 'should', 'will', 'does', 'did', 'do'].includes(word)
        );
      
      const properNouns = response.answer.match(/\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*\b/g) || [];
      const uniqueProperNouns = [...new Set(properNouns)].filter(noun => 
        noun.length > 2 && 
        !['The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'How', 'Why', 'Who'].includes(noun)
      );
      
      const quotedTerms = response.answer.match(/"([^"]+)"/g) || [];
      const technicalTerms = response.answer.match(/\b[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*\b/g) || [];
      
      let title = '';
      
      if (uniqueProperNouns.length > 0) {
        const mainTopic = uniqueProperNouns[0];
        
        if (cleanQuery.toLowerCase().includes('what is') || cleanQuery.toLowerCase().includes('what are')) {
          title = `What is ${mainTopic}?`;
        } else if (cleanQuery.toLowerCase().includes('how to') || cleanQuery.toLowerCase().includes('how do')) {
          title = `How to use ${mainTopic}`;
        } else if (cleanQuery.toLowerCase().includes('why')) {
          title = `Why ${mainTopic}?`;
        } else if (cleanQuery.toLowerCase().includes('compare') || cleanQuery.toLowerCase().includes('vs')) {
          title = `${mainTopic} Comparison`;
        } else if (cleanQuery.toLowerCase().includes('best') || cleanQuery.toLowerCase().includes('top')) {
          title = `Best ${mainTopic} Options`;
        } else {
          title = mainTopic;
        }
      }
      else if (queryWords.length > 0) {
        const keyTerms = queryWords.slice(0, 2).join(' ');
        
        if (cleanQuery.toLowerCase().startsWith('what')) {
          title = `About ${keyTerms}`;
        } else if (cleanQuery.toLowerCase().startsWith('how')) {
          title = `How to ${keyTerms}`;
        } else if (cleanQuery.toLowerCase().startsWith('why')) {
          title = `Why ${keyTerms}`;
        } else if (cleanQuery.toLowerCase().includes('compare')) {
          title = `${keyTerms} comparison`;
        } else if (cleanQuery.toLowerCase().includes('best') || cleanQuery.toLowerCase().includes('top')) {
          title = `Best ${keyTerms}`;
        } else {
          title = keyTerms.charAt(0).toUpperCase() + keyTerms.slice(1);
        }
      }
      else if (technicalTerms.length > 0) {
        title = technicalTerms[0] ?? 'New Chat';
      } else if (quotedTerms.length > 0) {
        title = (quotedTerms[0] ?? 'New Chat').replace(/"/g, '');
      }
      else {
        title = cleanQuery
          .replace(/^(what is|what are|how to|how do|how does|why|when|where|who|which)\s*/i, '')
          .replace(/\?+$/, '')
          .trim();
        
        if (title.length > 0) {
          title = title.charAt(0).toUpperCase() + title.slice(1);
        } else {
          title = cleanQuery;
        }
      }
      
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }
      
      if (!title || title.length < 3) {
        title = cleanQuery.length > 50 
          ? cleanQuery.substring(0, 47) + '...' 
          : cleanQuery;
      }
      
      return title;
      
    } catch (error) {
      console.error('Error generating chat title:', error);
      const cleanQuery = query.trim();
      return cleanQuery.length > 50 
        ? cleanQuery.substring(0, 47) + '...' 
        : cleanQuery;
    }
  };

  const switchToChat = (chatId: string) => {
    setChatState(prev => ({
      ...prev,
      currentChatId: chatId
    }));
  };

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

  const clearAllChats = () => {
    setChatState({
      chats: [],
      currentChatId: null,
      isLoading: false
    });
    localStorage.removeItem(STORAGE_KEY);
  };

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

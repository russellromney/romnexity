'use client';

import { useState, FormEvent } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export default function SearchInput({ 
  onSearch, 
  isLoading = false, 
  placeholder = "Ask anything..." 
}: SearchInputProps) {
  const [query, setQuery] = useState<string>('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Don't submit empty queries or when already loading
    if (!query.trim() || isLoading) return;
    
    const queryToSubmit = query.trim();
    onSearch(queryToSubmit);
    
    // Clear the input after submitting
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but allow Shift+Enter for new lines)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        const queryToSubmit = query.trim();
        onSearch(queryToSubmit);
        
        // Clear the input after submitting
        setQuery('');
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </div>

          {/* Textarea for multi-line queries */}
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full pl-12 pr-20 py-4 text-lg text-gray-900 border-2 border-gray-200 rounded-xl 
                     focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200
                     disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500
                     resize-none min-h-[60px] max-h-[200px]
                     placeholder:text-gray-400
                     transition-all duration-200"
            rows={1}
            style={{
              // Auto-resize textarea
              height: 'auto',
              minHeight: '60px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 200) + 'px';
            }}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="absolute right-3 top-1/2 transform -translate-y-1/2
                     px-4 py-2 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200
                     disabled:bg-gray-300 disabled:cursor-not-allowed
                     transition-all duration-200"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Character count (optional) */}
        {query.length > 0 && (
          <div className="mt-2 text-sm text-gray-500 text-right">
            {query.length} characters
          </div>
        )}
      </form>

      {/* Search suggestions (optional enhancement) */}
      {!isLoading && query.length === 0 && (
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {[
            "What's the latest in AI research?",
            "Explain quantum computing",
            "Best practices for TypeScript",
            "Climate change solutions"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-full
                       transition-colors duration-200 text-gray-700"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
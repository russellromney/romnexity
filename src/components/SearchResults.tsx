'use client';

import { useState } from 'react';
import { ExternalLink, Copy, Share2, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';

// Types (should match your API types)
interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface Citation {
  index: number;
  url: string;
  title: string;
}

interface SearchResponse {
  query: string;
  answer: string;
  sources: SearchResult[];
  citations: Citation[];
}

interface SearchResultsProps {
  results: SearchResponse;
  onNewSearch: (query: string) => void;
  onClear: () => void;
}

export default function SearchResults({ results, onNewSearch, onClear }: SearchResultsProps) {
  const [showAllSources, setShowAllSources] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Handle copying text
  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle sharing (if Web Share API is available)
  const handleShare = async () => {
    const shareData = {
      title: `Answer to: ${results.query}`,
      text: results.answer,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying URL
        await handleCopy(window.location.href, 'url');
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  // Render answer with clickable citations
  const renderAnswerWithCitations = (answer: string, citations: Citation[]) => {
    const citationRegex = /\[(\d+)\]/g;
    const parts = answer.split(citationRegex);
    
    return parts.map((part, index) => {
      // Check if this part is a citation number
      const citationNumber = parseInt(part);
      if (!isNaN(citationNumber) && citations.find(c => c.index === citationNumber)) {
        const citation = citations.find(c => c.index === citationNumber);
        return (
          <a
            key={index}
            href={citation?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mx-1 px-1.5 py-0.5 text-xs font-medium 
                     bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors
                     border border-blue-200"
            title={citation?.title}
          >
            {citationNumber}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const visibleSources = showAllSources ? results.sources : results.sources.slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Query Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 line-clamp-2">
          {results.query}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNewSearch(results.query)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg
                     transition-colors"
            title="Refresh search"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={onClear}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg
                     transition-colors"
            title="Clear results"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Answer */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Answer</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCopy(results.answer, 'answer')}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 
                         hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>{copiedText === 'answer' ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 
                         hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span>{copiedText === 'url' ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {renderAnswerWithCitations(results.answer, results.citations)}
            </p>
          </div>
        </div>
      </div>

      {/* Sources */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Sources ({results.sources.length})
            </h3>
            {results.sources.length > 3 && (
              <button
                onClick={() => setShowAllSources(!showAllSources)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 
                         hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <span>{showAllSources ? 'Show Less' : 'Show All'}</span>
                {showAllSources ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          
          <div className="grid gap-4">
            {visibleSources.map((source, index) => {
              const citationIndex = results.citations.find(c => 
                c.url === source.url || c.title === source.title
              )?.index;
              
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 
                           transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {citationIndex && (
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 
                                       text-xs font-medium rounded-full flex items-center 
                                       justify-center">
                          {citationIndex}
                        </span>
                      )}
                      <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                        {source.title}
                      </h4>
                    </div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 
                               transition-colors"
                      title="Open source"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                    {source.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {getDomain(source.url)}
                    </span>
                    {source.score && (
                      <span className="text-xs text-gray-400">
                        Relevance: {Math.round(source.score * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Citations Summary */}
      {results.citations.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Citations Used</h4>
          <div className="flex flex-wrap gap-2">
            {results.citations.map((citation) => (
              <a
                key={citation.index}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 px-2 py-1 bg-white border 
                         border-gray-200 rounded text-xs text-gray-700 hover:border-gray-300 
                         hover:bg-gray-50 transition-colors"
              >
                <span className="w-4 h-4 bg-blue-100 text-blue-800 rounded-full flex 
                               items-center justify-center text-xs font-medium">
                  {citation.index}
                </span>
                <span className="truncate max-w-32">{citation.title}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Questions */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-3">Related Questions</h4>
        <div className="space-y-2">
          {[
            `What are the implications of ${results.query.toLowerCase()}?`,
            `How does ${results.query.toLowerCase()} compare to alternatives?`,
            `What are the latest developments regarding ${results.query.toLowerCase()}?`
          ].map((question, index) => (
            <button
              key={index}
              onClick={() => onNewSearch(question)}
              className="block w-full text-left px-3 py-2 text-sm text-blue-800 
                       hover:bg-blue-100 rounded-lg transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
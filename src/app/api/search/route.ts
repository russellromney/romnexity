import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { tavily, TavilyClient } from 'tavily';

// Initialize APIs
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tavilyClient = new TavilyClient({ apiKey: process.env.TAVILY_API_KEY });

// Types
interface ConversationMessage {
  query: string;
  answer: string;
}

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

export async function POST(request: NextRequest) {
  try {
    const { query, conversationContext } = await request.json();

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Check API keys
    if (!process.env.OPENAI_API_KEY || !process.env.TAVILY_API_KEY) {
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    // Step 1: Search the web with Tavily
    console.log('Searching for:', query);
    
    const searchResults = await tavilyClient.search({
      query: query,
      search_depth: 'basic',
      max_results: 8,
      include_answer: false,
      include_images: false,
      include_raw_content: false,
    });

    // Transform Tavily results to our format
    const sources: SearchResult[] = searchResults.results.map((result: any, index: number) => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score,
    }));

    // Step 2: Generate AI response with citations and conversation context
    let prompt = `Based on the following search results, provide a comprehensive answer to the user's question: "${query}"`;

    // Add conversation context if provided
    if (conversationContext && conversationContext.length > 0) {
      prompt += `\n\nPrevious conversation context:`;
      conversationContext.forEach((msg: ConversationMessage, index: number) => {
        prompt += `\n${index + 1}. User asked: "${msg.query}"\n   Previous answer: ${msg.answer.substring(0, 200)}...`;
      });
      prompt += `\n\nIMPORTANT: Use this conversation context to provide a more relevant and connected answer. Reference previous topics when relevant, but focus on the new question: "${query}"`;
    }

    prompt += `\n\nSearch Results:
${sources.map((result, index) => 
  `[${index + 1}] ${result.title}
${result.content}
---`
).join('\n')}

Instructions:
1. ${conversationContext && conversationContext.length > 0 ? 
   'Consider the previous conversation context and build upon it naturally' : 
   'Synthesize information from multiple sources to provide a complete answer'}
2. Use inline citations like [1], [2], [3] referring to the source numbers above
3. Be comprehensive but concise (aim for 2-4 paragraphs)
4. If sources provide conflicting information, acknowledge the disagreement
5. Focus on factual accuracy and cite specific claims
6. ${conversationContext && conversationContext.length > 0 ? 
   'Connect your answer to the previous conversation when relevant, showing continuity' : 
   'Write in a clear, informative tone similar to Perplexity.ai'}

Answer:`;

    console.log('Generating AI response...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: conversationContext && conversationContext.length > 0 ? 
            'You are a helpful research assistant that provides accurate, well-cited answers based on search results. You maintain conversation continuity and can reference previous discussions when relevant. Always use inline citations and synthesize information from multiple sources.' :
            'You are a helpful research assistant that provides accurate, well-cited answers based on search results. Always use inline citations and synthesize information from multiple sources.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more factual responses
    });

    const answer = completion.choices[0]?.message?.content || 'Unable to generate response';

    // Step 3: Extract citations from the answer
    const citationRegex = /\[(\d+)\]/g;
    const citationMatches = [...answer.matchAll(citationRegex)];
    
    const citations: Citation[] = citationMatches
      .map(match => parseInt(match[1]))
      .filter((num, index, arr) => arr.indexOf(num) === index) // Remove duplicates
      .filter(num => num > 0 && num <= sources.length) // Valid citation numbers
      .map(num => ({
        index: num,
        url: sources[num - 1].url,
        title: sources[num - 1].title,
      }));

    // Step 4: Return structured response
    const response: SearchResponse = {
      query: query.trim(),
      answer,
      sources,
      citations,
    };

    console.log('Search completed successfully');
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Search API Error:', error);

    // Handle specific error types
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid API configuration' },
        { status: 401 }
      );
    }

    // Handle network/timeout errors
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Network error. Please check your connection and try again.' },
        { status: 503 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'An error occurred while processing your request. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: Add rate limiting for production
export async function GET() {
  return NextResponse.json(
    { message: 'Search API is running. Use POST method to search.' },
    { status: 200 }
  );
}
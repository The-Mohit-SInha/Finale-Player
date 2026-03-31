import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-6ed35f1d/health", (c) => {
  return c.json({ status: "ok" });
});

// Test YouTube API key endpoint
app.get("/make-server-6ed35f1d/youtube/test-key", async (c) => {
  try {
    const apiKey = Deno.env.get('YOUTUBE_MUSIC_API_KEY');
    
    if (!apiKey) {
      return c.json({ 
        success: false, 
        error: 'API key not found in environment variables',
        message: 'Please add YOUTUBE_MUSIC_API_KEY to Supabase secrets'
      });
    }
    
    console.log(`Testing YouTube API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`API key length: ${apiKey.length} characters`);
    console.log(`API key starts with: ${apiKey.substring(0, 7)}`);
    
    // Test with a simple search
    const testUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    testUrl.searchParams.set('part', 'snippet');
    testUrl.searchParams.set('q', 'test');
    testUrl.searchParams.set('type', 'video');
    testUrl.searchParams.set('maxResults', '1');
    testUrl.searchParams.set('key', apiKey.trim()); // Trim any whitespace
    
    console.log(`Test request URL: ${testUrl.toString().replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    const response = await fetch(testUrl.toString());
    const data = await response.text();
    
    if (!response.ok) {
      console.log(`YouTube API test failed: ${response.status}`);
      console.log(`Error response: ${data}`);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(data);
      } catch (e) {
        errorDetails = data;
      }
      
      return c.json({
        success: false,
        status: response.status,
        error: errorDetails,
        suggestions: [
          '1. Verify API key is correct (should start with "AIza")',
          '2. Enable YouTube Data API v3 in Google Cloud Console',
          '3. Check API key restrictions (should allow server requests)',
          '4. Wait 1-2 minutes after creating/modifying the API key'
        ]
      });
    }
    
    console.log(`YouTube API test successful!`);
    
    return c.json({
      success: true,
      message: 'YouTube API key is valid and working!',
      apiKeyPreview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
      testResult: 'Successfully connected to YouTube Data API v3'
    });
    
  } catch (error) {
    console.log(`YouTube API test error: ${error.message}`);
    return c.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, 500);
  }
});

// YouTube Music search endpoint
app.post("/make-server-6ed35f1d/youtube/search", async (c) => {
  try {
    const { query } = await c.req.json();
    const apiKey = Deno.env.get('YOUTUBE_MUSIC_API_KEY')?.trim(); // Trim whitespace

    if (!apiKey) {
      console.log('YouTube Music API search error: API key not configured');
      return c.json({ error: 'YouTube Music API key not configured. Please add your YouTube Data API v3 key to Supabase secrets.' }, 500);
    }

    if (!query || query.trim() === '') {
      console.log('YouTube Music API search error: Empty query');
      return c.json({ error: 'Search query is required' }, 400);
    }

    console.log(`Searching YouTube Music for: "${query}"`);
    console.log(`Using API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`API key length: ${apiKey.length}`);

    // Use YouTube Data API v3 to search for music videos
    // Note: videoCategoryId filter is removed as it may not work with all API keys
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', `${query} music`); // Add "music" to query for better results
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', '10');
    searchUrl.searchParams.set('key', apiKey);

    console.log(`Request URL: ${searchUrl.toString().replace(apiKey, 'API_KEY_HIDDEN')}`);

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log(`YouTube API search error: ${response.status} - ${errorData}`);
      
      let errorMessage = `YouTube API error: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorData);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
          console.log(`Detailed error: ${errorMessage}`);
        }
      } catch (e) {
        // Error data is not JSON
      }
      
      return c.json({ 
        error: errorMessage,
        details: 'Please check that your API key is valid and has YouTube Data API v3 enabled.',
        status: response.status
      }, response.status);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log(`No results found for query: "${query}"`);
      return c.json({ results: [] });
    }
    
    const results = data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      description: item.snippet.description
    }));

    console.log(`Found ${results.length} results for query: "${query}"`);
    return c.json({ results });

  } catch (error) {
    console.log(`YouTube Music search error: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    return c.json({ error: `Search failed: ${error.message}` }, 500);
  }
});

// Get detailed YouTube video information
app.get("/make-server-6ed35f1d/youtube/video/:videoId", async (c) => {
  try {
    const videoId = c.req.param('videoId');
    const apiKey = Deno.env.get('YOUTUBE_MUSIC_API_KEY');

    if (!apiKey) {
      console.log('YouTube Music API video details error: API key not configured');
      return c.json({ error: 'YouTube Music API key not configured' }, 500);
    }

    console.log(`Fetching YouTube video details for: ${videoId}`);

    const videoUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videoUrl.searchParams.set('part', 'snippet,contentDetails');
    videoUrl.searchParams.set('id', videoId);
    videoUrl.searchParams.set('key', apiKey);

    const response = await fetch(videoUrl.toString());
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log(`YouTube API video details error: ${response.status} - ${errorData}`);
      return c.json({ error: `YouTube API error: ${response.status}` }, response.status);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return c.json({ error: 'Video not found' }, 404);
    }

    const video = data.items[0];
    const result = {
      videoId: video.id,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
      description: video.snippet.description,
      duration: video.contentDetails.duration
    };

    console.log(`Successfully fetched video details for: ${videoId}`);
    return c.json(result);

  } catch (error) {
    console.log(`YouTube video details fetch error: ${error.message}`);
    return c.json({ error: `Failed to fetch video details: ${error.message}` }, 500);
  }
});

// Extract dominant colors from YouTube thumbnail
app.post("/make-server-6ed35f1d/youtube/extract-colors", async (c) => {
  try {
    const { thumbnailUrl } = await c.req.json();
    
    if (!thumbnailUrl) {
      return c.json({ error: 'Thumbnail URL is required' }, 400);
    }

    console.log(`Extracting colors from thumbnail: ${thumbnailUrl}`);

    // Fetch the thumbnail image
    const imageResponse = await fetch(thumbnailUrl);
    if (!imageResponse.ok) {
      return c.json({ error: 'Failed to fetch thumbnail' }, 500);
    }

    // For simplicity, generate colors based on a simple algorithm
    // In production, you'd use an image processing library
    const colors = generateColorPalette();

    console.log(`Successfully generated color palette`);
    return c.json({ colors });

  } catch (error) {
    console.log(`Color extraction error: ${error.message}`);
    return c.json({ error: `Color extraction failed: ${error.message}` }, 500);
  }
});

// Helper function to generate a color palette
function generateColorPalette() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 30 + Math.floor(Math.random() * 30);
  
  return {
    background: `hsl(${hue}, ${saturation}%, 85%)`,
    blob1: `hsl(${hue}, ${saturation + 10}%, 75%)`,
    blob2: `hsl(${hue + 10}, ${saturation + 5}%, 70%)`,
    blob3: `hsl(${hue + 20}, ${saturation}%, 65%)`,
    line: `hsl(${hue + 30}, ${saturation - 10}%, 60%)`,
    text: `hsl(${hue}, ${saturation - 20}%, 40%)`
  };
}

Deno.serve(app.fetch);
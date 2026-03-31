# YouTube Music Integration Setup Guide

This music player now integrates with YouTube Music to fetch song metadata and cover art!

## 🎵 Features

- **Search YouTube Music**: Search for any song, artist, or album
- **Automatic Metadata**: Fetches song title, artist name, and high-quality cover art
- **Color Palettes**: Auto-generates beautiful color schemes based on album art
- **Seamless Integration**: Songs from YouTube Music work just like manually added songs

## 🔑 Getting Your YouTube Data API Key

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account
3. Click "Select a project" → "New Project"
4. Enter a project name (e.g., "Music Player")
5. Click "Create"

### Step 2: Enable YouTube Data API v3

1. In your project, go to **APIs & Services** → **Library**
2. Search for "YouTube Data API v3"
3. Click on it and press **Enable**

### Step 3: Create API Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **API Key**
3. Copy the generated API key (you'll need this!)
4. (Optional but recommended) Click **Restrict Key** to add security:
   - Under "API restrictions", select "Restrict key"
   - Choose "YouTube Data API v3" from the dropdown
   - Save

### Step 4: Add API Key to Supabase

1. The API key secret modal should have appeared when you first ran the app
2. If not, you can add it manually in your Supabase dashboard:
   - Go to your Supabase project settings
   - Navigate to **Edge Functions** → **Secrets**
   - Add a new secret with name: `YOUTUBE_MUSIC_API_KEY`
   - Paste your YouTube API key as the value
3. Redeploy your edge functions if needed

## 🚀 Using YouTube Music Search

1. Click the **"Add New Song"** button (Plus icon) in the music player
2. In the modal, click **"SEARCH YOUTUBE MUSIC"** button
3. Enter your search query (song name, artist, etc.)
4. Click **Search** or press Enter
5. Browse results and click **Add** on any song you want
6. The song will be added to your library with:
   - ✅ Original title
   - ✅ Artist/channel name
   - ✅ High-quality cover art
   - ✅ Auto-generated color palette
   - ⚠️ Demo audio (see note below)

## ⚠️ Important Notes

### Audio Files

Due to YouTube's Terms of Service, we cannot directly download audio from YouTube videos. Songs added from YouTube Music will use a demo audio track.

**Options:**
1. **Demo Audio**: Songs will use a placeholder audio file
2. **Manual Upload**: After adding a song, you can manually replace the audio URL with your own legally obtained audio file
3. **Streaming Services**: Consider using legal streaming services or purchasing songs

### API Quotas

YouTube Data API v3 has daily quota limits:
- **Default**: 10,000 units per day
- **Search operation**: ~100 units per request
- **Video details**: ~1 unit per request

This means you can perform approximately 100 searches per day with the free tier.

### Privacy

Your API key is stored securely in Supabase environment variables and is never exposed to the frontend.

## 🎨 What Gets Added

When you add a song from YouTube Music:

```javascript
{
  title: "SONG TITLE",              // From YouTube video title
  artist: "CHANNEL NAME",           // From YouTube channel
  cover: "thumbnail_url",           // High-quality thumbnail
  youtubeId: "video_id",           // YouTube video ID (stored for reference)
  colors: {                        // Auto-generated color palette
    background: "#...",
    blob1: "#...",
    blob2: "#...",
    blob3: "#...",
    line: "#...",
    text: "#..."
  },
  audioUrl: "demo_url",            // Demo audio placeholder
  lines: {...},                    // Random animated curves
  circles: [...]                   // Random background circles
}
```

## 🛠️ Troubleshooting

### "API key not configured" Error

- Make sure you've added `YOUTUBE_MUSIC_API_KEY` to Supabase secrets
- Verify the secret name is exactly: `YOUTUBE_MUSIC_API_KEY`
- Redeploy your edge functions after adding the secret

### "No results found" Error

- Check your search query spelling
- Try searching with artist name + song name
- Verify your API key is valid and has YouTube Data API v3 enabled

### "Quota exceeded" Error

- You've hit the daily API quota limit
- Wait 24 hours for quota reset
- Consider requesting a quota increase from Google Cloud Console

### Search Not Working

- Open browser console (F12) to check for error messages
- Verify your internet connection
- Check that the Supabase server is running
- Ensure CORS is properly configured

## 📝 Example Searches

Good search queries:
- `The Chainsmokers Something Just Like This`
- `Martin Garrix`
- `In The Name Of Love`
- `Coldplay official audio`

## 🔄 Future Improvements

Potential enhancements:
- Extract dominant colors from actual album art (currently uses random generation)
- Support for playlists import from YouTube Music
- Better audio preview integration
- Caching of search results
- Support for YouTube Music Premium features

## 📚 API Documentation

For more details on the YouTube Data API v3:
- [Official Documentation](https://developers.google.com/youtube/v3)
- [API Reference](https://developers.google.com/youtube/v3/docs)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)

## ⚖️ Legal Notice

This integration fetches only metadata (titles, thumbnails, descriptions) from YouTube, which is permitted under YouTube's Terms of Service for non-commercial use. Audio extraction or downloading is NOT supported and would violate YouTube's ToS.

---

**Need Help?** Check the browser console for detailed error messages when debugging issues.

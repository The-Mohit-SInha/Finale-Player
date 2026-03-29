# Local Storage System

Your music player now includes a comprehensive local storage system that automatically saves all your data in the browser.

## What Gets Saved

### 1. **Songs**
- All default songs
- User-created custom songs (title, artist, cover, audio URL, colors, etc.)
- Automatically saved whenever you add a new song

### 2. **Playlists**
- All created playlists
- Songs added to each playlist
- Playlist names and creation dates
- Automatically saved whenever you create/delete playlists or add/remove songs

### 3. **Player State**
- Current song playing
- Playback position (current time)
- Shuffle and repeat settings
- Queue (upcoming songs)
- Active playlist (if playing from a playlist)
- Pre-queue state (for returning to playlist after queue finishes)

## How It Works

- **Automatic Saving**: All data is automatically saved to your browser's localStorage
- **Persistent**: Data persists across browser sessions - close and reopen the browser, and everything will be exactly as you left it
- **No Server Required**: Everything is stored locally in your browser
- **Privacy**: Your data never leaves your device

## Storage Keys

The following localStorage keys are used:
- `musicPlayer_songs` - Stores all songs
- `musicPlayer_playlists` - Stores all playlists
- `musicPlayer_playerState` - Stores current playback state

## Clearing Data

To completely reset the music player and clear all stored data:

```javascript
// Open browser console and run:
localStorage.removeItem('musicPlayer_songs');
localStorage.removeItem('musicPlayer_playlists');
localStorage.removeItem('musicPlayer_playerState');
// Then refresh the page
```

## Technical Details

- **Debounced Saves**: Player state (especially playback position) is saved with a 1-second debounce to avoid excessive writes
- **Immediate Saves**: Critical actions (pause, song change, shuffle/repeat toggle) trigger immediate saves
- **Error Handling**: All localStorage operations include error handling to prevent crashes
- **Type Safety**: Full TypeScript support with proper interfaces

## Limitations

- **Storage Size**: Browser localStorage typically has a 5-10MB limit per domain
- **No Sync**: Data is stored per browser/device - it won't sync across devices
- **Private/Incognito Mode**: Some browsers don't persist localStorage in private browsing mode

## Migration

If you had previous data in the music player before this update, it will be replaced by the default songs on first load. Any new changes you make will be automatically saved going forward.

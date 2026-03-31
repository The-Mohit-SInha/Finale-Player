import { useState } from 'react';
import { Search, X, Music, Loader2, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { YouTubeSong, Song } from '../types';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface YouTubeMusicSearchProps {
  onClose: () => void;
  onAddSong: (song: YouTubeSong) => void;
  existingSongs: Song[];
}

export function YouTubeMusicSearch({ onClose, onAddSong, existingSongs }: YouTubeMusicSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<YouTubeSong[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6ed35f1d/youtube/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ query: searchQuery })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('YouTube API error response:', errorData);
        
        let errorMsg = errorData.error || 'Search failed';
        if (errorData.details) {
          errorMsg += ` - ${errorData.details}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setResults(data.results || []);
      
      if (data.results.length === 0) {
        setError('No results found. Try a different search term.');
      }
    } catch (err) {
      console.error('YouTube Music search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to search';
      setError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSong = async (song: YouTubeSong) => {
    setSelectedSong(song.videoId);
    try {
      // Get detailed video information
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6ed35f1d/youtube/video/${song.videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch video details');
      }

      const videoDetails = await response.json();
      
      // Use the detailed information
      const enhancedSong: YouTubeSong = {
        ...song,
        thumbnail: videoDetails.thumbnail || song.thumbnail,
      };

      onAddSong(enhancedSong);
    } catch (err) {
      console.error('Error adding song:', err);
      // Fall back to basic song data
      onAddSong(song);
    } finally {
      setSelectedSong(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Music className="w-6 h-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-800">Add from YouTube Music</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for songs, artists, or albums..."
              className="w-full pl-12 pr-24 py-3 rounded-xl border-2 border-gray-300 focus:border-red-500 focus:outline-none text-gray-800 placeholder-gray-400"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>
          
          {/* Quick Test Hint */}
          {!searchQuery && results.length === 0 && !error && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 Try searching: "The Chainsmokers" or "Martin Garrix"
            </p>
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[calc(80vh-200px)] p-6">
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {!error && results.length === 0 && !isSearching && (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Search for songs to add to your library</p>
              <p className="text-gray-400 text-sm mt-2">Results will appear here</p>
            </div>
          )}

          {isSearching && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Searching YouTube Music...</p>
            </div>
          )}

          <AnimatePresence>
            <div className="space-y-3">
              {results.map((song) => {
                const isAlreadyAdded = existingSongs.some(s => s.youtubeId === song.videoId);
                return (
                  <motion.div
                    key={song.videoId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                    {/* Thumbnail */}
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-20 h-20 rounded-lg object-cover shadow-md"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {song.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {song.channelTitle}
                      </p>
                      {isAlreadyAdded && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          ✓ Already in library
                        </p>
                      )}
                    </div>

                    {/* Add Button */}
                    {isAlreadyAdded ? (
                      <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2 opacity-100">
                        <Check className="w-4 h-4" />
                        Added
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddSong(song)}
                        disabled={selectedSong === song.videoId}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 opacity-0 group-hover:opacity-100"
                      >
                        {selectedSong === song.videoId ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add
                          </>
                        )}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-amber-50 border-t border-amber-200">
          <div className="space-y-2">
            <p className="text-xs text-amber-800 text-center">
              <strong>Note:</strong> Songs from YouTube Music will include metadata and cover art. 
              Audio will use demo tracks (you can replace URLs manually later).
            </p>
            {error && error.includes('API key') && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 font-semibold mb-1">
                  📌 How to get YouTube Data API Key:
                </p>
                <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                  <li>Create a new project or select an existing one</li>
                  <li>Enable "YouTube Data API v3" in APIs & Services</li>
                  <li>Create credentials (API Key)</li>
                  <li>Add the API key to your Supabase environment variables as YOUTUBE_MUSIC_API_KEY</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
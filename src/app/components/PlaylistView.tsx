import { motion } from 'motion/react';
import { Play, Plus, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Song, Playlist } from '../types';

interface PlaylistViewProps {
  playlists: Playlist[];
  songs: Song[];
  currentSong: Song;
  currentSongIndex: number;
  isPlaying: boolean;
  queue: number[];
  viewingPlaylistId: number | null;
  activePlaylistId: number | null;
  onPlaylistClick: (id: number) => void;
  onBackToPlaylists: () => void;
  onPlayPlaylist: (id: number) => void;
  onPlaySongFromPlaylist: (songIndex: number, playlistId: number) => void;
  onAddToQueue: (index: number) => void;
  onRemoveSongFromPlaylist: (playlistId: number, songId: number) => void;
  onDeletePlaylist: (id: number) => void;
  onAddSongToPlaylist: (id: number) => void;
}

export function PlaylistView({
  playlists,
  songs,
  currentSong,
  currentSongIndex,
  isPlaying,
  queue,
  viewingPlaylistId,
  activePlaylistId,
  onPlaylistClick,
  onBackToPlaylists,
  onPlayPlaylist,
  onPlaySongFromPlaylist,
  onAddToQueue,
  onRemoveSongFromPlaylist,
  onDeletePlaylist,
  onAddSongToPlaylist
}: PlaylistViewProps) {
  if (viewingPlaylistId === null) {
    // Playlist List View
    return (
      <div className="max-h-96 overflow-y-auto">
        {playlists.length > 0 ? (
          <div className="space-y-3">
            {playlists.map((playlist, idx) => {
              const playlistSongs = playlist.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as Song[];
              const isActivePlaying = activePlaylistId === playlist.id;
              
              return (
                <motion.div
                  key={playlist.id}
                  className="rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    background: isActivePlaying ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="flex items-center justify-between p-4">
                    <div 
                      className="flex-1 flex items-center gap-4"
                      onClick={() => onPlaylistClick(playlist.id)}
                    >
                      <div className="flex-1">
                        <h3 
                          className="text-lg tracking-wide mb-1 font-semibold"
                          style={{ 
                            color: 'white',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          {playlist.name}
                          {isActivePlaying && <span className="ml-2 text-sm">• Playing</span>}
                        </h3>
                        <p 
                          className="text-sm"
                          style={{ 
                            color: 'rgba(255, 255, 255, 0.8)',
                            textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                          }}
                        >
                          {playlistSongs.length} {playlistSongs.length === 1 ? 'song' : 'songs'}
                        </p>
                      </div>
                      <ChevronRight size={20} color="white" opacity={0.8} />
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {playlistSongs.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayPlaylist(playlist.id);
                          }}
                          className="p-2 rounded-full transition-all hover:scale-110"
                          style={{ background: `${currentSong.colors.blob3}80` }}
                        >
                          <Play size={16} color="white" fill="white" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePlaylist(playlist.id);
                        }}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <X size={18} color={currentSong.colors.text} opacity={0.6} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div 
            className="text-center py-12"
            style={{ color: 'white' }}
          >
            <p className="text-lg font-semibold" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}>No playlists created yet</p>
            <p className="text-sm mt-2" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}>Create your first playlist to get started</p>
          </div>
        )}
      </div>
    );
  }

  // Playlist Detail View
  const playlist = playlists.find(p => p.id === viewingPlaylistId);
  if (!playlist) return null;
  
  const playlistSongs = playlist.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as Song[];
  
  return (
    <div>
      {/* Back Button */}
      <button
        onClick={onBackToPlaylists}
        className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg transition-all hover:scale-105"
        style={{ background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(20px)' }}
      >
        <ChevronLeft size={18} color="white" opacity={0.8} />
        <span 
          className="text-sm tracking-wide font-medium"
          style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
        >
          Back to Playlists
        </span>
      </button>

      {/* Playlist Header */}
      <div className="mb-6">
        <h3 
          className="text-xl tracking-wide mb-2 font-bold"
          style={{ 
            color: 'white',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}
        >
          {playlist.name}
        </h3>
        <p 
          className="text-sm mb-4"
          style={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
          }}
        >
          {playlistSongs.length} {playlistSongs.length === 1 ? 'song' : 'songs'}
        </p>
        
        {/* Play Playlist Button */}
        {playlistSongs.length > 0 && (
          <button
            onClick={() => onPlayPlaylist(playlist.id)}
            className="flex items-center gap-3 px-6 py-3 rounded-xl transition-all hover:scale-105"
            style={{ background: `${currentSong.colors.blob3}80` }}
          >
            <Play size={20} color="white" fill="white" />
            <span 
              className="text-base tracking-wide"
              style={{ color: 'white' }}
            >
              Play Playlist
            </span>
          </button>
        )}
      </div>

      {/* Songs in Playlist */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {playlistSongs.length > 0 ? (
          playlistSongs.map((song, idx) => {
            const songIndex = songs.findIndex(s => s.id === song.id);
            const isInQueue = queue.includes(songIndex);
            const isCurrentSong = songIndex === currentSongIndex;
            
            return (
              <motion.div
                key={song.id}
                className="p-4 rounded-xl"
                style={{
                  background: isCurrentSong ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p 
                      className="text-sm tracking-wide mb-1 font-semibold"
                      style={{ 
                        color: 'white',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      {song.title}
                    </p>
                    <p 
                      className="text-xs"
                      style={{ 
                        color: 'rgba(255, 255, 255, 0.8)',
                        textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {song.artist}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isCurrentSong && (
                      <>
                        <button
                          onClick={() => onAddToQueue(songIndex)}
                          disabled={isInQueue}
                          className="p-2 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={isInQueue ? 'Already in queue' : 'Add to queue'}
                        >
                          <Plus size={14} color="white" opacity={0.8} />
                        </button>
                        <button
                          onClick={() => onPlaySongFromPlaylist(songIndex, playlist.id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-full transition-all hover:scale-105"
                          style={{ background: `${currentSong.colors.blob3}60` }}
                        >
                          <Play size={14} color="white" fill="white" />
                        </button>
                      </>
                    )}
                    {isCurrentSong && (
                      <div className="flex items-center gap-2 px-3 py-2">
                        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: currentSong.colors.blob3 }} />
                        <span 
                          className="text-xs tracking-wide font-medium"
                          style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                        >
                          {isPlaying ? 'Playing' : 'Paused'}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => onRemoveSongFromPlaylist(playlist.id, song.id)}
                      className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <Trash2 size={14} color="white" opacity={0.8} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div 
            className="text-center py-12"
            style={{ color: 'white' }}
          >
            <p className="text-base font-semibold" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}>No songs in this playlist</p>
            <p className="text-sm mt-2" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}>Add songs to get started</p>
          </div>
        )}
      </div>

      {/* Add Current Song Button */}
      {!playlist.songIds.includes(currentSong.id) && (
        <button
          onClick={() => onAddSongToPlaylist(playlist.id)}
          className="w-full mt-4 p-3 rounded-lg transition-all hover:scale-[1.02]"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <Plus size={16} color="white" opacity={0.8} />
            <span 
              className="text-sm tracking-wide font-medium"
              style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
            >
              Add "{currentSong.title}"
            </span>
          </div>
        </button>
      )}
    </div>
  );
}

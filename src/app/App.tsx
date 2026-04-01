import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Plus, X, Trash2, ChevronLeft, ChevronRight, ListPlus } from 'lucide-react';
import { PlaylistView } from './components/PlaylistView';
import { GestureControl } from './components/GestureControl';
import { VoiceControl } from './components/VoiceControl';
import { YouTubeMusicSearch } from './components/YouTubeMusicSearch';
import { YouTubePlayer, YouTubePlayerRef } from './components/YouTubePlayer';
import { Song, Playlist, YouTubeSong } from './types';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { 
  saveSongs, 
  loadSongs, 
  savePlaylists, 
  loadPlaylists, 
  savePlayerState, 
  loadPlayerState 
} from './utils/localStorage';

// Helper function to generate random circles for songs
const generateRandomCircles = () => [
  { 
    x: 15 + Math.random() * 20, 
    y: 15 + Math.random() * 15, 
    size: 260 + Math.random() * 60, 
    color: `hsl(${Math.random() * 360}, 40%, 70%)` 
  },
  { 
    x: 65 + Math.random() * 20, 
    y: 55 + Math.random() * 20, 
    size: 300 + Math.random() * 80, 
    color: `hsl(${Math.random() * 360}, 35%, 65%)` 
  },
  { 
    x: 30 + Math.random() * 25, 
    y: 70 + Math.random() * 18, 
    size: 220 + Math.random() * 60, 
    color: `hsl(${Math.random() * 360}, 38%, 68%)` 
  },
  { 
    x: 80 + Math.random() * 15, 
    y: 25 + Math.random() * 20, 
    size: 280 + Math.random() * 70, 
    color: `hsl(${Math.random() * 360}, 42%, 72%)` 
  }
];

export default function App() {
  // Default songs data
  // No default songs - start with empty library
  // All songs must be added from YouTube Music
  const defaultSongs: Song[] = [];
  
  // Load initial data from localStorage
  const savedSongs = loadSongs();
  const savedPlaylists = loadPlaylists();
  const initialPlayerState = loadPlayerState();
  
  // Filter out any non-YouTube songs from localStorage
  const filteredSongs = (savedSongs || defaultSongs).filter(song => song.youtubeId);
  
  // Initialize songs with circles
  const initialSongsData = filteredSongs.map(song => ({
    ...song,
    circles: song.circles || generateRandomCircles()
  }));
  
  // Initialize state with localStorage data or defaults
  const [songs, setSongs] = useState<Song[]>(initialSongsData);
  const [playlists, setPlaylists] = useState<Playlist[]>(savedPlaylists || []);

  // Ensure currentSongIndex is valid for the songs array
  const validCurrentSongIndex = initialPlayerState?.currentSongIndex ?? 0;
  const safeSongIndex = validCurrentSongIndex < initialSongsData.length ? validCurrentSongIndex : 0;
  
  const [currentSongIndex, setCurrentSongIndex] = useState(safeSongIndex);
  const [isPlaying, setIsPlaying] = useState(false); // Always start paused
  const [currentTime, setCurrentTime] = useState(initialPlayerState?.currentTime ?? 0);
  const [duration, setDuration] = useState(initialPlayerState?.duration ?? 0);
  const [isShuffleOn, setIsShuffleOn] = useState(initialPlayerState?.isShuffleOn ?? false);
  const [isRepeatOn, setIsRepeatOn] = useState(initialPlayerState?.isRepeatOn ?? false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaylistsOpen, setIsPlaylistsOpen] = useState(false);
  const [isAllSongsOpen, setIsAllSongsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queue, setQueue] = useState<number[]>(initialPlayerState?.queue ?? []);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [selectedPlaylistForAdding, setSelectedPlaylistForAdding] = useState<number | null>(null);
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(initialPlayerState?.activePlaylistId ?? null);
  const [preQueuePlaylistId, setPreQueuePlaylistId] = useState<number | null>(initialPlayerState?.preQueuePlaylistId ?? null);
  const [preQueueSongIndex, setPreQueueSongIndex] = useState<number | null>(initialPlayerState?.preQueueSongIndex ?? null);
  const [viewingPlaylistId, setViewingPlaylistId] = useState<number | null>(null);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [isYouTubeMusicSearchOpen, setIsYouTubeMusicSearchOpen] = useState(false);
  const [isVoiceControlOpen, setIsVoiceControlOpen] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<number | null>(null);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [newSong, setNewSong] = useState({
    title: '',
    artist: '',
    coverUrl: '',
    audioUrl: '',
    backgroundColor: '#d8d8d8',
    blob1Color: '#b8c8c8',
    blob2Color: '#98a8a8',
    blob3Color: '#788898',
    lineColor: '#888888',
    textColor: '#5a5a5a'
  });
  const youtubePlayerRef = useRef<YouTubePlayerRef>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const playlistInputRef = useRef<HTMLInputElement>(null);
  const addSongInputRef = useRef<HTMLInputElement>(null);
  const isRepeatOnRef = useRef(isRepeatOn);

  const currentSong = songs[currentSongIndex];
  const nextSong = songs[(currentSongIndex + 1) % songs.length];

  // Keep ref in sync with state
  useEffect(() => {
    isRepeatOnRef.current = isRepeatOn;
  }, [isRepeatOn]);

  // Filter songs based on search query
  const searchResults = searchQuery.trim() === '' 
    ? [] 
    : songs.filter(song => 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSearchClick = () => {
    setIsSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleSearchClose = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handlePlaySearchResult = (index: number) => {
    setCurrentSongIndex(index);
    setIsPlaying(true);
    
    // Always exit playlist when selecting from search
    setActivePlaylistId(null);
    
    handleSearchClose();
  };

  const handlePlaylistsClick = () => {
    setIsPlaylistsOpen(true);
  };

  const handlePlaylistsClose = () => {
    setIsPlaylistsOpen(false);
    setIsCreatingPlaylist(false);
    setNewPlaylistName('');
    setSelectedPlaylistForAdding(null);
    setViewingPlaylistId(null);
  };

  const handleAllSongsClick = () => {
    setIsAllSongsOpen(true);
  };

  const handleAllSongsClose = () => {
    setIsAllSongsOpen(false);
  };

  const handlePlaySongFromList = (index: number) => {
    setCurrentSongIndex(index);
    setIsPlaying(true);
    
    // Always exit playlist when selecting from All Songs
    setActivePlaylistId(null);
    
    handleAllSongsClose();
  };

  const handlePlaylistClick = (playlistId: number) => {
    setViewingPlaylistId(playlistId);
  };

  const handleBackToPlaylists = () => {
    setViewingPlaylistId(null);
  };

  const handlePlayPlaylist = (playlistId: number) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || playlist.songIds.length === 0) return;
    
    // Find the first song in the playlist
    const firstSongId = playlist.songIds[0];
    const firstSongIndex = songs.findIndex(s => s.id === firstSongId);
    
    if (firstSongIndex !== -1) {
      setCurrentSongIndex(firstSongIndex);
      setActivePlaylistId(playlistId);
      setIsPlaying(true);
      setViewingPlaylistId(null);
      setIsPlaylistsOpen(false);
    }
  };

  const handlePlaySongFromPlaylist = (songIndex: number, playlistId: number) => {
    setCurrentSongIndex(songIndex);
    setActivePlaylistId(playlistId);
    setIsPlaying(true);
  };

  const handleQueueClick = () => {
    setIsQueueOpen(true);
  };

  const handleQueueClose = () => {
    setIsQueueOpen(false);
  };

  const handleAddToQueue = (index: number) => {
    if (!queue.includes(index)) {
      setQueue([...queue, index]);
    }
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue(queue.filter(i => i !== index));
  };

  const handleClearQueue = () => {
    setQueue([]);
  };

  const handlePlayFromQueue = (queueIndex: number) => {
    const songIndex = queue[queueIndex];
    
    // Save the current playlist state and song before playing from queue (only if not already saved)
    if (preQueuePlaylistId === null) {
      setPreQueuePlaylistId(activePlaylistId);
      setPreQueueSongIndex(currentSongIndex);
    }
    
    setCurrentSongIndex(songIndex);
    setIsPlaying(true);
    
    // Remove this song and all songs before it from the queue
    setQueue(queue.slice(queueIndex + 1));
    handleQueueClose();
  };

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist: Playlist = {
        id: Date.now(),
        name: newPlaylistName.trim(),
        songIds: [],
        createdAt: new Date()
      };
      setPlaylists([...playlists, newPlaylist]);
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
    }
  };

  const handleAddSongToPlaylist = (playlistId: number) => {
    setPlaylists(playlists.map(playlist => {
      if (playlist.id === playlistId) {
        // Check if song is already in playlist
        if (!playlist.songIds.includes(currentSong.id)) {
          return {
            ...playlist,
            songIds: [...playlist.songIds, currentSong.id]
          };
        }
      }
      return playlist;
    }));
    setSelectedPlaylistForAdding(null);
  };

  const handleRemoveSongFromPlaylist = (playlistId: number, songId: number) => {
    setPlaylists(playlists.map(playlist => {
      if (playlist.id === playlistId) {
        return {
          ...playlist,
          songIds: playlist.songIds.filter(id => id !== songId)
        };
      }
      return playlist;
    }));
  };

  const handleDeletePlaylist = (playlistId: number) => {
    setPlaylists(playlists.filter(playlist => playlist.id !== playlistId));
  };

  const handleDeleteSong = (songIndex: number) => {
    const songId = songs[songIndex].id;
    
    // Remove song from all playlists
    setPlaylists(playlists.map(playlist => ({
      ...playlist,
      songIds: playlist.songIds.filter(id => id !== songId)
    })));
    
    // Remove from queue
    setQueue(queue.filter(idx => idx !== songIndex).map(idx => idx > songIndex ? idx - 1 : idx));
    
    // Remove the song from songs array
    const newSongs = songs.filter((_, idx) => idx !== songIndex);
    setSongs(newSongs);
    
    // If no songs left, reset everything
    if (newSongs.length === 0) {
      setCurrentSongIndex(0);
      setIsPlaying(false);
      setActivePlaylistId(null);
      setQueue([]);
      setPreQueuePlaylistId(null);
      setPreQueueSongIndex(null);
      // Close any open modals
      setIsSearchOpen(false);
      setIsAllSongsOpen(false);
      return;
    }
    
    // Adjust current song index if needed
    if (currentSongIndex === songIndex) {
      // If deleting current song, move to next song (or previous if last)
      setCurrentSongIndex(songIndex >= newSongs.length ? 0 : songIndex);
      setIsPlaying(false);
    } else if (currentSongIndex > songIndex) {
      // Adjust index if deleted song was before current
      setCurrentSongIndex(currentSongIndex - 1);
    }
    
    // Exit active playlist if it becomes empty
    if (activePlaylistId !== null) {
      const activePlaylist = playlists.find(p => p.id === activePlaylistId);
      if (activePlaylist && activePlaylist.songIds.includes(songId)) {
        const newSongIds = activePlaylist.songIds.filter(id => id !== songId);
        if (newSongIds.length === 0) {
          setActivePlaylistId(null);
        }
      }
    }
  };

  const handleAddSpecificSongToPlaylist = (songIndex: number, playlistId: number) => {
    const songId = songs[songIndex].id;
    setPlaylists(playlists.map(playlist => {
      if (playlist.id === playlistId) {
        // Check if song is already in playlist
        if (!playlist.songIds.includes(songId)) {
          return {
            ...playlist,
            songIds: [...playlist.songIds, songId]
          };
        }
      }
      return playlist;
    }));
    setSongToAddToPlaylist(null);
    setShowPlaylistSelector(false);
  };

  const handleOpenPlaylistSelector = (songIndex: number) => {
    setSongToAddToPlaylist(songIndex);
    setShowPlaylistSelector(true);
  };

  const handleClosePlaylistSelector = () => {
    setSongToAddToPlaylist(null);
    setShowPlaylistSelector(false);
  };

  const handleAddSongClick = () => {
    setIsAddSongOpen(true);
    setTimeout(() => addSongInputRef.current?.focus(), 100);
  };

  const handleAddSongClose = () => {
    setIsAddSongOpen(false);
    setNewSong({
      title: '',
      artist: '',
      coverUrl: '',
      audioUrl: '',
      backgroundColor: '#d8d8d8',
      blob1Color: '#b8c8c8',
      blob2Color: '#98a8a8',
      blob3Color: '#788898',
      lineColor: '#888888',
      textColor: '#5a5a5a'
    });
  };

  const handleCreateSong = () => {
    if (newSong.title.trim() && newSong.artist.trim() && newSong.audioUrl.trim()) {
      const randomLinePaths = [
        {
          path1: "M 200 100 Q 400 50, 600 120 Q 750 170, 850 100",
          path2: "M 100 400 Q 150 550, 250 600 Q 350 620, 450 580"
        },
        {
          path1: "M 800 200 Q 650 280, 500 240 Q 350 220, 200 280",
          path2: "M 900 500 Q 820 600, 700 550 Q 600 520, 500 580"
        },
        {
          path1: "M 150 150 Q 300 100, 450 180 Q 600 250, 750 200 Q 850 170, 920 220",
          path2: "M 50 500 Q 100 620, 200 580 Q 300 550, 400 620 Q 500 680, 600 640"
        },
        {
          path1: "M 700 80 Q 600 150, 450 100 Q 300 60, 150 120 Q 80 180, 50 250",
          path2: "M 950 400 Q 900 520, 800 480 Q 700 450, 600 500 Q 500 550, 400 520"
        }
      ];

      const randomLines = randomLinePaths[Math.floor(Math.random() * randomLinePaths.length)];

      const createdSong: Song = {
        id: Date.now(),
        title: newSong.title.trim().toUpperCase(),
        artist: newSong.artist.trim().toUpperCase(),
        cover: newSong.coverUrl.trim() || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop',
        audioUrl: newSong.audioUrl.trim(),
        colors: {
          background: newSong.backgroundColor,
          blob1: newSong.blob1Color,
          blob2: newSong.blob2Color,
          blob3: newSong.blob3Color,
          line: newSong.lineColor,
          text: newSong.textColor
        },
        lines: randomLines,
        circles: generateRandomCircles()
      };

      setSongs(prevSongs => [...prevSongs, createdSong]);
      handleAddSongClose();
    }
  };

  const handleYouTubeMusicClick = () => {
    setIsYouTubeMusicSearchOpen(true);
  };

  const handleYouTubeMusicClose = () => {
    setIsYouTubeMusicSearchOpen(false);
  };

  const handleAddYouTubeSong = async (youtubeSong: YouTubeSong) => {
    try {
      // Check if song already exists
      const songExists = songs.some(song => song.youtubeId === youtubeSong.videoId);
      if (songExists) {
        console.log('Song already exists in library:', youtubeSong.title);
        alert('This song is already in your library!');
        return;
      }

      // Fetch color palette for the song
      const colorResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6ed35f1d/youtube/extract-colors`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ thumbnailUrl: youtubeSong.thumbnail })
        }
      );

      let colors = {
        background: '#d8d8d8',
        blob1: '#b8c8c8',
        blob2: '#98a8a8',
        blob3: '#788898',
        line: '#888888',
        text: '#5a5a5a'
      };

      if (colorResponse.ok) {
        const colorData = await colorResponse.json();
        colors = colorData.colors;
      }

      const randomLinePaths = [
        {
          path1: "M 200 100 Q 400 50, 600 120 Q 750 170, 850 100",
          path2: "M 100 400 Q 150 550, 250 600 Q 350 620, 450 580"
        },
        {
          path1: "M 800 200 Q 650 280, 500 240 Q 350 220, 200 280",
          path2: "M 900 500 Q 820 600, 700 550 Q 600 520, 500 580"
        },
        {
          path1: "M 150 150 Q 300 100, 450 180 Q 600 250, 750 200 Q 850 170, 920 220",
          path2: "M 50 500 Q 100 620, 200 580 Q 300 550, 400 620 Q 500 680, 600 640"
        },
        {
          path1: "M 700 80 Q 600 150, 450 100 Q 300 60, 150 120 Q 80 180, 50 250",
          path2: "M 950 400 Q 900 520, 800 480 Q 700 450, 600 500 Q 500 550, 400 520"
        }
      ];

      const randomLines = randomLinePaths[Math.floor(Math.random() * randomLinePaths.length)];

      const newSong: Song = {
        id: Date.now(),
        title: youtubeSong.title.toUpperCase(),
        artist: youtubeSong.channelTitle.toUpperCase(),
        cover: youtubeSong.thumbnail,
        audioUrl: 'https://image2url.com/r2/default/audio/1774466339946-5ac00fec-af07-4b30-9da6-f07844c22800.mp3', // Demo audio - users can replace
        youtubeId: youtubeSong.videoId,
        colors: colors,
        lines: randomLines,
        circles: generateRandomCircles()
      };

      setSongs(prevSongs => {
        console.log('Adding song to library. Current songs:', prevSongs.length, 'New total will be:', prevSongs.length + 1);
        console.log('New song:', newSong.title, 'by', newSong.artist);
        return [...prevSongs, newSong];
      });
      handleYouTubeMusicClose();
    } catch (error) {
      console.error('Error adding YouTube song:', error);
    }
  };

  // Load initial playback time when song changes
  useEffect(() => {
    const player = youtubePlayerRef.current;
    if (player && initialPlayerState && currentSongIndex === initialPlayerState.currentSongIndex) {
      player.seekTo(initialPlayerState.currentTime);
    }
  }, []);

  // Save songs to localStorage whenever they change
  useEffect(() => {
    saveSongs(songs);
  }, [songs]);

  // Save playlists to localStorage whenever they change
  useEffect(() => {
    savePlaylists(playlists);
  }, [playlists]);

  // Save player state to localStorage (debounced for currentTime)
  useEffect(() => {
    // Save immediately when key states change (not currentTime)
    const playerState = {
      currentSongIndex,
      isPlaying,
      currentTime,
      duration,
      isShuffleOn,
      isRepeatOn,
      queue,
      activePlaylistId,
      preQueuePlaylistId,
      preQueueSongIndex,
    };
    
    // Debounce currentTime saves to avoid excessive localStorage writes
    const timeoutId = setTimeout(() => {
      savePlayerState(playerState);
    }, 1000); // Save after 1 second of no changes
    
    return () => clearTimeout(timeoutId);
  }, [
    currentSongIndex,
    isPlaying,
    currentTime,
    duration,
    isShuffleOn,
    isRepeatOn,
    queue,
    activePlaylistId,
    preQueuePlaylistId,
    preQueueSongIndex,
  ]);
  
  // Save player state immediately when pausing or key events happen
  useEffect(() => {
    const playerState = {
      currentSongIndex,
      isPlaying,
      currentTime,
      duration,
      isShuffleOn,
      isRepeatOn,
      queue,
      activePlaylistId,
      preQueuePlaylistId,
      preQueueSongIndex,
    };
    
    // Save immediately when pausing, changing songs, or toggling settings
    if (!isPlaying || isShuffleOn || isRepeatOn) {
      savePlayerState(playerState);
    }
  }, [isPlaying, currentSongIndex, isShuffleOn, isRepeatOn]);

  // Handle playback with YouTube Player
  useEffect(() => {
    const player = youtubePlayerRef.current;
    if (!player || !currentSong?.youtubeId) return;

    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, currentSong]);

  // Reset time when song changes
  useEffect(() => {
    setCurrentTime(0);
  }, [currentSongIndex]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleNext = () => {
    // Turn off repeat when manually changing songs
    setIsRepeatOn(false);
    
    // If there are songs in the queue, play the next one from queue
    if (queue.length > 0) {
      const nextSongIndex = queue[0];
      
      // Save the current playlist state and song before playing from queue (only if not already saved)
      if (preQueuePlaylistId === null && activePlaylistId !== null) {
        setPreQueuePlaylistId(activePlaylistId);
        setPreQueueSongIndex(currentSongIndex);
      }
      
      setCurrentSongIndex(nextSongIndex);
      setQueue(queue.slice(1)); // Remove the first song from queue
      setIsPlaying(true);
      return;
    }
    
    // If playing from a playlist, navigate within that playlist
    if (activePlaylistId !== null) {
      const playlist = playlists.find(p => p.id === activePlaylistId);
      if (playlist) {
        const currentSongId = songs[currentSongIndex].id;
        const currentIndexInPlaylist = playlist.songIds.indexOf(currentSongId);
        
        if (currentIndexInPlaylist !== -1) {
          const nextIndexInPlaylist = (currentIndexInPlaylist + 1) % playlist.songIds.length;
          const nextSongId = playlist.songIds[nextIndexInPlaylist];
          const nextSongIndex = songs.findIndex(s => s.id === nextSongId);
          
          if (nextSongIndex !== -1) {
            setCurrentSongIndex(nextSongIndex);
            setIsPlaying(true);
            return;
          }
        }
      }
    }
    
    // If shuffle is on, play a random song (not the current one)
    if (isShuffleOn) {
      const availableSongs = songs
        .map((_, index) => index)
        .filter(index => index !== currentSongIndex);
      const randomIndex = availableSongs[Math.floor(Math.random() * availableSongs.length)];
      setCurrentSongIndex(randomIndex);
    } else {
      // Normal behavior: play next song in sequence
      setCurrentSongIndex((prev) => (prev + 1) % songs.length);
    }
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    // If song is past 5 seconds, restart the current song
    if (currentTime > 5) {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(0);
        setCurrentTime(0);
      }
      setIsPlaying(true);
      return;
    }
    
    // Otherwise, go to previous song
    // Turn off repeat when manually changing songs
    setIsRepeatOn(false);
    
    // If there are songs in the queue, ensure we save the playlist state if not already saved
    if (queue.length > 0 && preQueuePlaylistId === null && activePlaylistId !== null) {
      setPreQueuePlaylistId(activePlaylistId);
      setPreQueueSongIndex(currentSongIndex);
    }
    
    // If playing from a playlist, navigate within that playlist
    if (activePlaylistId !== null) {
      const playlist = playlists.find(p => p.id === activePlaylistId);
      if (playlist) {
        const currentSongId = songs[currentSongIndex].id;
        const currentIndexInPlaylist = playlist.songIds.indexOf(currentSongId);
        
        if (currentIndexInPlaylist !== -1) {
          const prevIndexInPlaylist = (currentIndexInPlaylist - 1 + playlist.songIds.length) % playlist.songIds.length;
          const prevSongId = playlist.songIds[prevIndexInPlaylist];
          const prevSongIndex = songs.findIndex(s => s.id === prevSongId);
          
          if (prevSongIndex !== -1) {
            setCurrentSongIndex(prevSongIndex);
            setIsPlaying(true);
            return;
          }
        }
      }
    }
    
    // If shuffle is on, play a random song (not the current one)
    if (isShuffleOn) {
      const availableSongs = songs
        .map((_, index) => index)
        .filter(index => index !== currentSongIndex);
      const randomIndex = availableSongs[Math.floor(Math.random() * availableSongs.length)];
      setCurrentSongIndex(randomIndex);
    } else {
      // Normal behavior: play previous song in sequence
      setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
    }
    setIsPlaying(true);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  // Empty state - no songs added yet
  if (!currentSong || songs.length === 0) {
    return (
      <div className="size-full min-h-screen flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
        <div className="text-center z-10 px-8">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            Welcome to Your Music Player
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start by searching for songs on YouTube Music
          </p>
          <button
            onClick={() => setIsYouTubeMusicSearchOpen(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            🎵 Search YouTube Music
          </button>
        </div>

        {/* YouTube Music Search Modal */}
        <AnimatePresence>
          {isYouTubeMusicSearchOpen && (
            <YouTubeMusicSearch
              onClose={handleYouTubeMusicClose}
              onAddSong={handleAddYouTubeSong}
              existingSongs={songs}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div 
      className="size-full min-h-screen flex items-center justify-center overflow-hidden relative transition-colors duration-1000 py-4 md:py-0"
      style={{ backgroundColor: currentSong.colors.background }}
    >
      {/* Top Right Cover Circle with Glassmorphism */}
      <AnimatePresence>
        <motion.div
          key={`cover-circle-${currentSong.id}`}
          className="absolute -top-[300px] -right-[300px] w-[700px] h-[700px] md:-top-[600px] md:-right-[600px] md:w-[1400px] md:h-[1400px] rounded-full overflow-hidden pointer-events-none"
          style={{ 
            zIndex: 1,
            backgroundImage: `url(${currentSong.cover})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
        >
          {/* Glassmorphism Overlay - adapts to song background */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              backdropFilter: 'blur(20px)',
              backgroundColor: currentSong.colors.background,
              opacity: 0.85
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Organic Blob Shapes */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`blobs-${currentSong.id}`}
          className="absolute inset-0 overflow-hidden"
          style={{ zIndex: 2 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          {/* Top Right Blob */}
          <div 
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: currentSong.colors.blob1, opacity: 0.4 }}
          />
          {/* Bottom Left Blob */}
          <div 
            className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl"
            style={{ backgroundColor: currentSong.colors.blob2, opacity: 0.3 }}
          />
          {/* Top Left Small Blob */}
          <div 
            className="absolute top-20 left-20 w-64 h-64 rounded-full blur-2xl"
            style={{ backgroundColor: currentSong.colors.blob3, opacity: 0.2 }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Curved Lines */}
      <AnimatePresence mode="wait">
        <motion.svg
          key={`lines-${currentSong.id}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 3 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* First Curved Line */}
          <motion.path
            d={currentSong.lines.path1}
            stroke={currentSong.colors.line}
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          />
          
          {/* Second Curved Line */}
          <motion.path
            d={currentSong.lines.path2}
            stroke={currentSong.colors.line}
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
          />
        </motion.svg>
      </AnimatePresence>

      {/* Roaming Circles */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        {currentSong.circles.map((circle, index) => (
          <motion.div
            key={`circle-${index}`}
            className="absolute rounded-full blur-xl"
            style={{
              opacity: 0.35
            }}
            initial={false}
            animate={{
              left: `${circle.x}%`,
              top: `${circle.y}%`,
              width: `${circle.size}px`,
              height: `${circle.size}px`,
              backgroundColor: circle.color,
              x: [0, 15, -10, 20, -15, 10, 0],
              y: [0, -20, 15, -15, 20, -10, 0]
            }}
            transition={{
              left: { duration: 1.5, ease: [0.25, 0.1, 0.25, 1] },
              top: { duration: 1.5, ease: [0.25, 0.1, 0.25, 1] },
              width: { duration: 1.5, ease: [0.25, 0.1, 0.25, 1] },
              height: { duration: 1.5, ease: [0.25, 0.1, 0.25, 1] },
              backgroundColor: { duration: 1.5, ease: [0.25, 0.1, 0.25, 1] },
              x: {
                duration: 8 + index * 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              },
              y: {
                duration: 10 + index * 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          />
        ))}
      </div>

      {/* Right Side Vertical Text */}
      <div className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-[9999]">
        <div className="flex flex-col gap-6 md:gap-12">
          <button
            onClick={handleSearchClick}
            className="text-xs tracking-[0.3em] writing-mode-vertical hover:opacity-100 transition-opacity cursor-pointer"
            style={{ 
              writingMode: 'vertical-rl',
              color: currentSong.colors.text,
              opacity: 0.6
            }}
          >
            SEARCH
          </button>
          <button
            onClick={handlePlaylistsClick}
            className="text-xs tracking-[0.3em] writing-mode-vertical hover:opacity-100 transition-opacity cursor-pointer"
            style={{ 
              writingMode: 'vertical-rl',
              color: currentSong.colors.text,
              opacity: 0.6
            }}
          >
            PLAYLISTS
          </button>
          <button
            onClick={handleAllSongsClick}
            className="text-xs tracking-[0.3em] writing-mode-vertical hover:opacity-100 transition-opacity cursor-pointer"
            style={{ 
              writingMode: 'vertical-rl',
              color: currentSong.colors.text,
              opacity: 0.6
            }}
          >
            ALL SONGS
          </button>
        </div>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            className="absolute inset-0 z-50 flex items-start justify-center pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={handleSearchClose}
            />
            
            {/* Search Container */}
            <motion.div
              className="relative w-full max-w-2xl mx-8"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Glass Search Box */}
              <div 
                className="rounded-2xl p-6 shadow-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                {/* Search Input */}
                <div className="relative mb-4">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a song..."
                    className="w-full px-6 py-4 rounded-xl text-lg outline-none transition-all placeholder-gray-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      border: '2px solid rgba(255, 255, 255, 0.3)'
                    }}
                  />
                  <button
                    onClick={handleSearchClose}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X size={20} color="white" opacity={0.8} />
                  </button>
                </div>

                {/* Search Results */}
                <div className="max-h-96 overflow-y-auto">
                  {searchQuery.trim() !== '' && (
                    <>
                      {searchResults.length > 0 ? (
                        <div className="space-y-2">
                          {searchResults.map((song, idx) => {
                            const songIndex = songs.findIndex(s => s.id === song.id);
                            const isInQueue = queue.includes(songIndex);
                            return (
                              <motion.div
                                key={song.id}
                                className="p-4 rounded-xl"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.2)',
                                  backdropFilter: 'blur(20px)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)'
                                }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h3 
                                      className="text-base tracking-wide mb-1 font-semibold"
                                      style={{ 
                                        color: 'white',
                                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                      }}
                                    >
                                      {song.title}
                                    </h3>
                                    <p 
                                      className="text-sm"
                                      style={{ 
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                                      }}
                                    >
                                      {song.artist}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSong(songIndex);
                                      }}
                                      className="p-2 rounded-full transition-all hover:scale-105"
                                      style={{ background: 'rgba(239, 68, 68, 0.6)' }}
                                      title="Delete Song"
                                    >
                                      <Trash2 size={16} color="white" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenPlaylistSelector(songIndex)}
                                      className="p-2 rounded-full transition-all hover:scale-105"
                                      style={{ background: `${currentSong.colors.blob1}60` }}
                                      title="Add to Playlist"
                                    >
                                      <ListPlus size={16} color="white" />
                                    </button>
                                    <button
                                      onClick={() => handleAddToQueue(songIndex)}
                                      disabled={isInQueue}
                                      className="flex items-center gap-2 px-3 py-2 rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                      style={{ background: `${currentSong.colors.blob2}60` }}
                                    >
                                      <Plus size={14} color="white" />
                                      <span 
                                        className="text-xs"
                                        style={{ color: 'white' }}
                                      >
                                        {isInQueue ? 'Queued' : 'Queue'}
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => handlePlaySearchResult(songIndex)}
                                      className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:scale-105"
                                      style={{ background: `${currentSong.colors.blob3}60` }}
                                    >
                                      <Play size={16} color="white" fill="white" />
                                      <span 
                                        className="text-sm"
                                        style={{ color: 'white' }}
                                      >
                                        Play
                                      </span>
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
                          <p className="text-lg font-semibold" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}>No results found</p>
                          <p className="text-sm mt-2" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}>Try a different search term</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlists Modal */}
      <AnimatePresence>
        {isPlaylistsOpen && (
          <motion.div
            className="absolute inset-0 z-50 flex items-start justify-center pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={handlePlaylistsClose}
            />
            
            {/* Playlists Container */}
            <motion.div
              className="relative w-full max-w-2xl mx-8"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Glass Playlists Box */}
              <div 
                className="rounded-2xl p-6 shadow-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 
                    className="text-2xl tracking-wider font-bold"
                    style={{ color: 'white', textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                  >
                    MY PLAYLISTS
                  </h2>
                  <button
                    onClick={handlePlaylistsClose}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X size={20} color="white" opacity={0.8} />
                  </button>
                </div>

                {/* Create New Playlist Button */}
                {!isCreatingPlaylist && (
                  <button
                    onClick={() => {
                      setIsCreatingPlaylist(true);
                      setTimeout(() => playlistInputRef.current?.focus(), 100);
                    }}
                    className="w-full p-4 rounded-xl mb-4 transition-all hover:scale-[1.02]"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(20px)',
                      border: '2px dashed rgba(255, 255, 255, 0.4)'
                    }}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Plus size={20} color="white" opacity={0.9} />
                      <span 
                        className="text-base tracking-wide font-semibold"
                        style={{ color: 'white', textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                      >
                        Create New Playlist
                      </span>
                    </div>
                  </button>
                )}

                {/* Create Playlist Input */}
                {isCreatingPlaylist && (
                  <motion.div
                    className="mb-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex gap-2">
                      <input
                        ref={playlistInputRef}
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreatePlaylist();
                          } else if (e.key === 'Escape') {
                            setIsCreatingPlaylist(false);
                            setNewPlaylistName('');
                          }
                        }}
                        placeholder="Enter playlist name..."
                        className="flex-1 px-6 py-4 rounded-xl text-lg outline-none transition-all placeholder-gray-300"
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          border: '2px solid rgba(255, 255, 255, 0.3)'
                        }}
                      />
                      <button
                        onClick={handleCreatePlaylist}
                        className="px-6 py-4 rounded-xl transition-all hover:scale-105 font-semibold"
                        style={{
                          background: 'rgba(255, 255, 255, 0.3)',
                          backdropFilter: 'blur(20px)',
                          color: 'white',
                          textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingPlaylist(false);
                          setNewPlaylistName('');
                        }}
                        className="px-6 py-4 rounded-xl transition-all hover:scale-105 font-semibold"
                        style={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(20px)',
                          color: 'white',
                          textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Playlists List */}
                <PlaylistView
                  playlists={playlists}
                  songs={songs}
                  currentSong={currentSong}
                  currentSongIndex={currentSongIndex}
                  isPlaying={isPlaying}
                  queue={queue}
                  viewingPlaylistId={viewingPlaylistId}
                  activePlaylistId={activePlaylistId}
                  onPlaylistClick={handlePlaylistClick}
                  onBackToPlaylists={handleBackToPlaylists}
                  onPlayPlaylist={handlePlayPlaylist}
                  onPlaySongFromPlaylist={handlePlaySongFromPlaylist}
                  onAddToQueue={handleAddToQueue}
                  onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
                  onDeletePlaylist={handleDeletePlaylist}
                  onAddSongToPlaylist={handleAddSongToPlaylist}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Songs Modal */}
      <AnimatePresence>
        {isAllSongsOpen && (
          <motion.div
            className="absolute inset-0 z-50 flex items-start justify-center pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={handleAllSongsClose}
            />
            
            {/* All Songs Container */}
            <motion.div
              className="relative w-full max-w-2xl mx-8"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Glass All Songs Box */}
              <div 
                className="rounded-2xl p-6 shadow-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 
                    className="text-2xl tracking-wider font-bold"
                    style={{ color: 'white', textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                  >
                    ALL SONGS
                  </h2>
                  <button
                    onClick={handleAllSongsClose}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X size={20} color="white" opacity={0.8} />
                  </button>
                </div>

                {/* Songs List */}
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {songs.map((song, idx) => {
                      const isInQueue = queue.includes(idx);
                      return (
                        <motion.div
                          key={song.id}
                          className="p-4 rounded-xl"
                          style={{
                            background: idx === currentSongIndex 
                              ? 'rgba(255, 255, 255, 0.3)'
                              : 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)'
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 
                                className="text-base tracking-wide mb-1 font-semibold"
                                style={{ 
                                  color: 'white',
                                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}
                              >
                                {song.title}
                              </h3>
                              <p 
                                className="text-sm"
                                style={{ 
                                  color: 'rgba(255, 255, 255, 0.8)',
                                  textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                                }}
                              >
                                {song.artist}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSong(idx);
                                }}
                                className="p-2 rounded-full transition-all hover:scale-105"
                                style={{ background: 'rgba(239, 68, 68, 0.6)' }}
                                title="Delete Song"
                              >
                                <Trash2 size={16} color="white" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPlaylistSelector(idx);
                                }}
                                className="p-2 rounded-full transition-all hover:scale-105"
                                style={{ background: `${currentSong.colors.blob1}60` }}
                                title="Add to Playlist"
                              >
                                <ListPlus size={16} color="white" />
                              </button>
                              {idx !== currentSongIndex && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToQueue(idx);
                                  }}
                                  disabled={isInQueue}
                                  className="flex items-center gap-2 px-3 py-2 rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                  style={{ background: `${currentSong.colors.blob2}60` }}
                                >
                                  <Plus size={14} color="white" />
                                  <span 
                                    className="text-xs"
                                    style={{ color: 'white' }}
                                  >
                                    {isInQueue ? 'Queued' : 'Queue'}
                                  </span>
                                </button>
                              )}
                              {idx === currentSongIndex ? (
                                <div 
                                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                                  style={{ background: `${currentSong.colors.blob3}60` }}
                                >
                                  {isPlaying ? (
                                    <>
                                      <Pause size={16} color="white" fill="white" />
                                      <span 
                                        className="text-sm"
                                        style={{ color: 'white' }}
                                      >
                                        Playing
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Play size={16} color="white" fill="white" />
                                      <span 
                                        className="text-sm"
                                        style={{ color: 'white' }}
                                      >
                                        Paused
                                      </span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handlePlaySongFromList(idx)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:scale-105"
                                  style={{ background: `${currentSong.colors.blob3}60` }}
                                >
                                  <Play size={16} color="white" fill="white" />
                                  <span 
                                    className="text-sm"
                                    style={{ color: 'white' }}
                                  >
                                    Play
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Modal */}
      <AnimatePresence>
        {isQueueOpen && (
          <motion.div
            className="absolute inset-0 z-50 flex items-start justify-center pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={handleQueueClose}
            />
            
            {/* Queue Container */}
            <motion.div
              className="relative w-full max-w-2xl mx-8"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Glass Queue Box */}
              <div 
                className="rounded-2xl p-6 shadow-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h2 
                      className="text-2xl tracking-wider font-bold"
                      style={{ color: 'white', textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                    >
                      QUEUE
                    </h2>
                    {queue.length > 0 && (
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-semibold"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.25)',
                          color: 'white',
                          textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        {queue.length} {queue.length === 1 ? 'song' : 'songs'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {queue.length > 0 && (
                      <button
                        onClick={handleClearQueue}
                        className="px-4 py-2 rounded-xl transition-all hover:scale-105 font-medium"
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={handleQueueClose}
                      className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <X size={20} color="white" opacity={0.8} />
                    </button>
                  </div>
                </div>

                {/* Queue List */}
                <div className="max-h-96 overflow-y-auto">
                  {queue.length > 0 ? (
                    <div className="space-y-2">
                      {queue.map((songIndex, queueIdx) => {
                        const song = songs[songIndex];
                        return (
                          <motion.div
                            key={`queue-${queueIdx}-${song.id}`}
                            className="p-4 rounded-xl"
                            style={{
                              background: 'rgba(255, 255, 255, 0.2)',
                              backdropFilter: 'blur(20px)',
                              border: '1px solid rgba(255, 255, 255, 0.3)'
                            }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: queueIdx * 0.05 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                                  style={{ 
                                    background: 'rgba(255, 255, 255, 0.25)',
                                    color: 'white',
                                    textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                                  }}
                                >
                                  {queueIdx + 1}
                                </div>
                                <div className="flex-1">
                                  <h3 
                                    className="text-base tracking-wide mb-1 font-semibold"
                                    style={{ 
                                      color: 'white',
                                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                    }}
                                  >
                                    {song.title}
                                  </h3>
                                  <p 
                                    className="text-sm"
                                    style={{ 
                                      color: 'rgba(255, 255, 255, 0.8)',
                                      textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                                    }}
                                  >
                                    {song.artist}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handlePlayFromQueue(queueIdx)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:scale-105"
                                  style={{ background: `${currentSong.colors.blob3}60` }}
                                >
                                  <Play size={16} color="white" fill="white" />
                                  <span 
                                    className="text-sm"
                                    style={{ color: 'white' }}
                                  >
                                    Play Now
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleRemoveFromQueue(songIndex)}
                                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                                >
                                  <Trash2 size={16} color="white" opacity={0.8} />
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
                      <p className="text-lg font-semibold" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}>Queue is empty</p>
                      <p className="text-sm mt-2" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}>Add songs from search, playlists, or all songs</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Song Modal */}
      <AnimatePresence>
        {isAddSongOpen && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={handleAddSongClose}
            />
            
            {/* Add Song Container */}
            <motion.div
              className="relative w-full max-w-2xl max-h-[85vh]"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Glass Add Song Box */}
              <div 
                className="rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  maxHeight: '85vh'
                }}
              >
                {/* Header - Fixed */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                  <h2 
                    className="text-2xl tracking-wider font-bold"
                    style={{ color: 'white', textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                  >
                    ADD NEW SONG
                  </h2>
                  <button
                    onClick={handleAddSongClose}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X size={20} color="white" opacity={0.8} />
                  </button>
                </div>

                {/* Add Song Form - Scrollable */}
                <div className="overflow-y-auto p-6 flex-1">
                  {/* YouTube Music Button */}
                  <div className="mb-6">
                    <button
                      onClick={handleYouTubeMusicClick}
                      className="w-full py-4 px-6 rounded-xl font-semibold tracking-wide transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                      style={{
                        background: `linear-gradient(135deg, #FF0000 0%, #CC0000 100%)`,
                        color: 'white',
                        boxShadow: '0 4px 20px rgba(255, 0, 0, 0.3)'
                      }}
                    >
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm4.8 17.28l-4.8-3.12-4.8 3.12V6.72l4.8 3.12 4.8-3.12v10.56z"/>
                      </svg>
                      SEARCH YOUTUBE MUSIC
                    </button>
                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px" style={{ background: 'rgba(255, 255, 255, 0.2)' }} />
                      <span className="text-xs tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.7)', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}>
                        OR ADD MANUALLY
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'rgba(255, 255, 255, 0.2)' }} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <label 
                        className="text-sm tracking-wide mb-1 font-medium"
                        style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                      >
                        Title *
                      </label>
                      <input
                        ref={addSongInputRef}
                        type="text"
                        value={newSong.title}
                        onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                        placeholder="Enter song title..."
                        className="px-4 py-3 rounded-xl text-base outline-none transition-all placeholder-gray-300"
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          border: '2px solid rgba(255, 255, 255, 0.3)'
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label 
                        className="text-sm tracking-wide mb-1 font-medium"
                        style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                      >
                        Artist *
                      </label>
                      <input
                        type="text"
                        value={newSong.artist}
                        onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                        placeholder="Enter artist name..."
                        className="px-4 py-3 rounded-xl text-base outline-none transition-all placeholder-gray-300"
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          border: '2px solid rgba(255, 255, 255, 0.3)'
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label 
                        className="text-sm tracking-wide mb-1 font-medium"
                        style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                      >
                        Cover URL (optional)
                      </label>
                      <input
                        type="text"
                        value={newSong.coverUrl}
                        onChange={(e) => setNewSong({ ...newSong, coverUrl: e.target.value })}
                        placeholder="Enter cover image URL..."
                        className="px-4 py-3 rounded-xl text-base outline-none transition-all placeholder-gray-300"
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          border: '2px solid rgba(255, 255, 255, 0.3)'
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label 
                        className="text-sm tracking-wide mb-1 font-medium"
                        style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                      >
                        Audio URL *
                      </label>
                      <input
                        type="text"
                        value={newSong.audioUrl}
                        onChange={(e) => setNewSong({ ...newSong, audioUrl: e.target.value })}
                        placeholder="Enter audio file URL..."
                        className="px-4 py-3 rounded-xl text-base outline-none transition-all placeholder-gray-300"
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          border: '2px solid rgba(255, 255, 255, 0.3)'
                        }}
                      />
                    </div>
                    
                    {/* Color Pickers Section */}
                    <div className="pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                      <h3 
                        className="text-sm tracking-wide mb-3 font-medium"
                        style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                      >
                        Color Theme (optional)
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                          <label 
                            className="text-xs tracking-wide mb-1"
                            style={{ color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                          >
                            Background
                          </label>
                          <input
                            type="color"
                            value={newSong.backgroundColor}
                            onChange={(e) => setNewSong({ ...newSong, backgroundColor: e.target.value })}
                            className="h-10 w-full rounded-lg cursor-pointer"
                            style={{
                              border: '2px solid rgba(255, 255, 255, 0.3)'
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <label 
                            className="text-xs tracking-wide mb-1"
                            style={{ color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                          >
                            Blob 1
                          </label>
                          <input
                            type="color"
                            value={newSong.blob1Color}
                            onChange={(e) => setNewSong({ ...newSong, blob1Color: e.target.value })}
                            className="h-10 w-full rounded-lg cursor-pointer"
                            style={{
                              border: '2px solid rgba(255, 255, 255, 0.3)'
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <label 
                            className="text-xs tracking-wide mb-1"
                            style={{ color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                          >
                            Blob 2
                          </label>
                          <input
                            type="color"
                            value={newSong.blob2Color}
                            onChange={(e) => setNewSong({ ...newSong, blob2Color: e.target.value })}
                            className="h-10 w-full rounded-lg cursor-pointer"
                            style={{
                              border: '2px solid rgba(255, 255, 255, 0.3)'
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <label 
                            className="text-xs tracking-wide mb-1"
                            style={{ color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                          >
                            Blob 3
                          </label>
                          <input
                            type="color"
                            value={newSong.blob3Color}
                            onChange={(e) => setNewSong({ ...newSong, blob3Color: e.target.value })}
                            className="h-10 w-full rounded-lg cursor-pointer"
                            style={{
                              border: '2px solid rgba(255, 255, 255, 0.3)'
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <label 
                            className="text-xs tracking-wide mb-1"
                            style={{ color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                          >
                            Line
                          </label>
                          <input
                            type="color"
                            value={newSong.lineColor}
                            onChange={(e) => setNewSong({ ...newSong, lineColor: e.target.value })}
                            className="h-10 w-full rounded-lg cursor-pointer"
                            style={{
                              border: '2px solid rgba(255, 255, 255, 0.3)'
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <label 
                            className="text-xs tracking-wide mb-1"
                            style={{ color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                          >
                            Text
                          </label>
                          <input
                            type="color"
                            value={newSong.textColor}
                            onChange={(e) => setNewSong({ ...newSong, textColor: e.target.value })}
                            className="h-10 w-full rounded-lg cursor-pointer"
                            style={{
                              border: '2px solid rgba(255, 255, 255, 0.3)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer - Fixed */}
                <div className="p-6 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                  <button
                    onClick={handleCreateSong}
                    disabled={!newSong.title.trim() || !newSong.artist.trim() || !newSong.audioUrl.trim()}
                    className="w-full p-4 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                      background: `${currentSong.colors.blob3}80`,
                      color: 'white'
                    }}
                  >
                    Add Song
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YouTube Music Search Modal */}
      <AnimatePresence>
        {isYouTubeMusicSearchOpen && (
          <YouTubeMusicSearch
            onClose={handleYouTubeMusicClose}
            onAddSong={handleAddYouTubeSong}
            existingSongs={songs}
          />
        )}
      </AnimatePresence>

      {/* Playlist Selector Modal */}
      <AnimatePresence>
        {showPlaylistSelector && songToAddToPlaylist !== null && (
          <motion.div
            className="absolute inset-0 z-[60] flex items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={handleClosePlaylistSelector}
            />
            
            {/* Playlist Selector Container */}
            <motion.div
              className="relative w-full max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Glass Playlist Selector Box */}
              <div 
                className="rounded-2xl p-6 shadow-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 
                    className="text-xl tracking-wider font-bold"
                    style={{ color: 'white', textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                  >
                    Add to Playlist
                  </h2>
                  <button
                    onClick={handleClosePlaylistSelector}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X size={20} color="white" opacity={0.8} />
                  </button>
                </div>

                {/* Song Info */}
                <div 
                  className="mb-4 p-3 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.25)'
                  }}
                >
                  <h3 
                    className="text-sm tracking-wide mb-1 font-medium"
                    style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                  >
                    {songs[songToAddToPlaylist].title}
                  </h3>
                  <p 
                    className="text-xs"
                    style={{ color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                  >
                    {songs[songToAddToPlaylist].artist}
                  </p>
                </div>

                {/* Playlists List */}
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {playlists.length > 0 ? (
                    playlists.map((playlist) => {
                      const isAlreadyInPlaylist = playlist.songIds.includes(songs[songToAddToPlaylist].id);
                      return (
                        <button
                          key={playlist.id}
                          onClick={() => {
                            if (!isAlreadyInPlaylist) {
                              handleAddSpecificSongToPlaylist(songToAddToPlaylist, playlist.id);
                            }
                          }}
                          disabled={isAlreadyInPlaylist}
                          className="w-full p-4 rounded-xl text-left transition-all hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.25)'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 
                                className="text-base tracking-wide font-medium"
                                style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                              >
                                {playlist.name}
                              </h4>
                              <p 
                                className="text-xs mt-1"
                                style={{ color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                              >
                                {playlist.songIds.length} {playlist.songIds.length === 1 ? 'song' : 'songs'}
                              </p>
                            </div>
                            {isAlreadyInPlaylist && (
                              <span 
                                className="text-xs px-3 py-1 rounded-full font-medium"
                                style={{ 
                                  background: 'rgba(255, 255, 255, 0.25)',
                                  color: 'white',
                                  textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                                }}
                              >
                                Already added
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div 
                      className="text-center py-8"
                      style={{ color: 'white', textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' }}
                    >
                      <p className="text-base">No playlists yet</p>
                      <p className="text-sm mt-2">Create a playlist first</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Container */}
      <div className="relative z-20 flex flex-col md:flex-row items-center justify-center md:justify-between w-full max-w-md md:max-w-6xl px-6 md:px-20 gap-6 md:gap-0">
        
        {/* Left Controls Panel */}
        <div className="flex flex-col items-center gap-4 md:gap-8 w-full md:w-64 order-2 md:order-1">
          {/* Play Controls */}
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <SkipBack size={24} color={currentSong.colors.text} />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="p-2 hover:bg-white/10 rounded-full transition-transform hover:scale-110"
            >
              {isPlaying ? (
                <Pause size={64} strokeWidth={1.5} color={currentSong.colors.text} className="w-12 h-12 md:w-16 md:h-16" />
              ) : (
                <Play size={64} strokeWidth={1.5} color={currentSong.colors.text} fill={currentSong.colors.text} className="w-12 h-12 md:w-16 md:h-16" />
              )}
            </button>

            <button
              onClick={handleNext}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <SkipForward size={24} color={currentSong.colors.text} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-1">
            <div className="relative w-full h-1 bg-gray-400/30 rounded-full overflow-hidden">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-gray-600 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime || 0}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="text-right text-xs" style={{ color: currentSong.colors.text, opacity: 0.5 }}>
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center gap-6 md:gap-8">
            <button 
              onClick={() => setIsShuffleOn(!isShuffleOn)}
              className="p-2 rounded-full transition-all relative"
              style={{
                backgroundColor: isShuffleOn ? `${currentSong.colors.text}20` : 'transparent'
              }}
            >
              <Shuffle 
                size={18} 
                color={currentSong.colors.text} 
                opacity={isShuffleOn ? 1 : 0.4}
                strokeWidth={isShuffleOn ? 2.5 : 2}
              />
            </button>
            <button 
              onClick={() => {
                console.log('Repeat button clicked, current state:', isRepeatOn);
                setIsRepeatOn(!isRepeatOn);
                console.log('Repeat button new state:', !isRepeatOn);
              }}
              className="p-2 rounded-full transition-all relative"
              style={{
                backgroundColor: isRepeatOn ? `${currentSong.colors.text}20` : 'transparent'
              }}
            >
              <Repeat 
                size={18} 
                color={currentSong.colors.text} 
                opacity={isRepeatOn ? 1 : 0.4}
                strokeWidth={isRepeatOn ? 2.5 : 2}
              />
            </button>
            <button 
              onClick={() => handleOpenPlaylistSelector(currentSongIndex)}
              className="p-2 rounded-full transition-all relative hover:bg-white/10"
              title="Add to Playlist"
            >
              <ListPlus 
                size={18} 
                color={currentSong.colors.text} 
                opacity={0.4}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>

        {/* Center Album Cover */}
        <div className="flex flex-col items-center gap-4 md:gap-6 order-1 md:order-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={`cover-${currentSong.id}`}
              className="relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="w-[280px] h-[280px] md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-sm p-2 md:p-3">
                <div className="w-full h-full rounded-2xl overflow-hidden">
                  <img 
                    src={currentSong.cover} 
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Song Info */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`info-${currentSong.id}`}
              className="text-center max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 
                className="text-base md:text-xl tracking-wider mb-1"
                style={{ color: currentSong.colors.text, opacity: 0.7 }}
              >
                {currentSong.title}
              </h1>
              <p 
                className="text-xs tracking-wide"
                style={{ color: currentSong.colors.text, opacity: 0.5 }}
              >
                {currentSong.artist}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Panel - Up Next */}
        <div className="w-full md:w-64 flex flex-col items-center md:items-start gap-2 md:gap-3 order-3">
          <div 
            className="text-xs tracking-wider mb-0 md:mb-2"
            style={{ color: currentSong.colors.text, opacity: 0.5 }}
          >
            UP NEXT &gt;&gt;
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`next-${nextSong.id}`}
              className="text-center md:text-left"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <h3 
                className="text-sm md:text-lg tracking-wide"
                style={{ color: currentSong.colors.text, opacity: 0.6 }}
              >
                {nextSong.title}
              </h3>
              <p 
                className="text-xs tracking-wide mt-1"
                style={{ color: currentSong.colors.text, opacity: 0.4 }}
              >
                {nextSong.artist}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Center - Pagination Dots */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {songs.map((song, index) => (
          <button
            key={song.id}
            onClick={() => {
              setCurrentSongIndex(index);
              setIsPlaying(true);
            }}
            className="transition-all"
          >
            <div 
              className="rounded-full transition-all"
              style={{
                width: index === currentSongIndex ? '8px' : '6px',
                height: index === currentSongIndex ? '8px' : '6px',
                backgroundColor: currentSong.colors.text,
                opacity: index === currentSongIndex ? 0.8 : 0.3
              }}
            />
          </button>
        ))}
      </div>

      {/* Bottom Right - Queue & Add Button */}
      <div className="absolute bottom-8 right-12 z-20 flex items-center gap-4">
        <button
          onClick={handleQueueClick}
          className="text-xs tracking-wider hover:opacity-100 transition-opacity cursor-pointer relative flex items-center gap-2"
          style={{ color: currentSong.colors.text, opacity: 0.5 }}
        >
          QUEUE
          {queue.length > 0 && (
            <span 
              className="rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
              style={{ 
                backgroundColor: currentSong.colors.blob3,
                color: 'white'
              }}
            >
              {queue.length}
            </span>
          )}
        </button>
        <button 
          className="p-4 rounded-full transition-colors"
          style={{ backgroundColor: currentSong.colors.blob3, opacity: 0.6 }}
          onClick={handleAddSongClick}
        >
          <Plus size={20} color="white" />
        </button>
      </div>

      {/* YouTube Player (hidden) */}
      {currentSong?.youtubeId && (
        <YouTubePlayer
          ref={youtubePlayerRef}
          videoId={currentSong.youtubeId}
          onReady={() => console.log('YouTube player ready')}
          onStateChange={(state) => {
            // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            console.log('YouTube state changed:', state);
            if (state === 0) { // ended
              console.log('Song ended. isRepeatOn:', isRepeatOnRef.current);
              // Handle song end - same logic as audio element
              if (isRepeatOnRef.current) {
                console.log('Repeating song - seeking to 0 and playing');
                youtubePlayerRef.current?.seekTo(0);
                youtubePlayerRef.current?.play();
              } else if (queue.length > 0) {
                console.log('Playing from queue');
                handlePlayFromQueue(0);
              } else if (activePlaylistId) {
                console.log('Playing next from playlist');
                handleNext();
              } else {
                console.log('Playing next song');
                handleNext();
              }
            }
          }}
          onProgress={(current, duration) => {
            setCurrentTime(current || 0);
            setDuration(duration || 0);
          }}
          autoplay={isPlaying}
        />
      )}

      {/* Gesture Control */}
      <GestureControl
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onVoiceControl={() => setIsVoiceControlOpen(true)}
        isPlaying={isPlaying}
      />

      {/* Voice Control */}
      <VoiceControl
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onPlaySong={(songIndex) => {
          setCurrentSongIndex(songIndex);
          setIsPlaying(true);
        }}
        isPlaying={isPlaying}
        songs={songs}
        externalTrigger={isVoiceControlOpen}
        onExternalTriggerComplete={() => setIsVoiceControlOpen(false)}
      />
    </div>
  );
}
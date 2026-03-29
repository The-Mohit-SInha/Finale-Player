import { Song } from '../types';

export interface Playlist {
  id: number;
  name: string;
  songIds: number[];
  createdAt: Date;
}

export interface PlayerState {
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffleOn: boolean;
  isRepeatOn: boolean;
  queue: number[];
  activePlaylistId: number | null;
  preQueuePlaylistId: number | null;
  preQueueSongIndex: number | null;
}

const STORAGE_KEYS = {
  SONGS: 'musicPlayer_songs',
  PLAYLISTS: 'musicPlayer_playlists',
  PLAYER_STATE: 'musicPlayer_playerState',
};

// Save songs to localStorage
export const saveSongs = (songs: Song[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
  } catch (error) {
    console.error('Error saving songs to localStorage:', error);
  }
};

// Load songs from localStorage
export const loadSongs = (): Song[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SONGS);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('Error loading songs from localStorage:', error);
    return null;
  }
};

// Save playlists to localStorage
export const savePlaylists = (playlists: Playlist[]): void => {
  try {
    // Convert Date objects to ISO strings
    const serializedPlaylists = playlists.map(playlist => ({
      ...playlist,
      createdAt: playlist.createdAt.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(serializedPlaylists));
  } catch (error) {
    console.error('Error saving playlists to localStorage:', error);
  }
};

// Load playlists from localStorage
export const loadPlaylists = (): Playlist[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert ISO strings back to Date objects
      return parsed.map((playlist: any) => ({
        ...playlist,
        createdAt: new Date(playlist.createdAt),
      }));
    }
    return null;
  } catch (error) {
    console.error('Error loading playlists from localStorage:', error);
    return null;
  }
};

// Save player state to localStorage
export const savePlayerState = (state: PlayerState): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYER_STATE, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving player state to localStorage:', error);
  }
};

// Load player state from localStorage
export const loadPlayerState = (): PlayerState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('Error loading player state from localStorage:', error);
    return null;
  }
};

// Clear all localStorage data
export const clearAllData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SONGS);
    localStorage.removeItem(STORAGE_KEYS.PLAYLISTS);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_STATE);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

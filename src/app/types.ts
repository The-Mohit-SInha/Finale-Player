export interface Song {
  id: number;
  title: string;
  artist: string;
  cover: string;
  audioUrl: string;
  youtubeId?: string; // YouTube video ID if sourced from YouTube Music
  colors: {
    background: string;
    blob1: string;
    blob2: string;
    blob3: string;
    line: string;
    text: string;
  };
  lines: {
    path1: string;
    path2: string;
  };
  circles: Array<{
    x: number;
    y: number;
    size: number;
    color: string;
  }>;
}

export interface Playlist {
  id: number;
  name: string;
  songIds: number[];
  coverImage?: string;
  createdAt?: Date;
}

export interface YouTubeSong {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  description: string;
}

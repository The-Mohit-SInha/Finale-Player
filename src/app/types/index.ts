export interface Song {
  id: number;
  title: string;
  artist: string;
  cover: string;
  audioUrl: string;
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
  circles?: {
    x: number;
    y: number;
    size: number;
    color: string;
  }[];
}

export interface Playlist {
  id: number;
  name: string;
  songIds: number[];
  createdAt: Date;
}

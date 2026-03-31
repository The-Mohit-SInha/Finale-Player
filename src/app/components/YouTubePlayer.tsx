import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubePlayerRef {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setVolume: (volume: number) => void;
  loadVideoById: (videoId: string) => void;
}

interface YouTubePlayerProps {
  videoId: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onProgress?: (current: number, duration: number) => void;
  autoplay?: boolean;
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  ({ videoId, onReady, onStateChange, onProgress, autoplay = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const progressIntervalRef = useRef<number | null>(null);

    // Initialize YouTube IFrame API
    useEffect(() => {
      // Load YouTube IFrame API script if not already loaded
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Initialize player when API is ready
      const initPlayer = () => {
        if (!containerRef.current || playerRef.current) return;

        playerRef.current = new window.YT.Player(containerRef.current, {
          height: '0',
          width: '0',
          videoId: videoId,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
          },
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready for:', videoId);
              onReady?.();
              
              // Start progress tracking
              startProgressTracking();
            },
            onStateChange: (event: any) => {
              console.log('YouTube player state changed:', event.data);
              onStateChange?.(event.data);
              
              // Track progress when playing
              if (event.data === window.YT.PlayerState.PLAYING) {
                startProgressTracking();
              } else {
                stopProgressTracking();
              }
            },
          },
        });
      };

      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
      }

      return () => {
        stopProgressTracking();
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }, []);

    // Update video when videoId changes
    useEffect(() => {
      if (playerRef.current && playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById(videoId);
        console.log('Loading new video:', videoId);
      }
    }, [videoId]);

    // Progress tracking
    const startProgressTracking = () => {
      if (progressIntervalRef.current) return;
      
      progressIntervalRef.current = window.setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const current = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          // Ensure we never pass undefined or NaN values
          if (typeof current === 'number' && !isNaN(current) && typeof duration === 'number' && !isNaN(duration)) {
            onProgress?.(current, duration);
          }
        }
      }, 100);
    };

    const stopProgressTracking = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };

    // Expose player methods via ref
    useImperativeHandle(ref, () => ({
      play: () => {
        if (playerRef.current && playerRef.current.playVideo) {
          playerRef.current.playVideo();
        }
      },
      pause: () => {
        if (playerRef.current && playerRef.current.pauseVideo) {
          playerRef.current.pauseVideo();
        }
      },
      seekTo: (seconds: number) => {
        if (playerRef.current && playerRef.current.seekTo) {
          playerRef.current.seekTo(seconds, true);
        }
      },
      getCurrentTime: () => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          return playerRef.current.getCurrentTime();
        }
        return 0;
      },
      getDuration: () => {
        if (playerRef.current && playerRef.current.getDuration) {
          return playerRef.current.getDuration();
        }
        return 0;
      },
      getPlayerState: () => {
        if (playerRef.current && playerRef.current.getPlayerState) {
          return playerRef.current.getPlayerState();
        }
        return -1;
      },
      setVolume: (volume: number) => {
        if (playerRef.current && playerRef.current.setVolume) {
          playerRef.current.setVolume(volume);
        }
      },
      loadVideoById: (videoId: string) => {
        if (playerRef.current && playerRef.current.loadVideoById) {
          playerRef.current.loadVideoById(videoId);
        }
      },
    }));

    return (
      <div 
        ref={containerRef} 
        style={{ 
          position: 'absolute', 
          left: '-9999px',
          width: 0,
          height: 0,
          overflow: 'hidden'
        }} 
      />
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';

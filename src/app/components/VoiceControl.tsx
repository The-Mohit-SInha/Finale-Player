import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, X, Volume2, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, YouTubeSong } from '../types';

interface VoiceControlProps {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onPlaySong: (songIndex: number) => void;
  onAddYouTubeSong: (youtubeSong: YouTubeSong) => Promise<void>;
  isPlaying: boolean;
  songs: Song[];
  externalTrigger?: boolean;
  onExternalTriggerComplete?: () => void;
}

export function VoiceControl({ 
  onPlay, 
  onPause, 
  onNext, 
  onPrevious, 
  onPlaySong,
  onAddYouTubeSong,
  isPlaying, 
  songs,
  externalTrigger,
  onExternalTriggerComplete
}: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processVoiceCommandRef = useRef<(command: string) => void>(() => {});

  // Check if browser supports Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    }
  }, []);

  // Initialize speech recognition after permission is granted
  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('✅ Voice recognition started');
      setIsListening(true);
      setError('');
      showFeedback('🎤 Listening...');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.toLowerCase().trim();
      
      console.log('Voice detected:', transcript, 'isFinal:', event.results[current].isFinal);
      setTranscript(transcript);

      // Only process final results
      if (event.results[current].isFinal) {
        console.log('Processing final transcript:', transcript);
        processVoiceCommandRef.current(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        // Don't stop listening, just show feedback
        setFeedback('🎤 Listening...');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable microphone permissions in your browser settings.');
        setIsListening(false);
        setPermissionGranted(false);
      } else if (event.error === 'aborted') {
        console.log('Recognition aborted');
      } else if (event.error === 'audio-capture') {
        setError('No microphone detected. Please connect a microphone and try again.');
        setIsListening(false);
      } else if (event.error === 'network') {
        setError('Network error. Please check your internet connection.');
        setIsListening(false);
      } else {
        setError(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('Recognition ended. isListening:', isListening);
      
      // Restart if still in listening mode
      if (isListening && permissionGranted) {
        try {
          console.log('Restarting recognition...');
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (e) {
          console.error('Recognition restart failed:', e);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    console.log('Speech recognition initialized');
  }, [isListening, permissionGranted]);

  // Search YouTube Music and add song automatically
  const searchAndAddYouTubeSong = useCallback(async (query: string) => {
    try {
      console.log('🔍 Searching YouTube Music for:', query);
      
      const response = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'qcasdtsuqypsmloxfkbh'}.supabase.co/functions/v1/make-server-6ed35f1d/youtube/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYXNkdHN1cXlwc21sb3hma2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMjQ5MzQsImV4cCI6MjA1NzkwMDkzNH0.T8njr1BtZCpEJ34PBRHLOWWaLdWdHHK1RJTXWMajVBM'}`
          },
          body: JSON.stringify({ query })
        }
      );

      if (!response.ok) {
        console.error('YouTube search failed:', response.statusText);
        showFeedback(`❌ Search failed. Please try again.`);
        setIsSearching(false);
        return;
      }

      const data = await response.json();
      console.log('YouTube search results:', data);

      if (!data.items || data.items.length === 0) {
        console.log('No results found on YouTube');
        showFeedback(`❌ No results found for: "${query}"`);
        setIsSearching(false);
        return;
      }

      // Get the first result (most relevant)
      const firstResult = data.items[0];
      const youtubeSong: YouTubeSong = {
        videoId: firstResult.id.videoId,
        title: firstResult.snippet.title,
        channelTitle: firstResult.snippet.channelTitle,
        thumbnail: firstResult.snippet.thumbnails.high?.url || firstResult.snippet.thumbnails.default.url,
        description: firstResult.snippet.description
      };

      console.log('Selected song:', youtubeSong.title, 'by', youtubeSong.channelTitle);
      showFeedback(`✅ Found: ${youtubeSong.title}`);
      
      // Add the song to library
      await onAddYouTubeSong(youtubeSong);
      
      // After adding, find and play it
      setTimeout(() => {
        // Songs state will be updated, so we need to wait a moment
        const newSongIndex = songs.length; // It will be added at the end
        onPlaySong(newSongIndex);
        showFeedback(`🎵 Now playing: ${youtubeSong.title}`);
        setIsSearching(false);
      }, 500);

    } catch (error) {
      console.error('Error searching YouTube:', error);
      showFeedback(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSearching(false);
    }
  }, [onAddYouTubeSong, onPlaySong, songs.length]);

  const processVoiceCommand = useCallback((command: string) => {
    console.log('🎯 Processing command:', command);
    console.log('🎯 Current isPlaying state:', isPlaying);
    console.log('🎯 Available callbacks:', { 
      hasOnPlay: !!onPlay, 
      hasOnPause: !!onPause, 
      hasOnNext: !!onNext, 
      hasOnPrevious: !!onPrevious 
    });
    
    let matched = false;

    // Normalize command: remove filler words and clean up
    const normalizedCommand = command
      .toLowerCase()
      .replace(/\b(please|can you|could you|would you|will you|the|a|an)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('📝 Normalized command:', normalizedCommand);

    // Extract keywords - check if ANY of these words exist
    const words = normalizedCommand.split(' ');
    console.log('📝 Words in command:', words);
    
    const hasPlay = words.some(w => ['play', 'start', 'begin', 'resume'].includes(w));
    const hasPause = words.some(w => ['pause', 'stop', 'halt', 'freeze', 'wait'].includes(w));
    const hasNext = words.some(w => ['next', 'skip', 'forward', 'ahead'].includes(w));
    const hasPrevious = words.some(w => ['previous', 'back', 'last', 'before', 'earlier', 'rewind'].includes(w));
    const hasSong = words.some(w => ['song', 'track', 'music', 'tune'].includes(w));
    
    console.log('📝 Keyword detection:', { hasPlay, hasPause, hasNext, hasPrevious, hasSong });

    // PRIORITY 1: Play specific song by name
    // Check if user is trying to play a specific song
    if (hasPlay && (hasSong || words.length > 2)) {
      // Extract potential song name by removing command keywords
      let songQuery = normalizedCommand
        .replace(/\b(play|start|begin|resume|song|track|music|tune|called|named|titled|by)\b/g, '')
        .trim();

      // If we have a meaningful query after removing keywords
      if (songQuery.length > 1) {
        console.log('Searching for song:', songQuery);
        
        // Find best matching song using multiple strategies
        let matchedSong = null;
        let matchScore = 0;

        songs.forEach(song => {
          const titleLower = song.title.toLowerCase();
          const artistLower = song.artist.toLowerCase();
          let score = 0;

          // Strategy 1: Exact match (highest priority)
          if (titleLower === songQuery || artistLower === songQuery) {
            score = 100;
          }
          // Strategy 2: Title starts with query
          else if (titleLower.startsWith(songQuery)) {
            score = 90;
          }
          // Strategy 3: Artist starts with query
          else if (artistLower.startsWith(songQuery)) {
            score = 85;
          }
          // Strategy 4: Title contains all query words
          else {
            const queryWords = songQuery.split(' ').filter(w => w.length > 1);
            const titleWords = titleLower.split(' ');
            const artistWords = artistLower.split(' ');
            
            const titleMatches = queryWords.filter(qw => 
              titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
            ).length;
            
            const artistMatches = queryWords.filter(qw => 
              artistWords.some(aw => aw.includes(qw) || qw.includes(aw))
            ).length;

            if (titleMatches > 0) {
              score = (titleMatches / queryWords.length) * 80;
            } else if (artistMatches > 0) {
              score = (artistMatches / queryWords.length) * 75;
            }
            // Strategy 5: Fuzzy match - check if query is contained anywhere
            else if (titleLower.includes(songQuery)) {
              score = 60;
            } else if (artistLower.includes(songQuery)) {
              score = 55;
            }
            // Strategy 6: Individual word matching
            else {
              const wordMatches = queryWords.filter(qw => 
                titleLower.includes(qw) || artistLower.includes(qw)
              ).length;
              
              if (wordMatches > 0) {
                score = (wordMatches / queryWords.length) * 50;
              }
            }
          }

          // Keep track of best match
          if (score > matchScore) {
            matchScore = score;
            matchedSong = song;
          }
        });

        // Only accept matches with score > 40 (reasonable confidence)
        if (matchedSong && matchScore > 40) {
          const songIndex = songs.findIndex(s => s.id === matchedSong!.id);
          if (songIndex !== -1) {
            onPlaySong(songIndex);
            showFeedback(`🎵 Playing: ${matchedSong.title} by ${matchedSong.artist}`);
            console.log(`Matched song with score ${matchScore}:`, matchedSong.title);
            matched = true;
          }
        } else if (songQuery.length > 1) {
          // Song not found locally - search YouTube Music
          console.log(`No local match found. Searching YouTube Music for: ${songQuery}`);
          showFeedback(`🔍 Searching YouTube for: "${songQuery}"...`);
          setIsSearching(true);
          
          // Search YouTube Music API
          searchAndAddYouTubeSong(songQuery);
          matched = true;
        }
      }
    }

    // PRIORITY 2: Pause/Stop (check before play to avoid conflicts)
    if (!matched && hasPause) {
      console.log('✅ Executing PAUSE command');
      onPause();
      showFeedback('⏸️ Paused');
      matched = true;
      return; // Exit early
    }

    // PRIORITY 3: Next song
    if (!matched && hasNext) {
      console.log('✅ Executing NEXT command');
      onNext();
      showFeedback('⏭️ Next song');
      matched = true;
      return; // Exit early
    }

    // PRIORITY 4: Previous song
    if (!matched && hasPrevious) {
      console.log('✅ Executing PREVIOUS command');
      onPrevious();
      showFeedback('⏮️ Previous song');
      matched = true;
      return; // Exit early
    }

    // PRIORITY 5: Simple play/resume (only if no specific song mentioned)
    if (!matched && hasPlay && !hasSong) {
      console.log('✅ Executing PLAY command');
      onPlay();
      showFeedback('▶️ Playing');
      matched = true;
      return; // Exit early
    }

    // No command recognized
    if (!matched) {
      console.log('❌ NO MATCH - Command not recognized');
      showFeedback('❓ Try: \\\"play\\\", \\\"pause\\\", \\\"next\\\", or \\\"previous\\\"');
      console.log('Unrecognized command. Keywords detected:', { hasPlay, hasPause, hasNext, hasPrevious, hasSong });
    }
  }, [isPlaying, onPlay, onPause, onNext, onPrevious, onPlaySong, songs, searchAndAddYouTubeSong]);

  processVoiceCommandRef.current = processVoiceCommand;

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      if (message !== '🎤 Listening...') {
        setFeedback('');
        setTranscript('');
      }
    }, 3000);
  }, []);

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    if (!isSupported) {
      return;
    }

    setIsInitializing(true);
    setError('');

    try {
      console.log('🎤 Requesting microphone access...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted!');
      
      mediaStreamRef.current = stream;
      setPermissionGranted(true);
      setShowPermissionModal(false);
      
      // Initialize speech recognition
      initializeSpeechRecognition();
      
      // Open the main modal
      setShowModal(true);
      setIsInitializing(false);
      
      // Start listening immediately
      setTimeout(() => {
        startListening();
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Microphone permission error:', error);
      setIsInitializing(false);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please click the microphone icon in your address bar and allow access.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setError('Microphone is already in use by another application. Please close other apps and try again.');
      } else {
        setError(`Failed to access microphone: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const startListening = () => {
    if (!permissionGranted || !recognitionRef.current) {
      console.error('Cannot start listening: permission not granted or recognition not initialized');
      return;
    }

    try {
      console.log('Starting voice recognition...');
      recognitionRef.current.start();
    } catch (e: any) {
      console.error('Failed to start recognition:', e);
      if (e.message && !e.message.includes('already started')) {
        setError('Failed to start voice recognition. Please try again.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        console.log('Stopping voice recognition...');
        setIsListening(false);
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
    setTranscript('');
    setFeedback('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleOpenVoiceControl = () => {
    if (!isSupported) {
      setShowModal(true);
      return;
    }

    if (!permissionGranted) {
      setShowPermissionModal(true);
    } else {
      setShowModal(true);
    }
  };

  const closeModal = () => {
    stopListening();
    setShowModal(false);
  };

  const handleDenyPermission = () => {
    setShowPermissionModal(false);
    setError('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping recognition on unmount:', e);
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Handle external trigger (from hand gesture)
  useEffect(() => {
    if (externalTrigger) {
      console.log('✌️ External trigger detected - Opening voice control with auto-start');
      
      if (!isSupported) {
        setShowModal(true);
        onExternalTriggerComplete?.();
        return;
      }

      if (!permissionGranted) {
        // Show permission modal
        setShowPermissionModal(true);
      } else {
        // Already have permission, open modal and start listening
        setShowModal(true);
        setTimeout(() => {
          if (!isListening) {
            startListening();
          }
        }, 300);
      }
      
      // Signal that we've handled the trigger
      onExternalTriggerComplete?.();
    }
  }, [externalTrigger, permissionGranted, isSupported, isListening]);

  return (
    <>
      {/* Voice Control Button */}
      <motion.button
        onClick={handleOpenVoiceControl}
        className="fixed bottom-6 left-24 z-40 p-4 rounded-full shadow-2xl transition-all duration-300"
        style={{
          background: isListening 
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Voice Control"
      >
        {isListening ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Mic className="w-6 h-6 text-white" />
          </motion.div>
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
        {isListening && (
          <motion.div
            className="absolute -top-1 -right-1 size-3 bg-red-400 rounded-full shadow-lg"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Permission Modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={handleDenyPermission}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 bg-purple-500/20 rounded-full">
                  <Volume2 className="size-12 text-purple-400" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                Enable Voice Control
              </h2>
              
              <p className="text-gray-400 mb-4 text-center text-sm">
                Control your music player using voice commands powered by Web Speech API.
              </p>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-6">
                <p className="text-xs text-purple-300 text-center font-semibold">
                  🎤 Microphone access is required for voice commands
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <span className="size-2 bg-purple-400 rounded-full"></span>
                  Available Voice Commands:
                </h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">▶️</span>
                    <span>"Play" / "Resume"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">⏸️</span>
                    <span>"Pause" / "Stop"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">⏭️</span>
                    <span>"Next" / "Skip"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">⏮️</span>
                    <span>"Previous" / "Back"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">🎵</span>
                    <span>"Play song [name]"</span>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-300 font-medium mb-1">Microphone Access Error</p>
                      <p className="text-xs text-red-200">{error}</p>
                    </div>
                  </div>
                  <button
                    onClick={requestMicrophonePermission}
                    disabled={isInitializing}
                    className="mt-3 w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    {isInitializing ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4" />
                        Try Again
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              <div className="flex gap-3">
                <motion.button
                  onClick={handleDenyPermission}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <X className="size-5" />
                  Cancel
                </motion.button>
                <motion.button
                  onClick={requestMicrophonePermission}
                  disabled={isInitializing}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg shadow-purple-500/30"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isInitializing ? (
                    <>
                      <RefreshCw className="size-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Check className="size-5" />
                      Allow Microphone
                    </>
                  )}
                </motion.button>
              </div>

              <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-xs text-purple-300 flex items-start gap-2">
                  <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                  <span>If blocked, click the microphone icon in your address bar to allow access.</span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Control Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <Volume2 className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Voice Control</h2>
                <p className="text-sm text-gray-600">
                  {isListening ? 'Listening for commands...' : permissionGranted ? 'Ready to listen' : 'Permission required'}
                </p>
              </div>

              {/* Error Message */}
              {error && !permissionGranted && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800">{error}</p>
                    <button
                      onClick={requestMicrophonePermission}
                      className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium underline"
                    >
                      Request permission again
                    </button>
                  </div>
                </div>
              )}

              {/* Microphone Button */}
              {permissionGranted && (
                <div className="flex justify-center mb-6">
                  <motion.button
                    onClick={toggleListening}
                    className="relative p-8 rounded-full shadow-lg transition-all"
                    style={{
                      background: isListening 
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isListening ? (
                      <>
                        <motion.div
                          className="absolute inset-0 rounded-full bg-red-400"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                        <MicOff className="w-12 h-12 text-white relative z-10" />
                      </>
                    ) : (
                      <Mic className="w-12 h-12 text-white" />
                    )}
                  </motion.button>
                </div>
              )}

              {/* Transcript Display */}
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-gray-50 rounded-xl"
                >
                  <p className="text-sm text-gray-600 mb-1">You said:</p>
                  <p className="text-lg font-semibold text-gray-800">"{transcript}"</p>
                </motion.div>
              )}

              {/* Feedback Display */}
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-purple-50 rounded-xl text-center"
                >
                  <p className="text-lg font-semibold text-purple-800">{feedback}</p>
                </motion.div>
              )}

              {/* Available Commands */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Available Commands:</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">▶️</span>
                    <span>"Play", "Start", "Resume"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">⏸️</span>
                    <span>"Pause", "Stop", "Wait"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">⏭️</span>
                    <span>"Next", "Skip", "Forward"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">⏮️</span>
                    <span>"Previous", "Back", "Rewind"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">🎵</span>
                    <span>"Play [song name]" - Smart matching!</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-xs text-purple-700 font-medium mb-1">✨ Natural language supported:</p>
                  <p className="text-xs text-gray-600 italic">"Can you play the next song please?"</p>
                  <p className="text-xs text-gray-600 italic">"Start playing Faded"</p>
                </div>
              </div>

              {/* Status indicator */}
              {permissionGranted && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <motion.div 
                    className={`size-2 rounded-full ${isListening ? 'bg-red-500' : 'bg-green-500'}`}
                    animate={isListening ? { opacity: [1, 0.3, 1] } : {}}
                    transition={{ duration: 1.5, repeat: isListening ? Infinity : 0 }}
                  />
                  <span className="text-xs text-gray-600 font-medium">
                    {isListening ? 'Microphone Active' : 'Microphone Ready'}
                  </span>
                </div>
              )}

              {/* Tip */}
              <p className="text-xs text-gray-500 text-center mt-4">
                💡 Speak clearly and wait for the command to process
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
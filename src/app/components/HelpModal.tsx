import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Hand, Mic, Music, ListMusic, Shuffle, Repeat, Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Help & Guide</h2>
                  <p className="text-purple-100 text-sm">Learn how to use all features</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
              <div className="space-y-6">
                
                {/* Hand Gestures Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Hand className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Hand Gesture Controls</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-sm">
                    Control playback using hand gestures detected by your camera. Click the hand icon in the bottom right to enable.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                      <span className="text-2xl flex-shrink-0">👍</span>
                      <div>
                        <p className="font-semibold text-gray-800">Thumbs Up</p>
                        <p className="text-sm text-gray-600">Play / Resume music</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-pink-50 rounded-lg">
                      <span className="text-2xl flex-shrink-0">👎</span>
                      <div>
                        <p className="font-semibold text-gray-800">Thumbs Down</p>
                        <p className="text-sm text-gray-600">Pause music</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <span className="text-2xl flex-shrink-0">👉</span>
                      <div>
                        <p className="font-semibold text-gray-800">Point Right</p>
                        <p className="text-sm text-gray-600">Skip to next song</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <span className="text-2xl flex-shrink-0">👈</span>
                      <div>
                        <p className="font-semibold text-gray-800">Point Left</p>
                        <p className="text-sm text-gray-600">Go to previous song</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                      <span className="text-2xl flex-shrink-0">✌️</span>
                      <div>
                        <p className="font-semibold text-gray-800">Peace Sign</p>
                        <p className="text-sm text-gray-600">Open voice control</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Voice Control Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-pink-100"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Mic className="w-6 h-6 text-pink-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Voice Control</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-sm">
                    Control your music using voice commands. Click the microphone icon in the bottom left to enable.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                      <span className="text-2xl flex-shrink-0">🎵</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">Play &lt;song name&gt;</p>
                        <p className="text-sm text-gray-600 italic mt-1">Examples: "Play Blinding Lights" or "Play Shape of You"</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                        <Play className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700">Say "Play" or "Resume"</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                        <Pause className="w-4 h-4 text-red-600" />
                        <span className="text-gray-700">Say "Pause" or "Stop"</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                        <SkipForward className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-700">Say "Next" or "Skip"</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                        <SkipBack className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-700">Say "Previous" or "Back"</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Player Controls Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Music className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Player Controls</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Shuffle className="w-4 h-4 text-blue-600" />
                          <p className="font-semibold text-gray-800">Shuffle</p>
                        </div>
                        <p className="text-sm text-gray-600">Randomize song order</p>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Repeat className="w-4 h-4 text-green-600" />
                          <p className="font-semibold text-gray-800">Repeat</p>
                        </div>
                        <p className="text-sm text-gray-600">Loop current song</p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="font-semibold text-gray-800 mb-1">Progress Bar</p>
                      <p className="text-sm text-gray-600">Click anywhere on the bar to jump to that position</p>
                    </div>
                    
                    <div className="p-3 bg-pink-50 rounded-lg">
                      <p className="font-semibold text-gray-800 mb-1">Previous Button</p>
                      <p className="text-sm text-gray-600">Press within 3 seconds: go to previous song<br/>Press after 3 seconds: restart current song</p>
                    </div>
                  </div>
                </motion.div>

                {/* Playlists & Songs Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-green-100"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ListMusic className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Playlists & Library</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="font-semibold text-gray-800 mb-1">🔍 Search Songs</p>
                      <p className="text-sm text-gray-600">Click the search icon to find and add songs from YouTube Music</p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-semibold text-gray-800 mb-1">📚 All Songs</p>
                      <p className="text-sm text-gray-600">View and manage your complete music library</p>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="font-semibold text-gray-800 mb-1">📋 Create Playlists</p>
                      <p className="text-sm text-gray-600">Organize your favorite songs into custom playlists</p>
                    </div>
                    
                    <div className="p-3 bg-pink-50 rounded-lg">
                      <p className="font-semibold text-gray-800 mb-1">🗑️ Delete Songs</p>
                      <p className="text-sm text-gray-600">Click the red trash icon next to any song to remove it</p>
                    </div>
                    
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <p className="font-semibold text-gray-800 mb-1">⏭️ Up Next Queue</p>
                      <p className="text-sm text-gray-600">See and manage upcoming songs in the right panel</p>
                    </div>
                  </div>
                </motion.div>

                {/* Tips Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200"
                >
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    Pro Tips
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• <span className="font-semibold">Mobile Support:</span> The layout automatically adapts to vertical on mobile devices</p>
                    <p>• <span className="font-semibold">Smart Matching:</span> Voice control uses AI to find the best song match</p>
                    <p>• <span className="font-semibold">Duplicate Prevention:</span> The app prevents adding the same song twice</p>
                    <p>• <span className="font-semibold">Hand Gestures:</span> Works best with good lighting and clear hand visibility</p>
                    <p>• <span className="font-semibold">Persistent State:</span> Your playlists and settings are saved automatically</p>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Enjoy your music! 🎵
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium text-sm shadow-lg"
                >
                  Got it!
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { Hand, X, Check, AlertCircle, Video, VideoOff, RefreshCw, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

interface GestureControlProps {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVoiceControl?: () => void;
  isPlaying: boolean;
}

type GestureType = 'thumbs_up' | 'open_palm' | 'pointing_up' | 'closed_fist' | 'victory_sign' | null;

export function GestureControl({ onPlay, onPause, onNext, onPrevious, onVoiceControl, isPlaying }: GestureControlProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<string>('');
  const [gestureStatus, setGestureStatus] = useState<'idle' | 'detecting' | 'error' | 'loading'>('idle');
  const [showGestureIndicator, setShowGestureIndicator] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showVideoFeed, setShowVideoFeed] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [debugInfo, setDebugInfo] = useState<string>('Waiting for camera...');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastGestureTimeRef = useRef<number>(0);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastResultRef = useRef<HandLandmarkerResult | null>(null);

  // Check camera permission status
  const checkCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    } catch (error) {
      return 'prompt';
    }
  };

  // Get browser-specific instructions
  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) {
      return 'Click the camera icon in the address bar and select "Allow"';
    } else if (userAgent.includes('Firefox')) {
      return 'Click the camera icon in the address bar and select "Allow"';
    } else if (userAgent.includes('Safari')) {
      return 'Go to Safari > Settings > Websites > Camera and allow access';
    } else if (userAgent.includes('Edge')) {
      return 'Click the camera icon in the address bar and select "Allow"';
    }
    
    return 'Please enable camera access in your browser settings';
  };

  // Initialize MediaPipe Hand Landmarker
  const initializeHandLandmarker = useCallback(async () => {
    try {
      setGestureStatus('loading');
      console.log('Initializing MediaPipe Hand Landmarker...');
      
      // Load MediaPipe vision tasks
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      
      // Create Hand Landmarker
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3
      });
      
      handLandmarkerRef.current = handLandmarker;
      setGestureStatus('detecting');
      console.log('✅ MediaPipe Hand Landmarker initialized successfully!');
      
    } catch (error) {
      console.error('❌ Error initializing MediaPipe Hand Landmarker:', error);
      setGestureStatus('error');
      setErrorMessage('Failed to load gesture detection model. Please refresh and try again.');
    }
  }, []);

  // Request camera permission
  const requestCameraPermission = async () => {
    setIsRetrying(true);
    setErrorMessage('');
    setGestureStatus('loading');
    setDebugInfo('Starting camera access...');
    
    try {
      console.log('🎥 Step 1: Requesting camera access...');
      setDebugInfo('Requesting camera permission...');
      
      // Stop any existing stream
      if (streamRef.current) {
        console.log('Stopping existing stream...');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Try to get camera access with very simple constraints
      console.log('Step 2: Getting user media...');
      setDebugInfo('Accessing camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      console.log('✅ Step 3: Camera access granted!', stream);
      console.log('Stream tracks:', stream.getTracks());
      setDebugInfo('Camera access granted!');
      streamRef.current = stream;
      
      if (!videoRef.current) {
        console.error('Video element not found!');
        setErrorMessage('Video element not initialized. Please try again.');
        setIsRetrying(false);
        setGestureStatus('error');
        return;
      }
      
      console.log('Step 4: Setting video source...');
      setDebugInfo('Setting up video...');
      const video = videoRef.current;
      video.srcObject = stream;
      
      // Set video attributes
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      
      // Use a timeout to prevent infinite loading
      const videoTimeout = setTimeout(() => {
        console.error('❌ Video loading timeout!');
        setErrorMessage('Video failed to load. Please refresh the page and try again.');
        setIsRetrying(false);
        setGestureStatus('error');
      }, 10000); // 10 second timeout
      
      // Wait for video to be ready
      const onVideoReady = async () => {
        clearTimeout(videoTimeout);
        console.log('✅ Step 5: Video metadata loaded');
        console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        setDebugInfo('Video ready, starting playback...');
        
        try {
          // Ensure video is playing
          await video.play();
          console.log('✅ Step 6: Video playing!');
          console.log('Video paused?', video.paused);
          console.log('Video readyState:', video.readyState);
          setDebugInfo('Video playing! Loading AI model...');
          
          setPermissionGranted(true);
          setShowPermissionModal(false);
          setIsEnabled(true);
          setErrorMessage('');
          setIsRetrying(false);
          
          // Initialize MediaPipe Hand Landmarker after video starts
          console.log('Step 7: Initializing MediaPipe...');
          setDebugInfo('Loading MediaPipe model...');
          await initializeHandLandmarker();
          setDebugInfo('Ready! Show your hand.');
          
        } catch (playError) {
          clearTimeout(videoTimeout);
          console.error('❌ Error playing video:', playError);
          setErrorMessage('Failed to start video playback. Please try again.');
          setIsRetrying(false);
          setGestureStatus('error');
          setDebugInfo('Video playback failed');
        }
      };
      
      // Try multiple events to ensure video starts
      video.onloadedmetadata = onVideoReady;
      video.onloadeddata = () => {
        console.log('Video data loaded');
      };
      video.oncanplay = () => {
        console.log('Video can play');
      };
      
      // Fallback: force video ready check after a short delay
      setTimeout(() => {
        if (video.readyState >= 2 && !permissionGranted) {
          console.log('Forcing video ready check...');
          onVideoReady();
        }
      }, 1000);
      
      video.onerror = (error) => {
        clearTimeout(videoTimeout);
        console.error('❌ Video element error:', error);
        setErrorMessage('Video playback error. Please refresh and try again.');
        setIsRetrying(false);
        setGestureStatus('error');
        setDebugInfo('Video error occurred');
      };
      
    } catch (error: any) {
      console.error('❌ Camera permission error:', error);
      setIsRetrying(false);
      setGestureStatus('error');
      setDebugInfo('Camera access failed');
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        setErrorMessage(`Camera access was blocked. ${getBrowserInstructions()}`);
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('Camera is already in use by another application. Please close other apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        setErrorMessage('Camera constraints error. Please try again.');
      } else if (error.name === 'SecurityError') {
        setErrorMessage('Camera access blocked due to security settings. Please enable camera access in your browser.');
      } else {
        setErrorMessage(`Unable to access camera: ${error.message || 'Unknown error'}. Please check your browser settings and try again.`);
      }
    }
  };

  // Analyze hand landmarks to detect gestures using MediaPipe
  const analyzeHandLandmarks = useCallback((result: HandLandmarkerResult): GestureType => {
    if (!result.landmarks || result.landmarks.length === 0) {
      return null;
    }
    
    // Get first hand landmarks (21 landmarks total)
    const landmarks = result.landmarks[0];
    
    // Landmark indices for MediaPipe Hand:
    // 0: Wrist
    // 4: Thumb tip, 3: Thumb IP, 2: Thumb MCP
    // 8: Index tip, 7: Index DIP, 6: Index PIP, 5: Index MCP
    // 12: Middle tip, 11: Middle DIP, 10: Middle PIP, 9: Middle MCP
    // 16: Ring tip, 15: Ring DIP, 14: Ring PIP, 13: Ring MCP
    // 20: Pinky tip, 19: Pinky DIP, 18: Pinky PIP, 17: Pinky MCP
    
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    const indexTip = landmarks[8];
    const indexDIP = landmarks[7];
    const indexPIP = landmarks[6];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleDIP = landmarks[11];
    const middlePIP = landmarks[10];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringDIP = landmarks[15];
    const ringPIP = landmarks[14];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyDIP = landmarks[19];
    const pinkyPIP = landmarks[18];
    const pinkyMCP = landmarks[17];
    
    // Calculate distances from wrist for better finger extension detection
    const getDistanceFromWrist = (point: any) => {
      return Math.sqrt(
        Math.pow(point.x - wrist.x, 2) + 
        Math.pow(point.y - wrist.y, 2) +
        Math.pow(point.z - wrist.z, 2)
      );
    };
    
    // Better finger extension detection using multiple criteria
    const isFingerExtended = (tip: any, dip: any, pip: any, mcp: any) => {
      // Criterion 1: Tip should be farther from wrist than PIP
      const tipDist = getDistanceFromWrist(tip);
      const pipDist = getDistanceFromWrist(pip);
      const farFromWrist = tipDist > pipDist * 1.1;
      
      // Criterion 2: Tip should be higher (lower Y value) than MCP
      const higherThanMCP = tip.y < mcp.y - 0.05;
      
      // Criterion 3: Check the angle - tip should be in line or above DIP/PIP
      const angleCheck = tip.y < pip.y;
      
      return farFromWrist && higherThanMCP && angleCheck;
    };
    
    // Finger extension checks with strict criteria
    const indexExtended = isFingerExtended(indexTip, indexDIP, indexPIP, indexMCP);
    const middleExtended = isFingerExtended(middleTip, middleDIP, middlePIP, middleMCP);
    const ringExtended = isFingerExtended(ringTip, ringDIP, ringPIP, ringMCP);
    const pinkyExtended = isFingerExtended(pinkyTip, pinkyDIP, pinkyPIP, pinkyMCP);
    
    // Thumb detection - more sophisticated
    // Thumb up: tip is above wrist and above MCP (vertical orientation)
    const thumbVerticallyUp = thumbTip.y < wrist.y - 0.08 && thumbTip.y < thumbMCP.y - 0.08;
    
    // Thumb out: tip is far from index finger base (horizontal orientation)
    const thumbHorizontallyOut = Math.abs(thumbTip.x - indexMCP.x) > 0.1;
    
    // Thumb curled: tip is close to wrist
    const thumbCurled = getDistanceFromWrist(thumbTip) < getDistanceFromWrist(thumbMCP) * 1.2;
    
    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
    
    // Calculate confidence based on hand detection score
    const confidence = result.handednesses?.[0]?.[0]?.score || 0;
    setDetectionConfidence(Math.round(confidence * 100));
    
    // Debug logging
    const fingerStatus = {
      thumb: thumbVerticallyUp ? 'UP↑' : (thumbHorizontallyOut ? 'OUT→' : (thumbCurled ? 'CURLED' : 'NEUTRAL')),
      index: indexExtended ? 'EXTENDED' : 'CURLED',
      middle: middleExtended ? 'EXTENDED' : 'CURLED',
      ring: ringExtended ? 'EXTENDED' : 'CURLED',
      pinky: pinkyExtended ? 'EXTENDED' : 'CURLED'
    };
    
    // GESTURE DETECTION WITH STRICT RULES
    
    // 1. CLOSED FIST: All fingers curled including thumb
    if (extendedCount === 0 && thumbCurled) {
      console.log('✊ DETECTED: CLOSED FIST - Previous Song', fingerStatus);
      return 'closed_fist';
    }
    
    // 2. THUMBS UP: ONLY thumb vertical, ALL other fingers curled
    if (thumbVerticallyUp && extendedCount === 0 && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      console.log('👍 DETECTED: THUMBS UP - Play', fingerStatus);
      return 'thumbs_up';
    }
    
    // 3. POINTING UP: ONLY index finger extended, all others curled (including thumb not vertically up)
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbVerticallyUp) {
      console.log('☝️ DETECTED: POINTING UP - Next Song', fingerStatus);
      return 'pointing_up';
    }
    
    // 4. OPEN PALM: At least 4 fingers extended (all except thumb or all 5)
    const allFingersExtended = indexExtended && middleExtended && ringExtended && pinkyExtended;
    if (allFingersExtended && (thumbHorizontallyOut || thumbVerticallyUp)) {
      console.log('✋ DETECTED: OPEN PALM - Pause', fingerStatus);
      return 'open_palm';
    }
    
    // 5. VICTORY SIGN: Index and middle fingers extended, all others curled
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && !thumbVerticallyUp) {
      console.log('✌️ DETECTED: VICTORY SIGN - Voice Control', fingerStatus);
      return 'victory_sign';
    }
    
    // Log when no clear gesture is detected
    if (extendedCount > 0 || thumbVerticallyUp) {
      console.log('❓ No clear gesture detected:', fingerStatus, `Extended count: ${extendedCount}`);
    }
    
    return null;
  }, []);

  // Draw hand landmarks on canvas using OpenCV-style rendering
  const drawHandLandmarks = useCallback((ctx: CanvasRenderingContext2D, landmarks: any[], canvasWidth: number, canvasHeight: number) => {
    // Draw connections between landmarks (OpenCV style)
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm
      [5, 9], [9, 13], [13, 17]
    ];
    
    // Draw connections
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      ctx.beginPath();
      ctx.moveTo(startPoint.x * canvasWidth, startPoint.y * canvasHeight);
      ctx.lineTo(endPoint.x * canvasWidth, endPoint.y * canvasHeight);
      ctx.stroke();
    });
    
    // Draw landmark points
    landmarks.forEach((landmark, idx) => {
      const x = landmark.x * canvasWidth;
      const y = landmark.y * canvasHeight;
      
      // Draw outer circle (OpenCV style)
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#00FF00';
      ctx.fill();
      
      // Draw inner circle
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#000000';
      ctx.fill();
      
      // Draw landmark index for debugging
      if ([0, 4, 8, 12, 16, 20].includes(idx)) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.fillText(idx.toString(), x + 8, y - 8);
      }
    });
  }, []);

  // Process video frame for gesture detection
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isEnabled || !permissionGranted || !handLandmarkerRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.readyState < 2 || !ctx) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      // Clear canvas and draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Detect hands using MediaPipe
      const startTimeMs = performance.now();
      const result = await handLandmarkerRef.current.detectForVideo(video, startTimeMs);
      lastResultRef.current = result;
      
      // Draw hand landmarks if detected
      if (result.landmarks && result.landmarks.length > 0) {
        drawHandLandmarks(ctx, result.landmarks[0], canvas.width, canvas.height);
        
        // Analyze gesture
        const detectedGesture = analyzeHandLandmarks(result);
        
        // Process detected gesture
        if (detectedGesture) {
          const currentTime = Date.now();
          const timeSinceLastGesture = currentTime - lastGestureTimeRef.current;

          if (timeSinceLastGesture > 1000) { // 1 second cooldown
            let actionTaken = false;
            let gestureName = '';

            switch (detectedGesture) {
              case 'thumbs_up':
                if (!isPlaying) {
                  onPlay();
                  gestureName = '👍 Play';
                  actionTaken = true;
                }
                break;
              case 'open_palm':
                if (isPlaying) {
                  onPause();
                  gestureName = '✋ Pause';
                  actionTaken = true;
                }
                break;
              case 'pointing_up':
                onNext();
                gestureName = '☝️ Next Song';
                actionTaken = true;
                break;
              case 'closed_fist':
                onPrevious();
                gestureName = '✊ Previous Song';
                actionTaken = true;
                break;
              case 'victory_sign':
                if (onVoiceControl) {
                  onVoiceControl();
                  gestureName = '✌️ Voice Control';
                  actionTaken = true;
                }
                break;
            }

            if (actionTaken) {
              setCurrentGesture(gestureName);
              setShowGestureIndicator(true);
              lastGestureTimeRef.current = currentTime;

              setTimeout(() => {
                setShowGestureIndicator(false);
              }, 2000);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isEnabled, permissionGranted, onPlay, onPause, onNext, onPrevious, onVoiceControl, isPlaying, analyzeHandLandmarks, drawHandLandmarks]);

  // Start/stop gesture detection
  useEffect(() => {
    if (isEnabled && permissionGranted) {
      processFrame();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isEnabled, permissionGranted, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  const handleEnableGestures = () => {
    if (!permissionGranted) {
      setShowPermissionModal(true);
      setErrorMessage('');
    } else {
      setIsEnabled(!isEnabled);
    }
  };

  const handleDenyPermission = () => {
    setShowPermissionModal(false);
    setErrorMessage('');
  };

  const handleRetry = () => {
    requestCameraPermission();
  };

  return (
    <>
      {/* Hidden Video Elements - Always Rendered */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className="hidden"
        width={640}
        height={480}
      />

      {/* Video Feed Preview - Above Button */}
      {permissionGranted && isEnabled && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-28 left-6 z-50"
        >
          <div className="relative">
            <div className="relative overflow-hidden rounded-xl shadow-2xl border-2 border-green-500/50">
              {/* Video Display (mirrors the hidden video) */}
              <div className="w-48 h-36 bg-gray-900 relative overflow-hidden">
                {showVideoFeed && (
                  <>
                    <video
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                      autoPlay
                      style={{ transform: 'scaleX(-1)' }}
                      ref={(el) => {
                        if (el && videoRef.current && videoRef.current.srcObject) {
                          el.srcObject = videoRef.current.srcObject;
                        }
                      }}
                    />
                    <canvas
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      width={640}
                      height={480}
                      style={{ transform: 'scaleX(-1)' }}
                      ref={(el) => {
                        if (el && canvasRef.current) {
                          const ctx = el.getContext('2d');
                          const srcCtx = canvasRef.current.getContext('2d');
                          if (ctx && srcCtx) {
                            // Copy canvas content
                            const copy = () => {
                              ctx.drawImage(canvasRef.current!, 0, 0);
                              if (permissionGranted && isEnabled && showVideoFeed) {
                                requestAnimationFrame(copy);
                              }
                            };
                            copy();
                          }
                        }
                      }}
                    />
                  </>
                )}
                {!showVideoFeed && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <VideoOff className="size-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-medium">Video Hidden</p>
                      <p className="text-xs text-gray-600 mt-1">Still Tracking</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status Indicator */}
              <div className={`absolute top-2 left-2 flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm ${
                gestureStatus === 'detecting' ? 'bg-green-500/90' :
                gestureStatus === 'loading' ? 'bg-blue-500/90' :
                gestureStatus === 'error' ? 'bg-red-500/90' :
                'bg-gray-500/90'
              }`}>
                <motion.div 
                  className="size-2 bg-white rounded-full"
                  animate={{ opacity: gestureStatus === 'detecting' ? [1, 0.3, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: gestureStatus === 'detecting' ? Infinity : 0 }}
                />
                <span className="text-xs text-white font-bold">
                  {gestureStatus === 'detecting' ? 'DETECTING' :
                   gestureStatus === 'loading' ? 'LOADING' :
                   gestureStatus === 'error' ? 'ERROR' :
                   'IDLE'}
                </span>
              </div>

              {/* Confidence Indicator */}
              {detectionConfidence > 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg">
                  <span className="text-xs text-green-400 font-bold">
                    {detectionConfidence}%
                  </span>
                </div>
              )}
              
              {/* Debug Info Display */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg max-w-[160px]">
                <span className="text-xs text-blue-400 font-bold truncate block">
                  {debugInfo}
                </span>
              </div>

              {/* Toggle Video Feed Button */}
              <motion.button
                onClick={() => setShowVideoFeed(!showVideoFeed)}
                className="absolute top-2 right-2 p-1.5 bg-gray-900/80 hover:bg-gray-800 rounded-full backdrop-blur-sm transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {showVideoFeed ? (
                  <Video className="size-4 text-white" />
                ) : (
                  <VideoOff className="size-4 text-white" />
                )}
              </motion.button>
            </div>
            
            {/* Gesture Guide */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-2 text-xs text-gray-300 text-center bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-lg p-2 backdrop-blur-sm border border-green-500/30"
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-green-400 font-bold">MediaPipe + OpenCV</span>
              </div>
              <div className="mt-1 text-gray-400">Show hand to control playback</div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Gesture Control Button */}
      <motion.button
        onClick={handleEnableGestures}
        className={`fixed bottom-6 left-6 z-50 p-4 rounded-full shadow-xl transition-all duration-300 ${ 
          isEnabled 
            ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 scale-110' 
            : 'bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700'
        }`}
        title={isEnabled ? 'Disable Gesture Control' : 'Enable Gesture Control'}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Hand className={`size-6 ${isEnabled ? 'text-white' : 'text-gray-300'}`} />
        {isEnabled && (
          <motion.div
            className="absolute -top-1 -right-1 size-3 bg-green-400 rounded-full shadow-lg"
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
                <div className="p-4 bg-blue-500/20 rounded-full">
                  <Hand className="size-12 text-blue-400" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                Enable Hand Gesture Control
              </h2>
              
              <p className="text-gray-400 mb-4 text-center text-sm">
                Control your music with AI-powered hand gestures using MediaPipe and OpenCV.
              </p>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-6">
                <p className="text-xs text-green-300 text-center font-semibold">
                  ⚡ Powered by MediaPipe Hand Landmarker + OpenCV
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <span className="size-2 bg-green-400 rounded-full"></span>
                  Available Gestures:
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-400">
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-900/50 rounded-lg">
                    <span className="text-2xl">👍</span>
                    <span className="text-xs text-center">Thumbs Up<br/>→ Play</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-900/50 rounded-lg">
                    <span className="text-2xl">✋</span>
                    <span className="text-xs text-center">Open Palm<br/>→ Pause</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-900/50 rounded-lg">
                    <span className="text-2xl">☝️</span>
                    <span className="text-xs text-center">Point Up<br/>→ Next</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-900/50 rounded-lg">
                    <span className="text-2xl">✊</span>
                    <span className="text-xs text-center">Fist<br/>→ Previous</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-900/50 rounded-lg">
                    <span className="text-2xl">✌️</span>
                    <span className="text-xs text-center">Victory Sign<br/>→ Voice Control</span>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-300 font-medium mb-1">Camera Access Error</p>
                      <p className="text-xs text-red-200">{errorMessage}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="mt-3 w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    {isRetrying ? (
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
                  onClick={requestCameraPermission}
                  disabled={isRetrying}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg shadow-green-500/30"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {gestureStatus === 'loading' ? (
                    <>
                      <RefreshCw className="size-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Check className="size-5" />
                      Allow Camera
                    </>
                  )}
                </motion.button>
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-300 flex items-start gap-2">
                  <Settings className="size-4 flex-shrink-0 mt-0.5" />
                  <span>If blocked, click the camera icon in your address bar to allow access.</span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gesture Indicator */}
      <AnimatePresence>
        {showGestureIndicator && (
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            className="fixed bottom-6 left-24 z-50 bg-gradient-to-br from-green-600/95 to-green-700/95 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border-2 border-green-400"
          >
            <p className="text-white font-bold text-lg">{currentGesture}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
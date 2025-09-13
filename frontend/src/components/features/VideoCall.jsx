import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common';
import { useNotification } from '../../contexts/NotificationContext';

const VideoCall = ({ 
  isCallActive, 
  onEndCall, 
  callType = 'video', // 'video' or 'audio'
  contactName,
  contactAvatar,
  isIncoming = false,
  onAcceptCall,
  onDeclineCall,
  callDuration = 0
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState(isIncoming ? 'incoming' : 'connecting'); // 'incoming', 'connecting', 'connected', 'ended'
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { showNotification } = useNotification();

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isCallActive && callState === 'connecting') {
      initializeCall();
    }
    
    return () => {
      cleanupCall();
    };
  }, [isCallActive, callState]);

  const initializeCall = async () => {
    try {
      // Get user media
      const constraints = {
        video: isVideoEnabled,
        audio: true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // In a real app, you would initialize LiveKit here
      // For now, we'll simulate the connection
      setTimeout(() => {
        setCallState('connected');
        showNotification(`${callType === 'video' ? 'Video' : 'Audio'} call connected`, 'success');
      }, 2000);
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      showNotification('Failed to access camera/microphone', 'error');
      handleEndCall();
    }
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAcceptCall = () => {
    setCallState('connecting');
    onAcceptCall?.();
  };

  const handleDeclineCall = () => {
    setCallState('ended');
    onDeclineCall?.();
  };

  const handleEndCall = () => {
    cleanupCall();
    setCallState('ended');
    onEndCall?.();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Replace video track with screen share
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = localStream.getVideoTracks()[0];
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        // Listen for screen share end
        videoTrack.addEventListener('ended', () => {
          setIsScreenSharing(false);
          // Switch back to camera
          initializeCall();
        });
      } else {
        // Stop screen sharing and switch back to camera
        setIsScreenSharing(false);
        initializeCall();
      }
    } catch (error) {
      console.error('Error with screen sharing:', error);
      showNotification('Failed to share screen', 'error');
    }
  };

  if (!isCallActive && callState !== 'incoming') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-900 z-50 flex flex-col"
      >
        {/* Incoming Call Screen */}
        {callState === 'incoming' && (
          <div className="flex-1 flex flex-col items-center justify-center text-white">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6 ring-4 ring-white/20">
                {contactAvatar ? (
                  <img 
                    src={contactAvatar} 
                    alt={contactName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {contactName?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </div>
              
              <h2 className="text-2xl font-semibold mb-2">{contactName}</h2>
              <p className="text-lg text-gray-300 mb-8">
                Incoming {callType} call...
              </p>
              
              <div className="flex space-x-8">
                <Button
                  onClick={handleDeclineCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </Button>
                
                <Button
                  onClick={handleAcceptCall}
                  className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Call Screen (Connecting/Connected) */}
        {(callState === 'connecting' || callState === 'connected') && (
          <>
            {/* Video Container */}
            <div className="flex-1 relative">
              {/* Remote Video (Full Screen) */}
              <div className="absolute inset-0 bg-gray-800">
                {callType === 'video' && remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white">
                    <div className="w-32 h-32 rounded-full overflow-hidden mb-4 ring-4 ring-white/20">
                      {contactAvatar ? (
                        <img 
                          src={contactAvatar} 
                          alt={contactName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                          <span className="text-3xl font-bold text-white">
                            {contactName?.charAt(0) || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold">{contactName}</h3>
                    <p className="text-gray-300">
                      {callState === 'connecting' ? 'Connecting...' : formatDuration(callDuration)}
                    </p>
                  </div>
                )}
              </div>

              {/* Local Video (Picture in Picture) */}
              {callType === 'video' && isVideoEnabled && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-4 right-4 w-32 h-24 rounded-lg overflow-hidden bg-gray-700 border-2 border-white/20"
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              )}

              {/* Call Status */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                <div className="flex items-center space-x-2 text-white">
                  <div className={`w-2 h-2 rounded-full ${
                    callState === 'connected' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm">
                    {callState === 'connected' ? formatDuration(callDuration) : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Call Controls */}
            <div className="p-6 bg-gray-900/90 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-6">
                {/* Mute Button */}
                <Button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    {isMuted ? (
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zm2.91 4.217a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    )}
                  </svg>
                </Button>

                {/* Video Toggle (only for video calls) */}
                {callType === 'video' && (
                  <Button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      !isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      {isVideoEnabled ? (
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      ) : (
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13V7a1 1 0 00-1.447-.894l-2 1A1 1 0 0014 8v4.586l-3-3V6a2 2 0 00-2-2H5.414l-1.707-1.707zM4 8.586V6h2.586L4 8.586zM12 14H9.414l-5-5H4a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2v-1z" clipRule="evenodd" />
                      )}
                    </svg>
                  </Button>
                )}

                {/* Screen Share Button (only for video calls) */}
                {callType === 'video' && (
                  <Button
                    onClick={toggleScreenShare}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1h-5v1h3a1 1 0 110 2H6a1 1 0 110-2h3v-1H4a1 1 0 01-1-1V4zm1 7V5h12v6H4z" clipRule="evenodd" />
                    </svg>
                  </Button>
                )}

                {/* End Call Button */}
                <Button
                  onClick={handleEndCall}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                >
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCall;
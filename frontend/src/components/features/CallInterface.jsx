import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../common';
import { useNotification } from '../../contexts/NotificationContext';

const CallInterface = ({ contactId, contactName, contactAvatar, onEndCall }) => {
  const [callType, setCallType] = useState('audio'); // 'audio' or 'video'
  const [callState, setCallState] = useState('calling'); // 'calling', 'connecting', 'connected', 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const { showNotification } = useNotification();

  const startCall = async (type = 'audio') => {
    try {
      setCallType(type);
      setIsVideoEnabled(type === 'video');
      setCallState('connecting');
      
      // Initialize call with backend
      const token = localStorage.getItem('token');
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contactId,
          type
        })
      });

      if (response.ok) {
        const data = await response.json();
        // In a real app, you would use the call data to connect via LiveKit
        simulateCallConnection();
      } else {
        throw new Error('Failed to initiate call');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      showNotification('Failed to start call', 'error');
      setCallState('ended');
    }
  };

  const simulateCallConnection = () => {
    // Simulate connection delay
    setTimeout(() => {
      setCallState('connected');
      callStartTimeRef.current = Date.now();
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(elapsed);
      }, 1000);
      
      showNotification('Call connected', 'success');
    }, 2000);
  };

  const endCall = async () => {
    try {
      // Clear duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      
      setCallState('ended');
      
      // End call on backend
      const token = localStorage.getItem('token');
      const response = await fetch('/api/calls/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contactId,
          duration: callDuration
        })
      });

      if (response.ok) {
        showNotification('Call ended', 'info');
      }
      
      onEndCall?.();
    } catch (error) {
      console.error('Error ending call:', error);
      onEndCall?.();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real app, you would mute/unmute the audio track
    showNotification(isMuted ? 'Microphone unmuted' : 'Microphone muted', 'info');
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // In a real app, you would enable/disable the video track
    showNotification(isVideoEnabled ? 'Camera turned off' : 'Camera turned on', 'info');
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // In a real app, you would start/stop screen sharing
    showNotification(isScreenSharing ? 'Screen sharing stopped' : 'Screen sharing started', 'info');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState === 'ended') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-80 z-50"
    >
      {/* Call Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {contactAvatar ? (
              <img 
                src={contactAvatar} 
                alt={contactName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {contactName?.charAt(0) || 'U'}
                </span>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {contactName}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className={`w-2 h-2 rounded-full ${
                callState === 'connected' ? 'bg-green-500' : 
                callState === 'connecting' ? 'bg-yellow-500' : 'bg-gray-400'
              }`}></div>
              <span>
                {callState === 'calling' ? 'Calling...' :
                 callState === 'connecting' ? 'Connecting...' :
                 callState === 'connected' ? formatDuration(callDuration) : 'Call ended'}
              </span>
            </div>
          </div>
        </div>

        {/* Call Type Toggle (only when not connected) */}
        {callState === 'calling' && (
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <Button
              variant={callType === 'audio' ? 'primary' : 'ghost'}
              size="small"
              onClick={() => setCallType('audio')}
              className="px-3 py-1 text-xs"
            >
              Audio
            </Button>
            <Button
              variant={callType === 'video' ? 'primary' : 'ghost'}
              size="small"
              onClick={() => setCallType('video')}
              className="px-3 py-1 text-xs"
            >
              Video
            </Button>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="flex items-center justify-center space-x-3">
        {callState === 'calling' ? (
          <>
            <Button
              onClick={() => startCall('audio')}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center"
              title="Start audio call"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </Button>
            
            <Button
              onClick={() => startCall('video')}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center"
              title="Start video call"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </Button>
          </>
        ) : (
          <>
            {/* Mute Button */}
            <Button
              onClick={toggleMute}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
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
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  !isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600'
                }`}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  {isVideoEnabled ? (
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  ) : (
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13V7a1 1 0 00-1.447-.894l-2 1A1 1 0 0014 8v4.586l-3-3V6a2 2 0 00-2-2H5.414l-1.707-1.707zM4 8.586V6h2.586L4 8.586zM12 14H9.414l-5-5H4a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2v-1z" clipRule="evenodd" />
                  )}
                </svg>
              </Button>
            )}

            {/* Screen Share (only for video calls) */}
            {callType === 'video' && callState === 'connected' && (
              <Button
                onClick={toggleScreenShare}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
                }`}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1h-5v1h3a1 1 0 110 2H6a1 1 0 110-2h3v-1H4a1 1 0 01-1-1V4zm1 7V5h12v6H4z" clipRule="evenodd" />
                </svg>
              </Button>
            )}
          </>
        )}

        {/* End Call Button */}
        <Button
          onClick={endCall}
          className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
          title="End call"
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
        </Button>
      </div>

      {/* Expand to Full Screen Button (when connected) */}
      {callState === 'connected' && callType === 'video' && (
        <div className="mt-3 text-center">
          <Button
            variant="outline"
            size="small"
            onClick={() => {
              // In a real app, this would expand to full screen
              showNotification('Full screen mode not implemented in demo', 'info');
            }}
          >
            Expand to full screen
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default CallInterface;
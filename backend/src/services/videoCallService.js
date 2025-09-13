const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');

class VideoCallService {
  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;
    this.wsUrl = process.env.LIVEKIT_WS_URL || 'wss://your-livekit-server.com';
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('⚠️ LiveKit credentials not configured. Video calls will use fallback mode.');
    } else {
      this.roomService = new RoomServiceClient(this.wsUrl, this.apiKey, this.apiSecret);
      console.log('✅ LiveKit video service initialized');
    }
  }

  async createRoom(roomName, maxParticipants = 10) {
    try {
      if (!this.roomService) {
        throw new Error('LiveKit not configured');
      }

      const options = {
        name: roomName,
        emptyTimeout: 60 * 10, // 10 minutes
        maxParticipants,
        metadata: JSON.stringify({
          createdAt: new Date().toISOString(),
          type: 'relatim-call'
        })
      };

      const room = await this.roomService.createRoom(options);
      console.log(`📹 Created video room: ${roomName}`);
      return room;
    } catch (error) {
      console.error('Failed to create video room:', error);
      throw error;
    }
  }

  async generateAccessToken(roomName, participantName, participantId) {
    try {
      if (!this.apiKey || !this.apiSecret) {
        // Fallback: return a demo token structure for development
        return {
          token: `demo_token_${participantId}_${Date.now()}`,
          wsUrl: this.wsUrl,
          roomName,
          participantName
        };
      }

      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: participantId.toString(),
        name: participantName,
      });

      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
      });

      const token = at.toJwt();
      
      console.log(`🎫 Generated access token for ${participantName} in room ${roomName}`);
      
      return {
        token,
        wsUrl: this.wsUrl,
        roomName,
        participantName
      };
    } catch (error) {
      console.error('Failed to generate access token:', error);
      throw error;
    }
  }

  async getRoomInfo(roomName) {
    try {
      if (!this.roomService) {
        // Fallback for development
        return {
          name: roomName,
          numParticipants: 0,
          maxParticipants: 10,
          creationTime: Date.now(),
          turnPassword: '',
          enabledCodecs: [],
          metadata: '{}',
          numPublishers: 0,
          activeRecording: false
        };
      }

      const rooms = await this.roomService.listRooms([roomName]);
      return rooms.length > 0 ? rooms[0] : null;
    } catch (error) {
      console.error('Failed to get room info:', error);
      return null;
    }
  }

  async deleteRoom(roomName) {
    try {
      if (!this.roomService) {
        console.log(`🗑️ Simulated deletion of room: ${roomName}`);
        return true;
      }

      await this.roomService.deleteRoom(roomName);
      console.log(`🗑️ Deleted video room: ${roomName}`);
      return true;
    } catch (error) {
      console.error('Failed to delete room:', error);
      return false;
    }
  }

  async getParticipants(roomName) {
    try {
      if (!this.roomService) {
        return [];
      }

      const participants = await this.roomService.listParticipants(roomName);
      return participants;
    } catch (error) {
      console.error('Failed to get participants:', error);
      return [];
    }
  }

  async removeParticipant(roomName, participantId) {
    try {
      if (!this.roomService) {
        console.log(`👋 Simulated removal of participant ${participantId} from room ${roomName}`);
        return true;
      }

      await this.roomService.removeParticipant(roomName, participantId);
      console.log(`👋 Removed participant ${participantId} from room ${roomName}`);
      return true;
    } catch (error) {
      console.error('Failed to remove participant:', error);
      return false;
    }
  }

  async muteParticipant(roomName, participantId, trackType = 'audio') {
    try {
      if (!this.roomService) {
        console.log(`🔇 Simulated muting of ${trackType} for participant ${participantId} in room ${roomName}`);
        return true;
      }

      await this.roomService.mutePublishedTrack(roomName, participantId, trackType);
      console.log(`🔇 Muted ${trackType} for participant ${participantId} in room ${roomName}`);
      return true;
    } catch (error) {
      console.error('Failed to mute participant:', error);
      return false;
    }
  }

  async sendDataToRoom(roomName, data, kind = 'reliable') {
    try {
      if (!this.roomService) {
        console.log(`📤 Simulated data send to room ${roomName}:`, data);
        return true;
      }

      const uint8Data = new TextEncoder().encode(JSON.stringify(data));
      await this.roomService.sendData(roomName, uint8Data, kind);
      console.log(`📤 Sent data to room ${roomName}`);
      return true;
    } catch (error) {
      console.error('Failed to send data to room:', error);
      return false;
    }
  }

  // Utility method to create a call room with proper naming
  generateCallRoomName(callId, type = 'video') {
    return `call_${type}_${callId}_${Date.now()}`;
  }

  // Method to handle call initiation
  async initiateCall(callId, callerId, callerName, receiverId, type = 'video') {
    try {
      const roomName = this.generateCallRoomName(callId, type);
      
      // Create the room
      await this.createRoom(roomName, 2); // Maximum 2 participants for 1-on-1 call

      // Generate access token for the caller
      const callerToken = await this.generateAccessToken(
        roomName, 
        callerName, 
        callerId
      );

      return {
        roomName,
        callerToken,
        roomInfo: {
          id: callId,
          type,
          maxParticipants: 2,
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  }

  // Method to handle call joining
  async joinCall(roomName, participantId, participantName) {
    try {
      // Check if room exists
      const roomInfo = await this.getRoomInfo(roomName);
      if (!roomInfo && this.roomService) {
        throw new Error('Call room not found or expired');
      }

      // Generate access token for the participant
      const participantToken = await this.generateAccessToken(
        roomName, 
        participantName, 
        participantId
      );

      return {
        participantToken,
        roomInfo
      };
    } catch (error) {
      console.error('Failed to join call:', error);
      throw error;
    }
  }

  // Method to end a call
  async endCall(roomName) {
    try {
      // Get participants before deletion for cleanup
      const participants = await this.getParticipants(roomName);
      
      // Delete the room
      await this.deleteRoom(roomName);

      return {
        success: true,
        participantsCount: participants.length
      };
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }
}

module.exports = new VideoCallService();
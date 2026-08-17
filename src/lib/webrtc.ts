export interface WebRTCConfig {
  onRemoteStream: (stream: MediaStream) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private config: WebRTCConfig;

  constructor(config: WebRTCConfig) {
    this.config = config;
  }

  // Get User Media (Camera & Mic)
  async startLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      });
      return this.localStream;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Permisos de cámara o micrófono denegados por el navegador.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No se encontraron dispositivos de cámara o micrófono disponibles.');
      }
      throw new Error(`Error al acceder a los dispositivos multimedia: ${error.message}`);
    }
  }

  // Initialize RTCPeerConnection
  initPeerConnection(): RTCPeerConnection {
    if (this.pc) {
      this.cleanup();
    }

    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    // Attach local stream tracks to Peer Connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
        }
      });
    }

    // ICE Candidate handler
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.config.onIceCandidate(event.candidate);
      }
    };

    // Remote Track handler
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.config.onRemoteStream(this.remoteStream);
      } else if (this.remoteStream) {
        this.remoteStream.addTrack(event.track);
        this.config.onRemoteStream(this.remoteStream);
      }
    };

    // Connection state changes
    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        this.config.onConnectionStateChange(this.pc.connectionState);
      }
    };

    return this.pc;
  }

  // Create SDP Offer (Caller)
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      this.initPeerConnection();
    }
    if (!this.pc) throw new Error('Peer connection not initialized');

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  // Handle Received SDP Offer and Create Answer (Callee)
  async handleOfferAndCreateAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      this.initPeerConnection();
    }
    if (!this.pc) throw new Error('Peer connection not initialized');

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Process queued candidates if any arrived before offer
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  // Handle Received SDP Answer (Caller)
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));

    // Process queued candidates
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  }

  // Add ICE Candidate
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // ignore non-critical candidate failures
    }
  }

  // Toggle Microphone Mute
  toggleAudio(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled !== undefined ? enabled : !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  // Toggle Camera
  toggleVideo(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = enabled !== undefined ? enabled : !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Teardown connection and release media tracks
  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.localStream = null;
    }

    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // ignore
      }
      this.pc = null;
    }

    this.remoteStream = null;
    this.pendingCandidates = [];
  }
}

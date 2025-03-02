import Peer from 'simple-peer';
import { encryptWithPublicKey, decryptWithPrivateKey } from './encryption';

// Create a WebRTC peer connection
export const createPeer = (stream, initiator = false, trickle = true) => {
  return new Peer({
    initiator,
    trickle,
    stream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  });
};

// Handle incoming signals for call setup with encryption
export const handleSignal = async (peer, signal, publicKey = null, privateKey = null) => {
  // If we have encryption keys, encrypt/decrypt the signal
  if (signal && publicKey) {
    // Encrypt outgoing signal
    const encryptedSignal = await encryptWithPublicKey(signal, publicKey);
    return encryptedSignal;
  } else if (signal && privateKey) {
    // Decrypt incoming signal
    const decryptedSignal = await decryptWithPrivateKey(signal, privateKey);
    peer.signal(decryptedSignal);
  } else {
    // No encryption (fallback)
    if (signal) peer.signal(signal);
  }
};

// Handle media streams
export const handleStream = (peer, setRemoteStream) => {
  peer.on('stream', (stream) => {
    setRemoteStream(stream);
  });
};

// Add a listener for when peer connection is established
export const onConnect = (peer, callback) => {
  peer.on('connect', callback);
};

// Handle connection errors
export const onError = (peer, callback) => {
  peer.on('error', callback);
};

// Handle peer disconnection
export const onClose = (peer, callback) => {
  peer.on('close', callback);
};

// Clean up peer connection
export const destroyPeer = (peer) => {
  if (peer) {
    peer.destroy();
  }
};

// Get user media with desired constraints
export const getUserMedia = async (video = true, audio = true) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video,
      audio,
    });
    return { stream, error: null };
  } catch (error) {
    console.error('Error accessing media devices:', error);
    return { stream: null, error };
  }
};

// Stop all tracks in a stream
export const stopMediaStream = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
};
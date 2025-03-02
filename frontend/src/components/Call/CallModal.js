import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  Avatar,
  Flex,
  Center,
  VStack,
  HStack,
  IconButton,
  useToast
} from "@chakra-ui/react";
import { PhoneIcon, BellIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";
import CallControls from "./CallControls";
import { getSenderFull } from "../../config/ChatLogics";
import { createPeer, handleSignal, handleStream, onConnect, onError, onClose, getUserMedia, stopMediaStream } from "../../utils/webrtc";
import axios from "axios";
import io from "socket.io-client";

const CallModal = ({ isOpen, onClose, call = null, isIncoming = false }) => {
  const {
    user,
    selectedChat,
    callActive,
    setCallActive,
    callData,
    setCallData,
    localStream,
    setLocalStream,
    remoteStream,
    setRemoteStream,
    callType,
    setCallType,
  } = ChatState();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [callDuration, setCallDuration] = useState(0);
  
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const callTimerRef = useRef(null);
  
  const toast = useToast();

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_BASE_URL || "http://localhost:5000");
    
    // Socket event listeners for signaling
    socketRef.current.on("call:incoming", handleIncomingCall);
    socketRef.current.on("call:accepted", handleCallAccepted);
    socketRef.current.on("call:ice-candidate", handleIceCandidate);
    socketRef.current.on("call:ended", handleCallEnded);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Setup local media stream
  useEffect(() => {
    if (isOpen && !localStream) {
      startLocalStream();
    }
    
    return () => {
      cleanupCall();
    };
  }, [isOpen]);

  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  // Start local media stream
  const startLocalStream = async () => {
    try {
      const { stream, error } = await getUserMedia(callType === "video", true);
      
      if (error) {
        toast({
          title: "Camera/Microphone Error",
          description: "Could not access media devices. Please check permissions.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      setLocalStream(stream);
      
      // If this is an outgoing call, initiate it
      if (!isIncoming && selectedChat) {
        initiateCall(stream);
      }
      // If this is an incoming call, prepare to answer
      else if (isIncoming && call) {
        prepareToAnswer(stream, call);
      }
    } catch (error) {
      console.error("Error starting media stream:", error);
      toast({
        title: "Error",
        description: "Failed to start call. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Initiate an outgoing call
  const initiateCall = async (stream) => {
    try {
      // Get recipients (exclude self)
      const recipients = selectedChat.users
        .filter(u => u._id !== user._id)
        .map(u => u._id);
      
      // Create call record in database
      const { data } = await axios.post(
        "/api/call",
        {
          chatId: selectedChat._id,
          recipients,
          callType
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      
      setCallData(data.call);
      const encryptionKey = data.encryptionKey;
      
      // Create WebRTC peer (as initiator)
      const peer = createPeer(stream, true);
      peerRef.current = peer;
      
      // Listen for signals to send
      peer.on("signal", async (signal) => {
        // Socket.io signaling
        socketRef.current.emit("call:start", {
          callId: data.call._id,
          caller: user._id,
          recipients,
          encryptedSignal: signal, // In production, encrypt this signal
          callType
        });
      });
      
      // Setup other peer event handlers
      handleStream(peer, setRemoteStream);
      onConnect(peer, () => {
        setConnectionStatus("connected");
        startCallTimer();
      });
      onError(peer, (err) => {
        console.error("Peer connection error:", err);
        setConnectionStatus("error");
      });
      
      setCallActive(true);
    } catch (error) {
      console.error("Error initiating call:", error);
      toast({
        title: "Error",
        description: "Failed to initiate call. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Prepare to answer an incoming call
  const prepareToAnswer = (stream, incomingCall) => {
    try {
      setCallData(incomingCall);
      setCallType(incomingCall.callType);
      
      // Create WebRTC peer (not as initiator since we're answering)
      const peer = createPeer(stream, false);
      peerRef.current = peer;
      
      // Listen for signals to send when we answer
      peer.on("signal", (signal) => {
        // Will send this when user accepts the call
        socketRef.current.emit("call:answer", {
          callId: incomingCall._id,
          caller: incomingCall.caller._id,
          recipient: user._id,
          encryptedSignal: signal, // In production, encrypt this signal
        });
      });
      
      // Setup other peer event handlers
      handleStream(peer, setRemoteStream);
      onConnect(peer, () => {
        setConnectionStatus("connected");
        startCallTimer();
      });
      onError(peer, (err) => {
        console.error("Peer connection error:", err);
        setConnectionStatus("error");
      });
    } catch (error) {
      console.error("Error preparing to answer:", error);
    }
  };

  // Answer an incoming call
  const answerCall = async () => {
    try {
      // Signal that we've accepted the call
      if (peerRef.current) {
        // Update call status in database
        await axios.put(
          "/api/call/status",
          {
            callId: callData._id,
            status: "answered",
          },
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
        
        setCallActive(true);
      }
    } catch (error) {
      console.error("Error answering call:", error);
    }
  };

  // Handle incoming call signal
  const handleIncomingCall = (data) => {
    // If we're already in a call, reject this one
    if (callActive) {
      return;
    }
    
    // Set incoming call data
    setCallData(data);
  };

  // Handle accepted call signal
  const handleCallAccepted = (data) => {
    if (peerRef.current && data.encryptedSignal) {
      // In production, decrypt the signal first
      peerRef.current.signal(data.encryptedSignal);
    }
  };

  // Handle ICE candidate for connection
  const handleIceCandidate = (data) => {
    if (peerRef.current && data.candidate) {
      peerRef.current.signal({ candidate: data.candidate });
    }
  };

  // Handle remote party ending call
  const handleCallEnded = async (data) => {
    try {
      // Update call status
      await axios.put(
        "/api/call/status",
        {
          callId: data.callId,
          status: "completed",
          endTime: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      
      cleanupCall();
      onClose();
      
      toast({
        title: "Call Ended",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error handling call end:", error);
    }
  };

  // End the current call
  const endCall = async () => {
    try {
      if (callData) {
        // Notify other participants
        socketRef.current.emit("call:end", {
          callId: callData._id,
          participants: callData.recipients.map(r => r._id).concat(callData.caller._id),
        });
        
        // Update call status
        await axios.put(
          "/api/call/status",
          {
            callId: callData._id,
            status: "completed",
            endTime: new Date().toISOString(),
          },
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
      }
      
      cleanupCall();
      onClose();
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  // Cleanup call resources
  const cleanupCall = () => {
    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    // Destroy peer connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    // Stop media streams
    if (localStream) {
      stopMediaStream(localStream);
      setLocalStream(null);
    }
    
    if (remoteStream) {
      setRemoteStream(null);
    }
    
    // Reset call state
    setCallActive(false);
    setCallData(null);
    setCallDuration(0);
    setConnectionStatus("disconnected");
  };

  // Start the call timer
  const startCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    const startTime = Date.now();
    callTimerRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setCallDuration(seconds);
    }, 1000);
  };

  // Toggle mute status
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video status
  const toggleVideo = () => {
    if (localStream && callType === "video") {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    if (remoteStream) {
      remoteStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get the other participant(s) name
  const getCallParticipantName = () => {
    if (!callData) return "";
    
    if (callData.chat.isGroupChat) {
      return callData.chat.chatName;
    } else {
      const otherUser = callData.chat.users.find(u => u._id !== user._id);
      return otherUser ? otherUser.name : "";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={endCall} size="full" motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
      <ModalContent bg="gray.900" color="white" h="100vh">
        <ModalHeader p={4} bg="gray.800">
          <Flex justifyContent="space-between" alignItems="center">
            <HStack>
              <Avatar size="sm" name={getCallParticipantName()} src={callData?.chat?.pic} />
              <VStack alignItems="flex-start" spacing={0}>
                <Text fontWeight="bold">{getCallParticipantName()}</Text>
                <Text fontSize="xs">
                  {connectionStatus === "connected" 
                    ? formatDuration(callDuration) 
                    : connectionStatus}
                </Text>
              </VStack>
            </HStack>
          </Flex>
        </ModalHeader>
        
        <ModalBody p={0} position="relative">
          {/* Video container */}
          {callType === "video" && (
            <Flex direction="column" h="100%">
              {/* Remote video (large) */}
              <Box flex="1" bg="black" position="relative">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Center h="100%">
                    <Avatar size="2xl" name={getCallParticipantName()} src={callData?.chat?.pic} />
                  </Center>
                )}
                
                {/* Local video (picture-in-picture) */}
                <Box
                  position="absolute"
                  bottom="90px"
                  right="5"
                  width="150px"
                  height="200px"
                  borderRadius="md"
                  overflow="hidden"
                  boxShadow="dark-lg"
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
              </Box>
            </Flex>
          )}
          
          {/* Audio call view */}
          {callType === "audio" && (
            <Center h="100%" flexDirection="column">
              <Avatar 
                size="2xl" 
                name={getCallParticipantName()} 
                src={callData?.chat?.pic}
                mb={6}
              />
              <Text fontSize="xl" fontWeight="bold" mb={2}>
                {getCallParticipantName()}
              </Text>
              <Text fontSize="md" color="gray.300">
                {connectionStatus === "connected" 
                  ? formatDuration(callDuration) 
                  : connectionStatus}
              </Text>
              <audio ref={remoteVideoRef} autoPlay />
              <audio ref={localVideoRef} autoPlay muted />
            </Center>
          )}
          
          {/* Incoming call view */}
          {isIncoming && !callActive && (
            <Center h="100%" flexDirection="column">
              <Avatar 
                size="2xl" 
                name={getCallParticipantName()} 
                src={callData?.chat?.pic}
                mb={6}
              />
              <Text fontSize="xl" fontWeight="bold" mb={2}>
                Incoming {callType} call...
              </Text>
              <HStack mt={8} spacing={8}>
                <IconButton
                  colorScheme="red"
                  aria-label="Decline Call"
                  icon={<PhoneIcon transform="rotate(135deg)" />}
                  borderRadius="full"
                  size="lg"
                  onClick={endCall}
                />
                <IconButton
                  colorScheme="green"
                  aria-label="Answer Call"
                  icon={<PhoneIcon />}
                  borderRadius="full"
                  size="lg"
                  onClick={answerCall}
                />
              </HStack>
            </Center>
          )}
          
          {/* Call controls */}
          {callActive && (
            <CallControls
              onEndCall={endCall}
              toggleMute={toggleMute}
              toggleVideo={toggleVideo}
              toggleSpeaker={toggleSpeaker}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isSpeakerOn={isSpeakerOn}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CallModal;
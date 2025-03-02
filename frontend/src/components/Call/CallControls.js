import React from "react";
import {
  Box,
  IconButton,
  Tooltip,
  HStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { 
  PhoneIcon, 
  CloseIcon, 
  WarningIcon,
  ViewIcon,
  ViewOffIcon,
  MicrophoneIcon,
  InfoIcon,
  BellIcon,
} from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";

// Custom icons for missing Chakra UI icons
const MicrophoneIcon = (props) => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    height="1em"
    width="1em"
    {...props}
  >
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
  </svg>
);

const MicOffIcon = (props) => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    height="1em"
    width="1em"
    {...props}
  >
    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
  </svg>
);

// Call Controls component for in-call actions
const CallControls = ({ 
  onEndCall, 
  toggleMute, 
  toggleVideo, 
  toggleSpeaker,
  isMuted = false,
  isVideoOff = false,
  isSpeakerOn = true
}) => {
  const bgColor = useColorModeValue("white", "gray.700");
  const { callType } = ChatState();
  
  return (
    <Box
      position="absolute"
      bottom="4"
      left="50%"
      transform="translateX(-50%)"
      bg={bgColor}
      p={3}
      borderRadius="full"
      boxShadow="lg"
      zIndex={10}
    >
      <HStack spacing={4}>
        {/* Mute/Unmute */}
        <Tooltip label={isMuted ? "Unmute" : "Mute"} placement="top">
          <IconButton
            colorScheme={isMuted ? "red" : "gray"}
            aria-label={isMuted ? "Unmute" : "Mute"}
            icon={isMuted ? <MicOffIcon /> : <MicrophoneIcon />}
            borderRadius="full"
            onClick={toggleMute}
          />
        </Tooltip>

        {/* End Call Button */}
        <Tooltip label="End Call" placement="top">
          <IconButton
            colorScheme="red"
            aria-label="End Call"
            icon={<PhoneIcon transform="rotate(135deg)" />}
            borderRadius="full"
            onClick={onEndCall}
          />
        </Tooltip>

        {/* Video Toggle (only for video calls) */}
        {callType === "video" && (
          <Tooltip label={isVideoOff ? "Turn On Camera" : "Turn Off Camera"} placement="top">
            <IconButton
              colorScheme={isVideoOff ? "red" : "gray"}
              aria-label={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
              icon={isVideoOff ? <ViewOffIcon /> : <ViewIcon />}
              borderRadius="full"
              onClick={toggleVideo}
            />
          </Tooltip>
        )}

        {/* Speaker Toggle */}
        <Tooltip label={isSpeakerOn ? "Speaker Off" : "Speaker On"} placement="top">
          <IconButton
            colorScheme={isSpeakerOn ? "blue" : "gray"}
            aria-label={isSpeakerOn ? "Speaker Off" : "Speaker On"}
            icon={<BellIcon />}
            borderRadius="full"
            onClick={toggleSpeaker}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
};

export default CallControls;
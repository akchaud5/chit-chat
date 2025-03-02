import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { IconButton, Spinner, useToast, HStack } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowBackIcon, PhoneIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";
import CallModal from "./Call/CallModal";

import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
import { 
  encryptMessage, 
  decryptMessage, 
  generateMessageKey, 
  exportSymmetricKey, 
  importSymmetricKey,
  encryptWithPublicKey 
} from "../utils/encryption";

const ENDPOINT = "http://localhost:5000"; // "https://talk-a-tive.herokuapp.com"; -> After deployment
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const { 
    selectedChat, 
    setSelectedChat, 
    user, 
    notification, 
    setNotification,
    callType,
    setCallType,
    incomingCall,
    setIncomingCall
  } = ChatState();

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );
      setMessages(data);
      setLoading(false);

      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        
        const { keyPair, chatKeys } = ChatState();
        setNewMessage("");
        
        // Check if we have encryption enabled for this chat
        if (selectedChat.encryptionEnabled && chatKeys[selectedChat._id]) {
          // Encrypt the message with the chat's symmetric key
          const chatKey = chatKeys[selectedChat._id];
          const encryptedContent = await encryptMessage(newMessage, chatKey);
          
          // Send encrypted message
          const { data } = await axios.post(
            "/api/message",
            {
              chatId: selectedChat,
              isEncrypted: true,
              encryptedContent: encryptedContent
            },
            config
          );
          
          // Store the original message locally for display
          data.originalContent = newMessage;
          
          socket.emit("new message", data);
          setMessages([...messages, data]);
        } else {
          // Send unencrypted message
          const { data } = await axios.post(
            "/api/message",
            {
              content: newMessage,
              chatId: selectedChat,
              isEncrypted: false
            },
            config
          );
          socket.emit("new message", data);
          setMessages([...messages, data]);
        }
      } catch (error) {
        toast({
          title: "Error Occured!",
          description: "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
    
    // Listen for incoming calls
    socket.on("call:incoming", (callData) => {
      if (callData.recipients.includes(user._id)) {
        setIncomingCall(callData);
        setIsCallModalOpen(true);
      }
    });

    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchMessages();
    
    // Setup encryption for this chat if not already done
    if (selectedChat && selectedChat.encryptionEnabled) {
      setupChatEncryption();
    }

    selectedChatCompare = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);
  
  // Set up encryption for a chat
  const setupChatEncryption = async () => {
    const { keyPair, chatKeys, setChatKeys } = ChatState();
    
    // Skip if we don't have a key pair or already have a key for this chat
    if (!keyPair || chatKeys[selectedChat._id]) {
      return;
    }
    
    try {
      // For one-on-one chats, set up encryption
      if (!selectedChat.isGroupChat) {
        // Find the other user
        const otherUser = selectedChat.users.find(u => u._id !== user._id);
        
        // Check if the other user has a public key
        if (otherUser.publicKey) {
          // Generate a new symmetric key for this chat
          const chatKey = await generateMessageKey();
          
          // Store the chat key in our local state
          const newChatKeys = { ...chatKeys };
          newChatKeys[selectedChat._id] = chatKey;
          setChatKeys(newChatKeys);
          
          // Save chat keys to local storage
          localStorage.setItem("chatKeys", JSON.stringify(newChatKeys));
          
          // Encrypt the symmetric key with the recipient's public key
          const encryptedKey = await encryptWithPublicKey(
            await exportSymmetricKey(chatKey), 
            otherUser.publicKey
          );
          
          // Store the encrypted key on the server for this chat
          const config = {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          };
          
          await axios.put(
            "/api/chat/encryptedkey",
            {
              chatId: selectedChat._id,
              encryptedKey,
            },
            config
          );
        }
      }
      // For group chats, the process would be more complex
      // We'd need to encrypt the symmetric key for each group member
    } catch (error) {
      console.error("Error setting up chat encryption:", error);
    }
  };

  useEffect(() => {
    socket.on("message recieved", (newMessageRecieved) => {
      if (
        !selectedChatCompare || // if chat is not selected or doesn't match current chat
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, newMessageRecieved]);
      }
    });
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  // Initiate a call
  const initiateCall = (type) => {
    setCallType(type);
    setIsCallModalOpen(true);
  };

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              d={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            {messages &&
              (!selectedChat.isGroupChat ? (
                <>
                  <Box>
                    {getSender(user, selectedChat.users)}
                    <HStack spacing={2} mt={1}>
                      <IconButton
                        size="sm"
                        colorScheme="blue"
                        icon={<PhoneIcon />}
                        onClick={() => initiateCall("audio")}
                        aria-label="Audio Call"
                      />
                      <IconButton
                        size="sm"
                        colorScheme="teal"
                        icon={<PhoneIcon />}
                        onClick={() => initiateCall("video")}
                        aria-label="Video Call"
                      />
                    </HStack>
                  </Box>
                  <ProfileModal
                    user={getSenderFull(user, selectedChat.users)}
                  />
                </>
              ) : (
                <>
                  {selectedChat.chatName.toUpperCase()}
                  <UpdateGroupChatModal
                    fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                  />
                </>
              ))}
          </Text>
          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                <ScrollableChat messages={messages} />
              </div>
            )}

            <FormControl
              onKeyDown={sendMessage}
              id="first-name"
              isRequired
              mt={3}
            >
              {istyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    // height={50}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}
              <Input
                variant="filled"
                bg="#E0E0E0"
                placeholder="Enter a message.."
                value={newMessage}
                onChange={typingHandler}
              />
            </FormControl>
          </Box>
        </>
      ) : (
        // to get socket.io on same page
        <Box d="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
      
      {/* Call Modal */}
      <CallModal 
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        call={incomingCall}
        isIncoming={!!incomingCall}
      />
    </>
  );
};

export default SingleChat;

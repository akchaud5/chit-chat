import React, { createContext, useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { generateKeyPair, exportPublicKey } from "../utils/encryption";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState();
  
  // Encryption-related state
  const [keyPair, setKeyPair] = useState(null);
  const [chatKeys, setChatKeys] = useState({}); // Map of chatId -> symmetric key
  
  // Call-related state
  const [callActive, setCallActive] = useState(false);
  const [callData, setCallData] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callType, setCallType] = useState(null); // "audio" or "video"

  const history = useHistory();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    setUser(userInfo);

    if (!userInfo) history.push("/");
    
    // Generate encryption key pair on startup if user is logged in
    if (userInfo) {
      initializeEncryption();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);
  
  // Initialize encryption
  const initializeEncryption = async () => {
    try {
      // Check if we have saved keys
      const savedKeyPair = localStorage.getItem("encryptionKeyPair");
      
      if (savedKeyPair) {
        // TODO: In a real app, we would need to properly securely store and retrieve keys
        setKeyPair(JSON.parse(savedKeyPair));
      } else {
        // Generate new key pair
        const newKeyPair = await generateKeyPair();
        setKeyPair(newKeyPair);
        
        // Export public key to share with server
        const publicKeyString = await exportPublicKey(newKeyPair);
        
        // TODO: Update the user's profile with their public key
        // This would involve making an API call to update the user's profile
        
        // Save key pair (in a real app, this would be done securely)
        // This is just for demonstration
        localStorage.setItem("encryptionKeyPair", JSON.stringify(newKeyPair));
      }
      
      // Load chat keys
      const savedChatKeys = localStorage.getItem("chatKeys");
      if (savedChatKeys) {
        setChatKeys(JSON.parse(savedChatKeys));
      }
    } catch (error) {
      console.error("Error initializing encryption:", error);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        notification,
        setNotification,
        chats,
        setChats,
        
        // Encryption context values
        keyPair,
        setKeyPair,
        chatKeys,
        setChatKeys,
        
        // Call context values
        callActive,
        setCallActive,
        callData,
        setCallData,
        localStream,
        setLocalStream,
        remoteStream,
        setRemoteStream,
        callHistory,
        setCallHistory,
        incomingCall,
        setIncomingCall,
        callType,
        setCallType,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;

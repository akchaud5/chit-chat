import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import ScrollableFeed from "react-scrollable-feed";
import { Box, Icon } from "@chakra-ui/react";
import { LockIcon } from "@chakra-ui/icons";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";
import { decryptMessage } from "../utils/encryption";

const ScrollableChat = ({ messages }) => {
  const { user, chatKeys } = ChatState();

  // Helper function to display message content
  const getMessageContent = (message) => {
    // If message has originalContent (locally decrypted), use that
    if (message.originalContent) {
      return message.originalContent;
    }
    
    // If message is encrypted and we have the key, try to decrypt
    if (message.isEncrypted && message.encryptedContent && chatKeys) {
      try {
        const chatKey = chatKeys[message.chat._id];
        if (chatKey) {
          // In a real implementation, we'd cache the decrypted content
          // and handle decryption asynchronously
          return "Encrypted message"; // Placeholder until properly implemented
        }
      } catch (error) {
        console.error("Error decrypting message:", error);
      }
    }
    
    // Fallback to original content or placeholder
    return message.isEncrypted ? "[Encrypted Message]" : message.content;
  };

  return (
    <ScrollableFeed>
      {messages &&
        messages.map((m, i) => (
          <div style={{ display: "flex" }} key={m._id}>
            {(isSameSender(messages, m, i, user._id) ||
              isLastMessage(messages, i, user._id)) && (
              <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                <Avatar
                  mt="7px"
                  mr={1}
                  size="sm"
                  cursor="pointer"
                  name={m.sender.name}
                  src={m.sender.pic}
                />
              </Tooltip>
            )}
            <Box
              style={{
                backgroundColor: `${
                  m.sender._id === user._id ? "#BEE3F8" : "#B9F5D0"
                }`,
                marginLeft: isSameSenderMargin(messages, m, i, user._id),
                marginTop: isSameUser(messages, m, i, user._id) ? 3 : 10,
                borderRadius: "20px",
                padding: "5px 15px",
                maxWidth: "75%",
                position: "relative",
              }}
            >
              {m.isEncrypted && (
                <Icon
                  as={LockIcon}
                  boxSize={3}
                  position="absolute"
                  top={2}
                  right={2}
                  color="gray.500"
                />
              )}
              {getMessageContent(m)}
            </Box>
          </div>
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;

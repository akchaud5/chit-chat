import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Avatar,
  Badge,
  IconButton,
  Divider,
  useToast,
  Flex,
  Spinner,
  Center,
  Tab,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";
import { PhoneIcon, CalendarIcon, TimeIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";
import axios from "axios";
import { getSender } from "../../config/ChatLogics";

const CallHistory = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, chats, setSelectedChat, setCallType } = ChatState();
  const toast = useToast();

  // Fetch call history on component mount
  useEffect(() => {
    fetchCallHistory();
  }, []);

  // Fetch call history from API
  const fetchCallHistory = async () => {
    try {
      const { data } = await axios.get("/api/call/history", {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      
      setCalls(data);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error fetching call history",
        description: error.response?.data?.message || "Something went wrong",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  // Format call date
  const formatCallDate = (date) => {
    const callDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (callDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (callDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return callDate.toLocaleDateString();
    }
  };

  // Format call time
  const formatCallTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Format call duration
  const formatCallDuration = (seconds) => {
    if (!seconds) return "0:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `0:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Get call status badge
  const getCallStatusBadge = (status) => {
    switch (status) {
      case "missed":
        return <Badge colorScheme="red">Missed</Badge>;
      case "answered":
        return <Badge colorScheme="green">Answered</Badge>;
      case "rejected":
        return <Badge colorScheme="red">Declined</Badge>;
      case "completed":
        return <Badge colorScheme="blue">Completed</Badge>;
      default:
        return <Badge colorScheme="gray">Unknown</Badge>;
    }
  };

  // Determine if user was the caller
  const isOutgoing = (call) => {
    return call.caller._id === user._id;
  };

  // Get other participant name
  const getParticipantName = (call) => {
    if (call.chat.isGroupChat) {
      return call.chat.chatName;
    } else {
      return isOutgoing(call) 
        ? getSender(user, call.chat.users)
        : call.caller.name;
    }
  };

  // Start a new call with the same contact
  const startNewCall = (call, callType) => {
    setSelectedChat(call.chat);
    setCallType(callType);
    // The SingleChat component will handle the actual call initiation
  };

  // Group calls by date
  const groupedCalls = calls.reduce((groups, call) => {
    const date = formatCallDate(call.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(call);
    return groups;
  }, {});

  // Filter calls by type
  const filterCallsByType = (type) => {
    return calls.filter(call => call.callType === type);
  };

  if (loading) {
    return (
      <Center h="100%">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (calls.length === 0) {
    return (
      <Center h="100%" flexDirection="column">
        <Box mb={4}>
          <PhoneIcon boxSize={10} color="gray.400" />
        </Box>
        <Text fontSize="lg" color="gray.500">
          No call history yet
        </Text>
      </Center>
    );
  }

  return (
    <Box p={4} h="100%" overflowY="auto">
      <Tabs isFitted variant="enclosed">
        <TabList mb={4}>
          <Tab>All</Tab>
          <Tab>Video</Tab>
          <Tab>Audio</Tab>
        </TabList>
        
        <TabPanels>
          {/* All Calls */}
          <TabPanel p={0}>
            <VStack spacing={0} align="stretch">
              {Object.entries(groupedCalls).map(([date, dateCalls]) => (
                <Box key={date} mb={4}>
                  <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={2} px={2}>
                    {date}
                  </Text>
                  
                  <VStack spacing={0} align="stretch" bg="white" borderRadius="md" boxShadow="sm">
                    {dateCalls.map((call, index) => (
                      <React.Fragment key={call._id}>
                        <Flex p={3} justify="space-between" align="center">
                          <HStack spacing={3}>
                            <Avatar size="sm" name={getParticipantName(call)} src={call.chat.pic} />
                            
                            <VStack spacing={0} align="flex-start">
                              <Text fontWeight="bold">{getParticipantName(call)}</Text>
                              <HStack spacing={1}>
                                {isOutgoing(call) ? (
                                  <Box as="span" transform="rotate(45deg)" display="inline-block">
                                    <PhoneIcon color="green.500" boxSize={3} />
                                  </Box>
                                ) : (
                                  <Box as="span" transform="rotate(225deg)" display="inline-block">
                                    <PhoneIcon color="blue.500" boxSize={3} />
                                  </Box>
                                )}
                                <Text fontSize="xs" color="gray.500">
                                  {formatCallTime(call.createdAt)}
                                </Text>
                                {call.duration > 0 && (
                                  <Text fontSize="xs" color="gray.500">
                                    • {formatCallDuration(call.duration)}
                                  </Text>
                                )}
                              </HStack>
                            </VStack>
                          </HStack>
                          
                          <HStack>
                            {getCallStatusBadge(call.status)}
                            <Box ml={2}>
                              {call.callType === "video" ? (
                                <IconButton
                                  icon={<PhoneIcon />}
                                  aria-label="Video Call"
                                  size="sm"
                                  colorScheme="teal"
                                  variant="outline"
                                  onClick={() => startNewCall(call, "video")}
                                />
                              ) : (
                                <IconButton
                                  icon={<PhoneIcon />}
                                  aria-label="Audio Call"
                                  size="sm"
                                  colorScheme="blue"
                                  variant="outline"
                                  onClick={() => startNewCall(call, "audio")}
                                />
                              )}
                            </Box>
                          </HStack>
                        </Flex>
                        {index < dateCalls.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </VStack>
                </Box>
              ))}
            </VStack>
          </TabPanel>
          
          {/* Video Calls */}
          <TabPanel p={0}>
            {filterCallsByType("video").length > 0 ? (
              <VStack spacing={0} align="stretch">
                {Object.entries(
                  filterCallsByType("video").reduce((groups, call) => {
                    const date = formatCallDate(call.createdAt);
                    if (!groups[date]) {
                      groups[date] = [];
                    }
                    groups[date].push(call);
                    return groups;
                  }, {})
                ).map(([date, dateCalls]) => (
                  <Box key={date} mb={4}>
                    <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={2} px={2}>
                      {date}
                    </Text>
                    
                    <VStack spacing={0} align="stretch" bg="white" borderRadius="md" boxShadow="sm">
                      {dateCalls.map((call, index) => (
                        <React.Fragment key={call._id}>
                          <Flex p={3} justify="space-between" align="center">
                            <HStack spacing={3}>
                              <Avatar size="sm" name={getParticipantName(call)} src={call.chat.pic} />
                              
                              <VStack spacing={0} align="flex-start">
                                <Text fontWeight="bold">{getParticipantName(call)}</Text>
                                <HStack spacing={1}>
                                  {isOutgoing(call) ? (
                                    <Box as="span" transform="rotate(45deg)" display="inline-block">
                                      <PhoneIcon color="green.500" boxSize={3} />
                                    </Box>
                                  ) : (
                                    <Box as="span" transform="rotate(225deg)" display="inline-block">
                                      <PhoneIcon color="blue.500" boxSize={3} />
                                    </Box>
                                  )}
                                  <Text fontSize="xs" color="gray.500">
                                    {formatCallTime(call.createdAt)}
                                  </Text>
                                  {call.duration > 0 && (
                                    <Text fontSize="xs" color="gray.500">
                                      • {formatCallDuration(call.duration)}
                                    </Text>
                                  )}
                                </HStack>
                              </VStack>
                            </HStack>
                            
                            <HStack>
                              {getCallStatusBadge(call.status)}
                              <Box ml={2}>
                                <IconButton
                                  icon={<PhoneIcon />}
                                  aria-label="Video Call"
                                  size="sm"
                                  colorScheme="teal"
                                  variant="outline"
                                  onClick={() => startNewCall(call, "video")}
                                />
                              </Box>
                            </HStack>
                          </Flex>
                          {index < dateCalls.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </VStack>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Center h="200px">
                <Text color="gray.500">No video calls</Text>
              </Center>
            )}
          </TabPanel>
          
          {/* Audio Calls */}
          <TabPanel p={0}>
            {filterCallsByType("audio").length > 0 ? (
              <VStack spacing={0} align="stretch">
                {Object.entries(
                  filterCallsByType("audio").reduce((groups, call) => {
                    const date = formatCallDate(call.createdAt);
                    if (!groups[date]) {
                      groups[date] = [];
                    }
                    groups[date].push(call);
                    return groups;
                  }, {})
                ).map(([date, dateCalls]) => (
                  <Box key={date} mb={4}>
                    <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={2} px={2}>
                      {date}
                    </Text>
                    
                    <VStack spacing={0} align="stretch" bg="white" borderRadius="md" boxShadow="sm">
                      {dateCalls.map((call, index) => (
                        <React.Fragment key={call._id}>
                          <Flex p={3} justify="space-between" align="center">
                            <HStack spacing={3}>
                              <Avatar size="sm" name={getParticipantName(call)} src={call.chat.pic} />
                              
                              <VStack spacing={0} align="flex-start">
                                <Text fontWeight="bold">{getParticipantName(call)}</Text>
                                <HStack spacing={1}>
                                  {isOutgoing(call) ? (
                                    <Box as="span" transform="rotate(45deg)" display="inline-block">
                                      <PhoneIcon color="green.500" boxSize={3} />
                                    </Box>
                                  ) : (
                                    <Box as="span" transform="rotate(225deg)" display="inline-block">
                                      <PhoneIcon color="blue.500" boxSize={3} />
                                    </Box>
                                  )}
                                  <Text fontSize="xs" color="gray.500">
                                    {formatCallTime(call.createdAt)}
                                  </Text>
                                  {call.duration > 0 && (
                                    <Text fontSize="xs" color="gray.500">
                                      • {formatCallDuration(call.duration)}
                                    </Text>
                                  )}
                                </HStack>
                              </VStack>
                            </HStack>
                            
                            <HStack>
                              {getCallStatusBadge(call.status)}
                              <Box ml={2}>
                                <IconButton
                                  icon={<PhoneIcon />}
                                  aria-label="Audio Call"
                                  size="sm"
                                  colorScheme="blue"
                                  variant="outline"
                                  onClick={() => startNewCall(call, "audio")}
                                />
                              </Box>
                            </HStack>
                          </Flex>
                          {index < dateCalls.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </VStack>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Center h="200px">
                <Text color="gray.500">No audio calls</Text>
              </Center>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default CallHistory;
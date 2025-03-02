const asyncHandler = require("express-async-handler");
const Call = require("../models/callModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const { generateEncryptionKey } = require("../config/encryption");

// Create a new call record
const createCall = asyncHandler(async (req, res) => {
  const { chatId, recipients, callType } = req.body;

  if (!chatId || !recipients || !callType) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  try {
    // Generate a unique encryption key for this call
    const encryptionKey = generateEncryptionKey();
    
    const newCall = await Call.create({
      chat: chatId,
      caller: req.user._id,
      recipients: recipients,
      callType: callType,
    });

    const fullCall = await Call.findOne({ _id: newCall._id })
      .populate("caller", "-password")
      .populate("recipients", "-password")
      .populate("chat");

    res.status(201).json({ 
      call: fullCall, 
      encryptionKey: encryptionKey 
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Update call status (answered, rejected, completed)
const updateCallStatus = asyncHandler(async (req, res) => {
  const { callId, status, endTime } = req.body;

  if (!callId || !status) {
    res.status(400);
    throw new Error("Please provide call ID and status");
  }

  try {
    const call = await Call.findById(callId);

    if (!call) {
      res.status(404);
      throw new Error("Call not found");
    }

    // Update status
    call.status = status;

    // If call completed, calculate duration
    if (status === "completed" && endTime) {
      call.endTime = endTime;
      const startTime = new Date(call.startTime).getTime();
      const endTimeMs = new Date(endTime).getTime();
      call.duration = Math.floor((endTimeMs - startTime) / 1000); // Duration in seconds
    }

    await call.save();

    const updatedCall = await Call.findById(callId)
      .populate("caller", "-password")
      .populate("recipients", "-password")
      .populate("chat");

    res.json(updatedCall);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Get call history for a user
const getCallHistory = asyncHandler(async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [
        { caller: req.user._id },
        { recipients: { $elemMatch: { $eq: req.user._id } } }
      ]
    })
      .populate("caller", "-password")
      .populate("recipients", "-password")
      .populate("chat")
      .sort({ createdAt: -1 });

    res.json(calls);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Get call history for specific chat
const getChatCallHistory = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  if (!chatId) {
    res.status(400);
    throw new Error("Please provide chat ID");
  }

  try {
    const calls = await Call.find({ chat: chatId })
      .populate("caller", "-password")
      .populate("recipients", "-password")
      .populate("chat")
      .sort({ createdAt: -1 });

    res.json(calls);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { createCall, updateCallStatus, getCallHistory, getChatCallHistory };
const mongoose = require("mongoose");

const callSchema = mongoose.Schema(
  {
    chat: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Chat" 
    },
    caller: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    recipients: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }],
    startTime: { 
      type: Date, 
      default: Date.now 
    },
    endTime: { 
      type: Date 
    },
    duration: { 
      type: Number 
    },
    status: { 
      type: String, 
      enum: ["missed", "answered", "rejected", "completed"],
      default: "missed"
    },
    callType: { 
      type: String, 
      enum: ["audio", "video"], 
      required: true 
    }
  },
  { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);
module.exports = Call;
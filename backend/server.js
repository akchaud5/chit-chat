const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const callRoutes = require("./routes/callRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const { encryptData, decryptData } = require("./config/encryption");

dotenv.config();
connectDB();
const app = express();

app.use(express.json()); // to accept json data

// app.get("/", (req, res) => {
//   res.send("API Running!");
// });

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/call", callRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    // credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  // Call signaling events
  socket.on("call:start", (callData) => {
    const { recipients, encryptedSignal, callId } = callData;
    
    // Emit to all recipients
    recipients.forEach((userId) => {
      socket.in(userId).emit("call:incoming", callData);
    });
  });

  socket.on("call:answer", (callData) => {
    const { caller, encryptedSignal, callId } = callData;
    socket.in(caller).emit("call:accepted", callData);
  });

  socket.on("call:ice-candidate", (iceData) => {
    const { recipient, candidate, callId } = iceData;
    socket.in(recipient).emit("call:ice-candidate", iceData);
  });

  socket.on("call:end", (callData) => {
    const { participants, callId } = callData;
    
    // Notify all participants that call has ended
    participants.forEach((userId) => {
      if (socket.id !== userId) {
        socket.in(userId).emit("call:ended", { callId });
      }
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});

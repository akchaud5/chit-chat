# Chit Chat - Secure Messaging Application

Chit Chat is a real-time messaging application with end-to-end encryption and voice/video calling features built using the MERN stack (MongoDB, Express, React, Node.js).

## Features

- **Secure Authentication**: User registration and login with JWT
- **End-to-End Encryption**: All messages are encrypted using RSA and AES encryption
- **Real-time Messaging**: Instant message delivery using Socket.io
- **One-on-One Chat**: Private conversations between users
- **Group Chat**: Create and manage group conversations
- **User Search**: Find other users by name or email
- **Voice/Video Calls**: Make secure calls to other users
- **Profile Management**: Update profile information and pictures
- **Message History**: Access previous conversations
- **Call History**: Track past calls

## Technologies Used

- **Frontend**: React, Chakra UI
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Real-time Communication**: Socket.io
- **Encryption**: Web Crypto API (frontend), crypto (backend)
- **Video Calling**: WebRTC with Simple-Peer
- **Authentication**: JWT (JSON Web Tokens)
- **Image Storage**: Cloudinary

## Running Locally

### Prerequisites

- Node.js and npm/yarn
- MongoDB (local instance or MongoDB Atlas)
- Docker (optional, for MongoDB containerization)

### Setup MongoDB

You can run MongoDB using Docker:

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Environment Variables

Create a `.env` file in the root directory with:

```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/chitchat
JWT_SECRET=yoursecretkey
```

### Installation and Running

1. Install backend dependencies:
   ```bash
   npm install
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Run backend server (development mode with nodemon):
   ```bash
   npm run server
   ```

4. Run frontend server (in a separate terminal):
   ```bash
   cd frontend
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## App Navigation Guide

### Authentication

1. **Registration**:
   - Navigate to the homepage
   - Click on "Sign Up" tab
   - Fill in your name, email, password, and optionally upload a profile picture
   - Click "Sign Up" button

2. **Login**:
   - Navigate to the homepage
   - Enter your email and password
   - Click "Login" button

### Main Interface

After logging in, you'll see the main chat interface with these components:

- **Top Navigation Bar**:
  - Search users button (magnifying glass icon)
  - App name "Chit Chat"
  - Notifications bell
  - Your profile dropdown menu

- **Left Sidebar**:
  - Shows your existing chats
  - "New Group Chat" button to create group conversations
  - List of one-on-one and group chats

- **Chat Area** (right side):
  - Messages display with timestamps
  - Typing indicator
  - Message input box at bottom
  - Call button for voice/video calls

### Using the App

1. **Finding Users**:
   - Click the search icon in the top navigation
   - Enter a name or email in the search box
   - Click on a search result to start a chat

2. **Starting a Chat**:
   - After selecting a user from search results, a new chat will open
   - Or click on an existing chat in the left sidebar

3. **Sending Messages**:
   - Type your message in the input box at the bottom of the chat area
   - Press Enter or click the send button

4. **Creating a Group Chat**:
   - Click "New Group Chat" in the sidebar
   - Search and select multiple users
   - Enter a group name
   - Click "Create Group"

5. **Making Calls**:
   - Open a chat with the user you want to call
   - Click the call button (phone icon)
   - Select call type (audio/video)
   - Use call controls to mute/unmute, toggle video, or end call

6. **Updating Profile**:
   - Click your profile icon in the top right
   - Select "My Profile" from the dropdown
   - Edit your information
   - Click "Update" to save changes

7. **Logging Out**:
   - Click your profile icon in the top right
   - Select "Logout" from the dropdown

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Passwords are hashed before storage
- **Message Encryption**:
  - RSA keys for securing initial connection
  - AES-GCM for encrypting message content
  - Keys are generated in the browser and never sent to the server unencrypted

## Troubleshooting

- **Connection Issues**: Ensure MongoDB is running and accessible
- **WebRTC/Call Problems**: Allow camera and microphone permissions in your browser
- **Encryption Errors**: Modern browser with Web Crypto API support is required

## License

ISC License - See LICENSE file for details

## Author

Ayush Chaudhary
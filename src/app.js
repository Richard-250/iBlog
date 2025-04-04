import express from "express";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import cookieParser from "cookie-parser";
import { mongoManager } from "./config/dbConfig.js";
// import seedStudents from "./seeders/student.seeder.js";
import allRouters from "./routes/index.js"
import http from 'http';
import { initializeSocketServer } from "./service/notificationService.js";

const app = express();

const server = http.createServer(app);

const io = initializeSocketServer(server);

app.use(cors());

(async () => {
  try {
    await mongoManager.connect();
    // seedStudents()
    console.log('MongoDB connection successful!');
  } catch (error) {
    console.error('Error:', error);
  }
})();

app.use(cookieParser(process.env.COOKIES_SECRET))
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());


app.use(allRouters);


app.get('/api/test-notification', (req, res) => {

  const {
    room = 'global',
    message = 'Test notification',
    type = 'test',
  } = req.query;

  const notificationData = {
    type,
    title: 'Test Notification',
    message,
    timestamp: new Date(),
    id: Date.now().toString()
  };

  // Send via Socket.io
  io.to(room).emit('notification', notificationData);

  res.status(200).json({ 
    success: true, 
    message: `Notification sent to room: ${room}`,
    notification: notificationData
  });

  // const testRoomId = req.query.room || 'global';
  // const message = req.query.message || 'Test notification';
  
  // io.to(testRoomId).emit('notification', {
  //   type: 'test',
  //   title: 'Test Notification',
  //   message: message,
  //   timestamp: new Date(),
  //   id: Date.now().toString()
  // });
  
  // res.status(200).json({ 
  //   success: true, 
  //   message: `Test notification sent to room: ${testRoomId}` 
  // });
});


app.get('/api/socket-status', (req, res) => {
  try {
    const sockets = Array.from(io.sockets.sockets).map(([id, socket]) => ({
      id,
      rooms: Array.from(socket.rooms)
    }));
    
    const rooms = io.sockets.adapter.rooms;
    const roomsInfo = {};
    
    for (const [room, clients] of rooms) {
      // Skip socket IDs as rooms (Socket.io adds socket ID as a room automatically)
      if (!room.includes('-')) continue;
      
      roomsInfo[room] = {
        numClients: clients.size,
        clients: Array.from(clients)
      };
    }
    
    res.status(200).json({
      activeConnections: io.engine.clientsCount,
      sockets,
      rooms: roomsInfo
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get socket status',
      message: error.message
    });
  }
});


export { app, server }
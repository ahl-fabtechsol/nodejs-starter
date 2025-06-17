import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { promisify } from "util";

const User = mongoose.model("User");

function convertToIdString(id) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return id.toString();
  } else {
    return id;
  }
}

class ActiveUserManager {
  constructor() {
    this.activeUsers = new Map();
  }

  addUser(userId, socketId) {
    if (!this.activeUsers.has(userId)) {
      this.activeUsers.set(userId, [socketId]);
    } else {
      const userSockets = this.activeUsers.get(userId);
      userSockets.push(socketId);
      this.activeUsers.set(userId, userSockets);
    }
    return Array.from(this.activeUsers.keys());
  }

  removeUser(socketId) {
    for (const [userId, sockets] of this.activeUsers.entries()) {
      const remaining = sockets.filter((id) => id !== socketId);
      if (remaining.length > 0) {
        this.activeUsers.set(userId, remaining);
      } else {
        this.activeUsers.delete(userId);
      }
    }
    return Array.from(this.activeUsers.keys());
  }

  getUserSockets(userId) {
    return this.activeUsers.get(userId);
  }

  getActiveUsers() {
    return Array.from(this.activeUsers.keys());
  }
}

const authMiddleWareSocket = async (socket, next) => {
  try {
    const authorization = socket.handshake.auth.token;
    if (!authorization) return next(new Error("You must be logged in"));

    const token = authorization.split(" ")[1];
    if (!token) return next(new Error("You must be logged in"));

    const decoded = await promisify(jwt.verify)(
      token,
      process.env.ACCESS_SECRET
    );
    const currentUser = await User.findById(decoded.id).select("-password");
    if (!currentUser) return next(new Error("User no longer exists"));

    socket.user = currentUser;
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    next(new Error(err.message || "Authentication error"));
  }
};

export class SocketManager {
  constructor(httpServer) {
    this.io = new Server(httpServer, { cors: { origin: "*" } });
    this.io.use(authMiddleWareSocket);
    this.activeUserManager = new ActiveUserManager();
    this.initializeSocketEvents();
  }

  async emitActiveUsers() {
    const userIds = this.activeUserManager.getActiveUsers();
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds } }).select("_id ");
      this.io.emit("get-users", users);
    } else {
      this.io.emit("get-users", []);
    }
  }

  initializeSocketEvents() {
    this.io.on("connection", (socket) => {
      const user = socket.user;
      const userId = convertToIdString(user._id);
      console.log("User connected:", user.email || userId);

      this.activeUserManager.addUser(userId, socket.id);

      this.emitActiveUsers();

      socket.on("disconnect", () => {
        console.log("User disconnected:", user.email || userId);

        this.activeUserManager.removeUser(socket.id);

        this.emitActiveUsers();
      });
    });
  }

  fireEvent(event, userId, data) {
    const sockets = this.activeUserManager.getUserSockets(
      convertToIdString(userId)
    );
    if (sockets) {
      sockets.forEach((sid) => this.io.to(sid).emit(event, data));
    }
  }
}

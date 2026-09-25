/**
 * Presence service to track connected users and their active rooms
 */
class PresenceService {
  constructor() {
    // userId -> Set of socketIds
    this.onlineUsers = new Map();
    // userId -> Date
    this.lastSeen = new Map();
    // socketId -> userId
    this.socketToUser = new Map();
  }

  setOnline(userId, socketId) {
    if (!userId || !socketId) return;
    const strUserId = String(userId);

    if (!this.onlineUsers.has(strUserId)) {
      this.onlineUsers.set(strUserId, new Set());
    }
    this.onlineUsers.get(strUserId).add(socketId);
    this.socketToUser.set(socketId, strUserId);
    this.lastSeen.set(strUserId, new Date());
  }

  setOffline(socketId) {
    if (!socketId) return null;
    const strUserId = this.socketToUser.get(socketId);
    this.socketToUser.delete(socketId);

    if (strUserId && this.onlineUsers.has(strUserId)) {
      const userSockets = this.onlineUsers.get(strUserId);
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.onlineUsers.delete(strUserId);
        this.lastSeen.set(strUserId, new Date());
        return { userId: strUserId, isOnline: false, lastSeen: this.lastSeen.get(strUserId) };
      }
    }
    return null;
  }

  isOnline(userId) {
    if (!userId) return false;
    const strUserId = String(userId);
    return this.onlineUsers.has(strUserId) && this.onlineUsers.get(strUserId).size > 0;
  }

  getLastSeen(userId) {
    if (!userId) return null;
    return this.lastSeen.get(String(userId)) || null;
  }

  getUserSockets(userId) {
    if (!userId) return [];
    const sockets = this.onlineUsers.get(String(userId));
    return sockets ? Array.from(sockets) : [];
  }
}

module.exports = new PresenceService();

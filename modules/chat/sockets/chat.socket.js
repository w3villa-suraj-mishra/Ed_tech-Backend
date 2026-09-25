const SOCKET_EVENTS = require('../constants/socketEvents');
const messageService = require('../services/message.service');
const conversationService = require('../services/conversation.service');
const assignmentService = require('../services/assignment.service');
const presenceService = require('../services/presence.service');
const User = require('../../../models/User');
const logger = require('../../../utils/logger');

function registerChatSocketHandlers(io, socket) {
  const user = socket.user;
  const userId = user?.id || user?.user_id || user?.userId;

  if (userId) {
    presenceService.setOnline(userId, socket.id);
    io.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId,
      isOnline: true
    });
  }

  // Join a specific conversation room
  socket.on(SOCKET_EVENTS.CONVERSATION_JOIN, async ({ conversationId }) => {
    if (!conversationId) return;
    try {
      const room = `conversation:${conversationId}`;
      socket.join(room);

      // Notify other room participants about current user presence
      socket.to(room).emit(SOCKET_EVENTS.USER_ONLINE, {
        userId,
        conversationId,
        isOnline: true
      });
    } catch (err) {
      logger.error('Socket join conversation error:', err.message);
    }
  });

  // Leave a specific conversation room
  socket.on(SOCKET_EVENTS.CONVERSATION_LEAVE, ({ conversationId }) => {
    if (!conversationId) return;
    const room = `conversation:${conversationId}`;
    socket.leave(room);
  });

  // Send real-time message
  socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (data, ack) => {
    try {
      if (!userId) {
        if (typeof ack === 'function') ack({ success: false, error: 'Unauthenticated socket' });
        return;
      }

      const fullUser = await User.findByPk(userId);
      if (!fullUser) {
        if (typeof ack === 'function') ack({ success: false, error: 'User not found' });
        return;
      }

      const {
        conversationId,
        content,
        messageType,
        attachmentUrl,
        attachmentName,
        attachmentSize,
        attachmentMime,
        clientMessageId
      } = data;

      const message = await messageService.sendMessage({
        conversationId,
        senderUser: fullUser,
        content,
        messageType,
        attachmentUrl,
        attachmentName,
        attachmentSize,
        attachmentMime,
        clientMessageId
      });

      const convRoom = `conversation:${conversationId}`;

      // Emit to conversation room (including sender if they're in the room)
      io.to(convRoom).emit(SOCKET_EVENTS.MESSAGE_NEW, {
        conversationId,
        message
      });

      // Also emit to all staff and user personal rooms for real-time list badge updates
      const conv = await conversationService.getConversationDetails(conversationId, fullUser);
      if (conv.userId) {
        io.to(`user:${conv.userId}`).emit(SOCKET_EVENTS.UNREAD_UPDATE, {
          conversationId,
          lastMessage: message
        });
      }
      if (conv.assignedTo) {
        io.to(`user:${conv.assignedTo}`).emit(SOCKET_EVENTS.UNREAD_UPDATE, {
          conversationId,
          lastMessage: message
        });
      }
      // Broadcast to all staff/admin members
      io.to('staff').emit(SOCKET_EVENTS.UNREAD_UPDATE, {
        conversationId,
        lastMessage: message
      });
      io.to('staff').emit(SOCKET_EVENTS.MESSAGE_NEW, {
        conversationId,
        message
      });

      if (typeof ack === 'function') {
        ack({ success: true, message });
      }
    } catch (err) {
      logger.error('Socket message:send error:', err.message);
      if (typeof ack === 'function') {
        ack({ success: false, error: err.message });
      }
    }
  });

  // Typing start
  socket.on(SOCKET_EVENTS.TYPING_START, ({ conversationId, userName }) => {
    if (!conversationId) return;
    socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_START, {
      conversationId,
      userId,
      userName: userName || user?.name || 'Someone'
    });
  });

  // Typing stop
  socket.on(SOCKET_EVENTS.TYPING_STOP, ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_STOP, {
      conversationId,
      userId
    });
  });

  // Mark message as read
  socket.on(SOCKET_EVENTS.MESSAGE_READ, async ({ conversationId }) => {
    try {
      if (!conversationId || !userId) return;
      const fullUser = await User.findByPk(userId);
      if (!fullUser) return;

      await messageService.markAsRead(conversationId, fullUser);

      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ, {
        conversationId,
        readerId: userId,
        readAt: new Date()
      });
    } catch (err) {
      logger.error('Socket message:read error:', err.message);
    }
  });

  // Status update
  socket.on(SOCKET_EVENTS.CONVERSATION_STATUS, async ({ conversationId, status }) => {
    try {
      if (!conversationId || !userId) return;
      const fullUser = await User.findByPk(userId);
      if (!fullUser || (fullUser.accountType !== 'Admin' && fullUser.accountType !== 'Superadmin')) return;

      const result = await conversationService.updateStatus(conversationId, status, fullUser);

      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_STATUS, {
        conversationId,
        status: result.conversation.status,
        systemMessage: result.systemMessage
      });
      io.to('staff').emit(SOCKET_EVENTS.CONVERSATION_STATUS, {
        conversationId,
        status: result.conversation.status,
        systemMessage: result.systemMessage
      });
    } catch (err) {
      logger.error('Socket conversation:status error:', err.message);
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    const offlineInfo = presenceService.setOffline(socket.id);
    if (offlineInfo) {
      io.emit(SOCKET_EVENTS.USER_OFFLINE, offlineInfo);
    }
  });
}

module.exports = {
  registerChatSocketHandlers
};

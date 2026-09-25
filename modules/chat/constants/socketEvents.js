const SOCKET_EVENTS = {
  // Connection / Room events
  CONVERSATION_CREATE: 'conversation:create',
  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',

  // Messaging events
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',

  // Typing indicators
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Lifecycle & Assignment
  CONVERSATION_ASSIGN: 'conversation:assign',
  CONVERSATION_STATUS: 'conversation:status',

  // Presence & Unread
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  UNREAD_UPDATE: 'chat:unread_update'
};

module.exports = SOCKET_EVENTS;

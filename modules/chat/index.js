const chatRoutes = require('./routes/chat.routes');
const { registerChatSocketHandlers } = require('./sockets/chat.socket');
const { Conversation, Message } = require('./models');

module.exports = {
  chatRoutes,
  registerChatSocketHandlers,
  Conversation,
  Message
};

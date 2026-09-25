const Conversation = require('./Conversation');
const Message = require('./Message');
const User = require('../../../models/User');
const Course = require('../../../models/Course');

// Define associations
Conversation.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Conversation.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
Conversation.belongsTo(Course, { as: 'course', foreignKey: 'courseId' });
Conversation.hasMany(Message, { as: 'messages', foreignKey: 'conversationId', onDelete: 'CASCADE' });

Message.belongsTo(Conversation, { as: 'conversation', foreignKey: 'conversationId' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });

module.exports = {
  Conversation,
  Message
};

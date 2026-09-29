const { LiveSession, LiveChatMessage, User } = require('../models');

/**
 * Live Sessions & Chat Native Queries Layer
 */

const findActiveLiveSessionQuery = async (courseId) => {
  return await LiveSession.findOne({
    where: { courseId, status: 'active' },
    order: [['createdAt', 'DESC']]
  });
};

const createLiveSessionQuery = async (sessionData) => {
  return await LiveSession.create(sessionData);
};

const findLiveSessionMessagesQuery = async (sessionId) => {
  return await LiveChatMessage.findAll({
    where: { liveSessionId: sessionId },
    include: [
      {
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'image', 'accountType']
      }
    ],
    order: [['createdAt', 'ASC']]
  });
};

const createLiveChatMessageQuery = async (messageData) => {
  const msg = await LiveChatMessage.create(messageData);
  return await LiveChatMessage.findByPk(msg.id, {
    include: [
      {
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'image', 'accountType']
      }
    ]
  });
};

module.exports = {
  findActiveLiveSessionQuery,
  createLiveSessionQuery,
  findLiveSessionMessagesQuery,
  createLiveChatMessageQuery
};

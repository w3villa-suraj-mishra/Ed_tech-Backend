const conversationRepository = require('../repositories/conversation.repository');
const messageRepository = require('../repositories/message.repository');
const notificationService = require('./notification.service');
const User = require('../../../models/User');
const { CONVERSATION_STATUS, SENDER_TYPES, MESSAGE_TYPES } = require('../constants/chatConstants');

class AssignmentService {
  async assignConversation({ conversationId, assignedToId, assignedByUser }) {
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    let targetAdmin = null;
    let newStatus = conversation.status;

    if (assignedToId) {
      targetAdmin = await User.findByPk(assignedToId);
      if (!targetAdmin) {
        throw new Error('Target admin user not found');
      }
      if (targetAdmin.accountType !== 'Admin' && targetAdmin.accountType !== 'Superadmin') {
        throw new Error('User must be an Admin or Superadmin to be assigned');
      }

      if (conversation.status === CONVERSATION_STATUS.UNASSIGNED) {
        newStatus = CONVERSATION_STATUS.OPEN;
      }
    } else {
      // Unassigning
      newStatus = CONVERSATION_STATUS.UNASSIGNED;
    }

    const updated = await conversationRepository.update(conversationId, {
      assignedTo: assignedToId || null,
      assignedRole: targetAdmin ? targetAdmin.accountType : null,
      status: newStatus
    });

    // Create a SYSTEM message documenting the assignment
    const assignerName = `${assignedByUser.firstName || ''} ${assignedByUser.lastName || ''}`.trim() || 'Admin';
    const targetName = targetAdmin ? `${targetAdmin.firstName || ''} ${targetAdmin.lastName || ''}`.trim() : 'Nobody';

    const systemContent = assignedToId
      ? `Conversation assigned to ${targetName} by ${assignerName}`
      : `Conversation unassigned by ${assignerName}`;

    const systemMessage = await messageRepository.create({
      conversationId,
      senderId: null,
      senderType: SENDER_TYPES.SYSTEM,
      messageType: MESSAGE_TYPES.SYSTEM,
      content: systemContent
    });

    // Notify the assigned admin
    if (targetAdmin && targetAdmin.id !== assignedByUser.id) {
      const studentName = conversation.user
        ? `${conversation.user.firstName} ${conversation.user.lastName}`
        : 'Student';
      await notificationService.notifyAssignment({
        adminId: targetAdmin.id,
        assignedByName: assignerName,
        conversationId,
        studentName
      });
    }

    return {
      conversation: updated,
      systemMessage
    };
  }
}

module.exports = new AssignmentService();

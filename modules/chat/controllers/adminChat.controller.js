const conversationService = require('../services/conversation.service');
const assignmentService = require('../services/assignment.service');
const logger = require('../../../utils/logger');

class AdminChatController {
  async getAdminConversations(req, res) {
    try {
      const adminUser = req.user || req.admin;
      const data = await conversationService.getAdminConversations(req.query, adminUser);
      return res.status(200).json({
        success: true,
        ...data
      });
    } catch (err) {
      logger.error('getAdminConversations error:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'Error fetching admin conversations'
      });
    }
  }

  async assignConversation(req, res) {
    try {
      const conversationId = parseInt(req.params.conversationId, 10);
      const { assignedTo } = req.body;
      const adminUser = req.user || req.admin;

      // Only Superadmin can reassign any conversation, or Admin can assign unassigned to themselves
      const isSuperAdmin = String(adminUser?.accountType || '').toLowerCase() === 'superadmin';
      if (!isSuperAdmin && assignedTo && assignedTo !== adminUser?.id) {
        return res.status(403).json({
          success: false,
          message: 'Only Superadmin can assign conversations to other staff members'
        });
      }

      const result = await assignmentService.assignConversation({
        conversationId,
        assignedToId: assignedTo ? parseInt(assignedTo, 10) : null,
        assignedByUser: adminUser
      });

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (err) {
      logger.error('assignConversation error:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'Error assigning conversation'
      });
    }
  }

  async updateStatus(req, res) {
    try {
      const conversationId = parseInt(req.params.conversationId, 10);
      const { status } = req.body;
      const adminUser = req.user || req.admin;

      const result = await conversationService.updateStatus(conversationId, status, adminUser);

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (err) {
      logger.error('updateStatus error:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'Error updating status'
      });
    }
  }

  async getAdminsList(req, res) {
    try {
      const admins = await conversationService.getAdminsList();
      return res.status(200).json({
        success: true,
        admins
      });
    } catch (err) {
      logger.error('getAdminsList error:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'Error fetching admin users'
      });
    }
  }
}

module.exports = new AdminChatController();

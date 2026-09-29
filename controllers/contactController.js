const { contactQuery } = require('../nativequery');
const mailService = require('../services/mailService');
const logger = require('../utils/logger');

const contactController = {
  submitContactForm: async (req, res) => {
    try {
      const { email, firstName, lastName, message, phoneNo, countryCode } = req.body;

      if (!email || !firstName || !message) {
        return res.status(400).json({
          success: false,
          message: 'Please fill out all required fields'
        });
      }

      const submission = await contactQuery.createContactSubmissionQuery({
        email,
        firstName,
        lastName: lastName || '',
        message,
        phoneNo: phoneNo || '',
        countryCode: countryCode || ''
      });

      // Send email notifications
      try {
        await mailService.sendMail({
          to: email,
          subject: 'We received your message',
          html: `<p>Hi ${firstName},</p><p>Thank you for reaching out to us. We have received your message and will get back to you shortly.</p>`
        });
      } catch (mailError) {
        logger.error('CONTACT CONFIRMATION EMAIL FAILED:', mailError.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Your message has been received successfully',
        data: submission
      });
    } catch (error) {
      logger.error('CONTACT FORM SUBMISSION FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  contact: function(req, res) {
    return this.submitContactForm(req, res);
  }
};

module.exports = contactController;

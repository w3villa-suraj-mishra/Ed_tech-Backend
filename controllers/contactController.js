const logger = require('../utils/logger');
const mailService = require('../services/mailService');
const { ContactUs } = require('../models');

const contact = async (req, res) => {
  try {
    const { firstName, lastname, firstname, lastName, email, message, phoneNo, countrycode } = req.body;

    const fn = firstName || firstname || req.body.name || 'User';
    const ln = lastName || lastname || '';
    const emailField = email || req.body.senderEmail || '';
    const messageField = message || req.body.body || '';

    if (!emailField || !messageField) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and message are required' 
      });
    }

    // Save to Database so Admin can view it
    const submission = await ContactUs.create({
      firstName: String(fn).trim(),
      lastName: String(ln).trim(),
      email: String(emailField).trim(),
      phoneNo: phoneNo ? String(phoneNo).trim() : null,
      countrycode: countrycode ? String(countrycode).trim() : null,
      message: String(messageField).trim(),
      status: 'Pending'
    });

    // Send contact form emails (to user and admin)
    try {
      await mailService.sendContactFormEmail(emailField, {
        firstName: fn,
        lastName: ln,
        message: messageField,
        userEmail: emailField
      });
    } catch (mailErr) {
      logger.error('CONTACT EMAIL FAILED (non-fatal):', mailErr.message);
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Thank you for contacting us. We will get back to you soon.',
      data: submission
    });
  } catch (error) {
    logger.error('CONTACT FORM FAILED:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { contact };

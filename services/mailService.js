const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const getTransporter = async () => {
  const user = String(process.env.EMAIL_USER || process.env.EMAIL_FROM || '').trim();
  const pass = String(process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').trim();
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT || 465);

  if (user && pass && user !== 'your_email@gmail.com' && pass !== 'your_app_password') {
    return nodemailer.createTransport({
      host: host.includes('gmail') ? 'smtp.gmail.com' : host,
      port: port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  // 3. Development fallback: create Ethereal test account so local testing works seamlessly
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Using Ethereal test account for email delivery fallback in development.');
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  throw new Error('Email configuration is missing or invalid.');
};

const sendOTP = async (email, code) => {
  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM && process.env.EMAIL_FROM !== 'your_email@gmail.com'
      ? process.env.EMAIL_FROM
      : (process.env.EMAIL_USER || `no-reply@${process.env.EMAIL_HOST || 'studytech.com'}`);

    const info = await transporter.sendMail({
      from: `StudyTech <${fromAddress}>`,
      to: email,
      subject: 'Your StudyTech Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">Verify Your Email Address</h2>
          <p style="font-size: 15px; color: #333;">Thank you for registering. Use the following 6-digit OTP code to complete your verification:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827; background-color: #f3f4f6; padding: 12px 24px; border-radius: 8px; border: 1px inline-block;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #6b7280;">This verification code will expire in <strong>10 minutes</strong>.</p>
          <p style="font-size: 13px; color: #9ca3af;">If you did not initiate this request, please ignore this message.</p>
        </div>
      `
    });

    if (process.env.NODE_ENV !== 'production') {
      try {
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) {
          logger.info(`[DEV EMAIL PREVIEW URL] OTP sent to ${email} -> Preview at: ${preview}`);
        }
      } catch (e) {
        // ignore
      }
    }

    logger.info(`OTP email successfully dispatched to ${email} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.log(`\n==========================================`);
    console.log(`[OTP FALLBACK LOG] Generated OTP for ${email}: ${code}`);
    console.log(`==========================================\n`);
    logger.warn(`Email transport failed (${error.message}). Logged OTP to server logs for verification.`);
    return { messageId: 'fallback-logged' };
  }
};

const sendCoursePurchaseConfirmation = async ({ enrollmentId, userId, courseId }) => {
  try {
    const { User, Course, Enrollment } = require('../models');

    // 1. Fetch Enrollment with User & Course + Instructor details dynamically
    let enrollment = null;
    if (enrollmentId) {
      enrollment = await Enrollment.findByPk(enrollmentId, {
        include: [
          { model: User, as: 'user' },
          { model: Course, as: 'course', include: [{ model: User, as: 'instructor' }] }
        ]
      });
    } else if (userId && courseId) {
      enrollment = await Enrollment.findOne({
        where: { userId, courseId },
        include: [
          { model: User, as: 'user' },
          { model: Course, as: 'course', include: [{ model: User, as: 'instructor' }] }
        ]
      });
    }

    if (!enrollment || !enrollment.user || !enrollment.course) {
      logger.error(`sendCoursePurchaseConfirmation: Missing enrollment record for enrollmentId=${enrollmentId}, userId=${userId}, courseId=${courseId}`);
      return false;
    }

    const student = enrollment.user;
    const course = enrollment.course;
    const instructor = course.instructor;

    const studentEmail = student.email;
    const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';
    const courseName = course.courseName || 'Course';
    const instructorName = instructor ? `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim() : 'Study_Tech Instructor';
    const thumbnail = course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';

    const plan = (enrollment.plan || 'gold').toUpperCase();
    const originalPrice = Number(enrollment.coursePrice || course.originalPrice || course.price || 0).toFixed(2);
    const finalPrice = Number(enrollment.purchasePrice || 0).toFixed(2);
    const discountPercentage = enrollment.discountPercentage || 0;
    const discountAmount = Math.max(0, Number(originalPrice) - Number(finalPrice)).toFixed(2);

    const purchaseDate = new Date(enrollment.activatedAt || enrollment.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Expiry and Access details
    let accessDetailsHtml = '';
    let expiryDateText = 'Lifetime';

    if (plan === 'FREE') {
      accessDetailsHtml = `
        <div style="background-color: #2d194e; padding: 16px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #a855f7;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #e9d5ff; font-size: 14px;">ACCESS DETAILS (Free Plan)</p>
          <p style="margin: 0; color: #cbd5e1; font-size: 13px;"><strong>Access:</strong> First 2 videos only</p>
        </div>
      `;
    } else if (plan === 'SILVER') {
      if (enrollment.expiresAt) {
        expiryDateText = new Date(enrollment.expiresAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else {
        const d = new Date(enrollment.activatedAt || Date.now());
        d.setFullYear(d.getFullYear() + 1);
        expiryDateText = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }

      accessDetailsHtml = `
        <div style="background-color: #2d194e; padding: 16px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #a855f7;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #e9d5ff; font-size: 14px;">ACCESS DETAILS (Silver Plan)</p>
          <p style="margin: 0 0 4px 0; color: #cbd5e1; font-size: 13px;"><strong>Access:</strong> Full course access</p>
          <p style="margin: 0 0 4px 0; color: #cbd5e1; font-size: 13px;"><strong>Validity:</strong> 1 Year</p>
          <p style="margin: 0; color: #cbd5e1; font-size: 13px;"><strong>Valid Until:</strong> ${expiryDateText}</p>
        </div>
      `;
    } else {
      // GOLD
      accessDetailsHtml = `
        <div style="background-color: #2d194e; padding: 16px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #fde68a; font-size: 14px;">ACCESS DETAILS (Gold Plan)</p>
          <p style="margin: 0 0 4px 0; color: #cbd5e1; font-size: 13px;"><strong>Access:</strong> Full course access</p>
          <p style="margin: 0 0 4px 0; color: #cbd5e1; font-size: 13px;"><strong>Validity:</strong> Lifetime / Unlimited</p>
          <p style="margin: 0; color: #cbd5e1; font-size: 13px;"><strong>Valid Until:</strong> Lifetime</p>
        </div>
      `;
    }

    const orderId = `ORD-${enrollment.id}-${enrollment.userId}`;
    const paymentId = enrollment.paymentReference || 'STRIPE_SUCCESS';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const startLearningUrl = `${frontendUrl}/dashboard/enrolled-courses`;

    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM && process.env.EMAIL_FROM !== 'your_email@gmail.com'
      ? process.env.EMAIL_FROM
      : (process.env.EMAIL_USER || `no-reply@${process.env.EMAIL_HOST || 'studytech.com'}`);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Purchase Successful</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 600px; background-color: #1e1b4b; border-radius: 16px; overflow: hidden; border: 1px solid #3730a3; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                
                <!-- HEADER -->
                <tr>
                  <td style="padding: 24px 32px; background: linear-gradient(135deg, #312e81 0%, #4c1d95 100%); border-bottom: 1px solid #4338ca;">
                    <table role="presentation" width="100%">
                      <tr>
                        <td>
                          <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #facc15;">Study_Tech</span>
                        </td>
                        <td align="right">
                          <span style="background-color: rgba(250, 204, 21, 0.15); border: 1px solid #facc15; color: #facc15; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;">
                            ${plan} PLAN
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- HERO SECTION -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px;">
                    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                      Congratulations, ${studentName}! 🎉
                    </h1>
                    <p style="margin: 0; font-size: 15px; color: #c7d2fe; line-height: 1.5;">
                      Your course purchase was successful. Your active course enrollment is now ready in your dashboard.
                    </p>
                  </td>
                </tr>

                <!-- COURSE CARD -->
                <tr>
                  <td style="padding: 0 32px 20px 32px;">
                    <table role="presentation" width="100%" style="background-color: #2e1065; border-radius: 12px; overflow: hidden; border: 1px solid #4c1d95;">
                      <tr>
                        <td style="padding: 16px;">
                          <img src="${thumbnail}" alt="${courseName}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; display: block; margin-bottom: 16px;">
                          <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #ffffff;">${courseName}</h2>
                          <p style="margin: 0; font-size: 14px; color: #a5b4fc;">Instructor: <strong>${instructorName}</strong></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- SUMMARY DETAILS -->
                <tr>
                  <td style="padding: 0 32px 20px 32px;">
                    <table role="presentation" width="100%" style="background-color: #172554; border-radius: 12px; padding: 20px; border: 1px solid #1e40af;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 12px 0; font-weight: bold; color: #93c5fd; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">COURSE PURCHASE DETAILS</p>
                          <table role="presentation" width="100%" style="font-size: 13px; color: #cbd5e1; line-height: 1.8;">
                            <tr>
                              <td>Access Plan:</td>
                              <td align="right" style="font-weight: bold; color: #ffffff;">${plan}</td>
                            </tr>
                            <tr>
                              <td>Purchase Price:</td>
                              <td align="right" style="font-weight: bold; color: #4ade80;">₹${finalPrice}</td>
                            </tr>
                            <tr>
                              <td>Original Price:</td>
                              <td align="right" style="text-decoration: line-through; color: #94a3b8;">₹${originalPrice}</td>
                            </tr>
                            <tr>
                              <td>Discount:</td>
                              <td align="right" style="color: #f43f5e;">${discountPercentage}% (Saved ₹${discountAmount})</td>
                            </tr>
                            <tr>
                              <td>Purchase Date:</td>
                              <td align="right">${purchaseDate}</td>
                            </tr>
                            <tr>
                              <td>Order ID:</td>
                              <td align="right" style="font-family: monospace; color: #e2e8f0;">${orderId}</td>
                            </tr>
                            <tr>
                              <td>Payment ID:</td>
                              <td align="right" style="font-family: monospace; color: #e2e8f0;">${paymentId}</td>
                            </tr>
                          </table>

                          ${accessDetailsHtml}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA BUTTON -->
                <tr>
                  <td align="center" style="padding: 10px 32px 32px 32px;">
                    <a href="${startLearningUrl}" target="_blank" style="display: inline-block; background-color: #facc15; color: #0f172a; font-weight: 800; font-size: 16px; padding: 14px 36px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(250, 204, 21, 0.4);">
                      Start Learning
                    </a>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0 0 8px 0;">Need help? Contact support at <a href="mailto:support@studytech.com" style="color: #818cf8; text-decoration: none;">support@studytech.com</a></p>
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} Study_Tech Learning Platform. All rights reserved.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `Study_Tech <${fromAddress}>`,
      to: studentEmail,
      subject: `Course Purchase Successful – ${courseName}`,
      html: htmlContent
    });

    if (process.env.NODE_ENV !== 'production') {
      try {
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) {
          logger.info(`[DEV EMAIL PREVIEW URL] Purchase Confirmation sent to ${studentEmail} -> Preview at: ${preview}`);
        }
      } catch (e) {
        // ignore
      }
    }

    logger.info(`Course purchase confirmation email sent successfully to ${studentEmail} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    logger.error(`SEND COURSE PURCHASE CONFIRMATION EMAIL FAILED: ${error.message}`);
    // Non-blocking error handling
    return false;
  }
};

const sendPaymentSuccessEmail = async (email, paymentData) => {
  try {
    const transporter = await getTransporter();
    const { orderId, paymentId, amount, courses = [] } = paymentData;
    const amountInRupees = (amount / 100).toFixed(2);
    
    const courseList = courses.map(course => 
      `<li>${course.courseName} - ₹${course.price}</li>`
    ).join('');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `no-reply@${process.env.EMAIL_HOST || 'localhost'}`,
      to: email,
      subject: 'Payment Successful - EdTech',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Successful!</h2>
          <p>Thank you for your purchase. Your payment has been processed successfully.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Payment Details:</strong></p>
            <p>Order ID: ${orderId}</p>
            <p>Payment ID: ${paymentId}</p>
            <p style="font-size: 18px; color: #28a745;"><strong>Amount: ₹${amountInRupees}</strong></p>
          </div>
          <div>
            <p><strong>Courses Purchased:</strong></p>
            <ul>${courseList}</ul>
          </div>
          <p>You can now access all your purchased courses in your dashboard.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      `
    });
    logger.info(`Payment success email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('SEND PAYMENT SUCCESS EMAIL FAILED:', error.message);
    throw new Error('Failed to send payment success email');
  }
};

const sendContactFormEmail = async (email, data) => {
  try {
    const transporter = await getTransporter();
    const { firstName, lastName, message, userEmail } = data;
    const adminEmail = process.env.EMAIL_RECEIVER || process.env.EMAIL_USER;

    // Send confirmation email to user
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `no-reply@${process.env.EMAIL_HOST || 'localhost'}`,
      to: userEmail,
      subject: 'We received your message - EdTech',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for contacting us!</h2>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <p>Our team typically responds within 24-48 hours.</p>
        </div>
      `
    });

    // Send admin notification
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `no-reply@${process.env.EMAIL_HOST || 'localhost'}`,
      to: adminEmail,
      subject: `New Contact Form Submission from ${firstName} ${lastName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
      `
    });

    logger.info(`Contact form emails sent`);
    return true;
  } catch (error) {
    logger.error('SEND CONTACT FORM EMAIL FAILED:', error.message);
    throw new Error('Failed to send contact form email');
  }
};

module.exports = {
  sendOTP,
  sendCoursePurchaseConfirmation,
  sendPaymentSuccessEmail,
  sendContactFormEmail
};

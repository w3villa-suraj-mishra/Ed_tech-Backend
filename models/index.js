// Import all models
const User = require('./User');
const Profile = require('./Profile');
const Category = require('./Category');
const Course = require('./Course');
const Section = require('./Section');
const SubSection = require('./SubSection');
const Enrollment = require('./Enrollment');
const RatingAndReview = require('./RatingAndReview');
const CourseProgress = require('./CourseProgress');
const CourseProgressVideo = require('./CourseProgressVideo');
const Otp = require('./Otp');
const LiveSession = require('./LiveSession');
const LiveChatMessage = require('./LiveChatMessage');
const ContactUs = require('./ContactUs');
const CoursePriceAudit = require('./CoursePriceAudit');
const CourseComment = require('./CourseComment');
const CourseCertificate = require('./CourseCertificate');
const Notification = require('./Notification');
const NotificationPreference = require('./NotificationPreference');
const Article = require('./Article');

// Define associations

// User associations
User.hasOne(Profile, { foreignKey: 'userId', as: 'profile', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Course, { foreignKey: 'instructorId', as: 'instructedCourses', onDelete: 'CASCADE' });
Course.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });

Course.hasMany(CoursePriceAudit, { foreignKey: 'courseId', as: 'priceAudits', onDelete: 'CASCADE' });
CoursePriceAudit.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
CoursePriceAudit.belongsTo(User, { foreignKey: 'changedById', as: 'changedBy' });

User.hasMany(Enrollment, { foreignKey: 'userId', as: 'enrollments', onDelete: 'CASCADE' });
Enrollment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(CourseProgress, { foreignKey: 'userId', onDelete: 'CASCADE' });
CourseProgress.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(RatingAndReview, { foreignKey: 'userId', onDelete: 'CASCADE' });
RatingAndReview.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(CourseComment, { foreignKey: 'userId', onDelete: 'CASCADE' });
CourseComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(CourseCertificate, { foreignKey: 'userId', onDelete: 'CASCADE' });
CourseCertificate.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(NotificationPreference, { foreignKey: 'userId', as: 'notificationPreference', onDelete: 'CASCADE' });
NotificationPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(LiveChatMessage, { foreignKey: 'userId', onDelete: 'CASCADE' });
LiveChatMessage.belongsTo(User, { foreignKey: 'userId' });

// Course associations
Category.hasMany(Course, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
Course.belongsTo(Category, { foreignKey: 'categoryId' });

Course.hasMany(Section, { foreignKey: 'courseId', as: 'sections', onDelete: 'CASCADE' });
Section.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Course.hasMany(Enrollment, { foreignKey: 'courseId', as: 'enrollments', onDelete: 'CASCADE' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Course.hasMany(CourseProgress, { foreignKey: 'courseId', as: 'courseProgresses', onDelete: 'CASCADE' });
CourseProgress.belongsTo(Course, { foreignKey: 'courseId' });

Course.hasMany(RatingAndReview, { foreignKey: 'courseId', as: 'ratingAndReviews', onDelete: 'CASCADE' });
RatingAndReview.belongsTo(Course, { foreignKey: 'courseId' });

Course.hasMany(CourseComment, { foreignKey: 'courseId', as: 'comments', onDelete: 'CASCADE' });
CourseComment.belongsTo(Course, { foreignKey: 'courseId' });

Course.hasMany(CourseCertificate, { foreignKey: 'courseId', as: 'certificates', onDelete: 'CASCADE' });
CourseCertificate.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Course.hasMany(LiveSession, { foreignKey: 'courseId', onDelete: 'CASCADE' });
LiveSession.belongsTo(Course, { foreignKey: 'courseId' });

// Section associations
Section.hasMany(SubSection, { foreignKey: 'sectionId', as: 'subSections', onDelete: 'CASCADE' });
SubSection.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

// SubSection associations
SubSection.hasMany(CourseProgressVideo, { foreignKey: 'subSectionId', onDelete: 'CASCADE' });
CourseProgressVideo.belongsTo(SubSection, { foreignKey: 'subSectionId' });

// CourseProgress associations
CourseProgress.hasMany(CourseProgressVideo, { foreignKey: 'courseProgressId', as: 'courseProgressVideos', onDelete: 'CASCADE' });
CourseProgressVideo.belongsTo(CourseProgress, { foreignKey: 'courseProgressId' });

// Live session associations
LiveSession.hasMany(LiveChatMessage, { foreignKey: 'liveSessionId', onDelete: 'CASCADE' });
LiveChatMessage.belongsTo(LiveSession, { foreignKey: 'liveSessionId' });

// Enrollment association for enrolled courses
User.hasMany(Enrollment, { foreignKey: 'userId' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId' });

module.exports = {
  User,
  Profile,
  Category,
  Course,
  Section,
  SubSection,
  Enrollment,
  RatingAndReview,
  CourseComment,
  CourseCertificate,
  Notification,
  NotificationPreference,
  CourseProgress,
  CourseProgressVideo,
  Otp,
  LiveSession,
  LiveChatMessage,
  ContactUs,
  CoursePriceAudit,
  Article
};

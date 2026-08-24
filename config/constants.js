module.exports = {
  ACCOUNT_TYPES: {
    ADMIN: 'Admin',
    STUDENT: 'Student',
    INSTRUCTOR: 'Instructor'
  },
  COURSE_STATUS: {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    ARCHIVED: 'Archived'
  },
  LIVE_SESSION_STATUS: {
    SCHEDULED: 'Scheduled',
    ONGOING: 'Ongoing',
    COMPLETED: 'Completed'
  },
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  }
};

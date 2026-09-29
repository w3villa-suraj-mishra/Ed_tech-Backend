const { User, Profile, Otp } = require('../models');

/**
 * Auth Native & ORM Queries Layer
 */

const findUserForLoginQuery = async (email, accountType) => {
  let user = await User.findOne({
    where: { email, accountType },
    include: ['profile']
  });

  if (!user) {
    user = await User.findOne({
      where: { email },
      include: ['profile']
    });
  }

  return user;
};

const findUserByEmailQuery = async (email, accountType = null) => {
  const where = { email };
  if (accountType) where.accountType = accountType;
  return await User.findOne({
    where,
    include: [{ model: Profile, as: 'profile' }]
  });
};

const findUserByIdQuery = async (userId) => {
  return await User.findByPk(userId, {
    include: [{ model: Profile, as: 'profile' }]
  });
};

const findVerifiedOtpQuery = async (email) => {
  return await Otp.findOne({
    where: { email, verified: true }
  });
};

const deleteOtpForEmailQuery = async (email) => {
  return await Otp.destroy({ where: { email } });
};

const createOtpRecordQuery = async ({ email, code, expiresAt }) => {
  return await Otp.create({
    email,
    code: String(code).trim(),
    expiresAt,
    verified: false
  });
};

const findOtpByEmailAndCodeQuery = async (email, code) => {
  return await Otp.findOne({
    where: { email, code },
    order: [['createdAt', 'DESC']]
  });
};

const updateOtpVerifiedQuery = async (otpRecord) => {
  return await otpRecord.update({ verified: true });
};

const destroyOtpQuery = async (otpRecord) => {
  return await otpRecord.destroy();
};

const createUserQuery = async (userData) => {
  return await User.create(userData);
};

const createProfileQuery = async (profileData) => {
  return await Profile.create(profileData);
};

const updateUserPasswordQuery = async (userInstance, newPassword, confirmPassword) => {
  userInstance.password = newPassword;
  userInstance.passwordConfirmation = confirmPassword;
  return await userInstance.save();
};

const findSocialUserQuery = async (email) => {
  return await User.findOne({ where: { email } });
};

const createSocialUserQuery = async (userData) => {
  return await User.create(userData);
};

module.exports = {
  findUserForLoginQuery,
  findUserByEmailQuery,
  findUserByIdQuery,
  findVerifiedOtpQuery,
  deleteOtpForEmailQuery,
  createOtpRecordQuery,
  findOtpByEmailAndCodeQuery,
  updateOtpVerifiedQuery,
  destroyOtpQuery,
  createUserQuery,
  createProfileQuery,
  updateUserPasswordQuery,
  findSocialUserQuery,
  createSocialUserQuery
};

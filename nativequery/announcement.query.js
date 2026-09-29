const { Announcement, AnnouncementDismissal, Article, ContactUs } = require('../models');
const { Op } = require('sequelize');

/**
 * Announcement & Content Native Queries Layer
 */

const createAnnouncementQuery = async (announcementData) => {
  return await Announcement.create(announcementData);
};

const findAllAnnouncementsFilteredQuery = async ({ status, audience, search }) => {
  const where = {};

  if (status && status !== 'all' && status !== 'All') {
    where.status = status.toUpperCase();
  }

  if (audience && audience !== 'all' && audience !== 'All') {
    where.audience = audience.toUpperCase();
  }

  if (search && search.trim()) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search.trim()}%` } },
      { message: { [Op.iLike]: `%${search.trim()}%` } },
      { highlightText: { [Op.iLike]: `%${search.trim()}%` } }
    ];
  }

  return await Announcement.findAll({
    where,
    order: [
      ['priority', 'DESC'],
      ['createdAt', 'DESC']
    ]
  });
};

const findAnnouncementByIdQuery = async (id) => {
  return await Announcement.findByPk(id);
};

const updateAnnouncementQuery = async (id, updateData) => {
  const announcement = await Announcement.findByPk(id);
  if (!announcement) return null;
  await announcement.update(updateData);
  return announcement;
};

const deleteAnnouncementQuery = async (id) => {
  const announcement = await Announcement.findByPk(id);
  if (!announcement) return null;
  await AnnouncementDismissal.destroy({ where: { announcementId: id } });
  await announcement.destroy();
  return true;
};

const getActiveUserAnnouncementQuery = async ({ allowedAudiences, userId }) => {
  let dismissedIds = [];
  if (userId) {
    const dismissals = await AnnouncementDismissal.findAll({
      where: { userId },
      attributes: ['announcementId']
    });
    dismissedIds = dismissals.map(d => d.announcementId);
  }

  const now = new Date();
  const where = {
    status: { [Op.in]: ['ACTIVE', 'SCHEDULED'] },
    audience: { [Op.in]: allowedAudiences },
    [Op.and]: [
      {
        [Op.or]: [
          { startAt: null },
          { startAt: { [Op.lte]: now } }
        ]
      },
      {
        [Op.or]: [
          { endAt: null },
          { endAt: { [Op.gt]: now } }
        ]
      }
    ]
  };

  if (dismissedIds.length > 0) {
    where.id = { [Op.notIn]: dismissedIds };
  }

  return await Announcement.findAll({ where });
};

const dismissAnnouncementQuery = async (userId, announcementId) => {
  return await AnnouncementDismissal.findOrCreate({
    where: { announcementId, userId },
    defaults: { announcementId, userId, dismissedAt: new Date() }
  });
};

const syncAnnouncementTablesQuery = async () => {
  try {
    await Announcement.sync();
    await AnnouncementDismissal.sync();
  } catch (e) {}
};

module.exports = {
  createAnnouncementQuery,
  findAllAnnouncementsFilteredQuery,
  findAnnouncementByIdQuery,
  updateAnnouncementQuery,
  deleteAnnouncementQuery,
  getActiveUserAnnouncementQuery,
  dismissAnnouncementQuery,
  syncAnnouncementTablesQuery
};

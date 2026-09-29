const { Section, SubSection, Course, CourseProgress, CourseProgressVideo } = require('../models');

/**
 * Section & SubSection Native Queries Layer
 */

const findSectionByIdQuery = async (sectionId) => {
  return await Section.findByPk(sectionId);
};

const createSectionQuery = async ({ sectionName, courseId }) => {
  const newSection = await Section.create({ sectionName, courseId });
  return await Section.findByPk(newSection.id, {
    include: [{ model: SubSection, as: 'subSections' }]
  });
};

const updateSectionQuery = async ({ sectionId, sectionName }) => {
  const section = await Section.findByPk(sectionId);
  if (!section) return null;
  await section.update({ sectionName });
  return section;
};

const deleteSectionQuery = async (sectionId) => {
  await SubSection.destroy({ where: { sectionId } });
  return await Section.destroy({ where: { id: sectionId } });
};

const findSubSectionByIdQuery = async (subSectionId) => {
  return await SubSection.findByPk(subSectionId);
};

const createSubSectionQuery = async (subSectionData) => {
  return await SubSection.create(subSectionData);
};

const updateSubSectionQuery = async (subSectionId, updateData) => {
  const subSection = await SubSection.findByPk(subSectionId);
  if (!subSection) return null;
  await subSection.update(updateData);
  return subSection;
};

const deleteSubSectionQuery = async (subSectionId) => {
  return await SubSection.destroy({ where: { id: subSectionId } });
};

const findOrCreateCourseProgressQuery = async (userId, courseId) => {
  let progress = await CourseProgress.findOne({
    where: { userId, courseId }
  });
  if (!progress) {
    progress = await CourseProgress.create({ userId, courseId });
  }
  return progress;
};

const findCompletedVideoQuery = async (courseProgressId, subSectionId) => {
  return await CourseProgressVideo.findOne({
    where: { courseProgressId, subSectionId }
  });
};

const markVideoCompletedQuery = async (courseProgressId, subSectionId) => {
  return await CourseProgressVideo.create({
    courseProgressId,
    subSectionId
  });
};

module.exports = {
  findSectionByIdQuery,
  createSectionQuery,
  updateSectionQuery,
  deleteSectionQuery,
  findSubSectionByIdQuery,
  createSubSectionQuery,
  updateSubSectionQuery,
  deleteSubSectionQuery,
  findOrCreateCourseProgressQuery,
  findCompletedVideoQuery,
  markVideoCompletedQuery
};

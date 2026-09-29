const { Article } = require('../models');

/**
 * Article Native & ORM Queries Layer
 */

const findAllPublishedArticlesQuery = async () => {
  return await Article.findAll({
    where: { status: 'Published' },
    order: [['createdAt', 'DESC']]
  });
};

const findAllArticlesQuery = async () => {
  return await Article.findAll({
    order: [['createdAt', 'DESC']]
  });
};

const findArticleByIdQuery = async (id) => {
  return await Article.findByPk(id);
};

const createArticleQuery = async (articleData) => {
  return await Article.create(articleData);
};

const updateArticleQuery = async (id, updateData) => {
  const article = await Article.findByPk(id);
  if (!article) return null;
  await article.update(updateData);
  return article;
};

const deleteArticleQuery = async (id) => {
  const article = await Article.findByPk(id);
  if (!article) return null;
  await article.destroy();
  return true;
};

module.exports = {
  findAllPublishedArticlesQuery,
  findAllArticlesQuery,
  findArticleByIdQuery,
  createArticleQuery,
  updateArticleQuery,
  deleteArticleQuery
};

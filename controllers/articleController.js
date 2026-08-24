const { Article } = require('../models');
const logger = require('../utils/logger');

const articleController = {
  // Get all published articles (Public/Student)
  getAllArticles: async (req, res) => {
    try {
      const articles = await Article.findAll({
        where: { published: true },
        order: [['createdAt', 'DESC']],
      });
      return res.status(200).json({
        success: true,
        data: articles,
      });
    } catch (error) {
      logger.error('GET ALL ARTICLES FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch articles',
      });
    }
  },

  // Get all articles including drafts (Admin)
  getAdminArticles: async (req, res) => {
    try {
      const articles = await Article.findAll({
        order: [['createdAt', 'DESC']],
      });
      return res.status(200).json({
        success: true,
        data: articles,
      });
    } catch (error) {
      logger.error('GET ADMIN ARTICLES FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch admin articles',
      });
    }
  },

  // Create article (Admin)
  createArticle: async (req, res) => {
    try {
      const { title, category, readTime, author, summary, content, coverImage, published } = req.body;

      if (!title || !summary || !content) {
        return res.status(400).json({
          success: false,
          message: 'Title, summary, and content are required.',
        });
      }

      const article = await Article.create({
        title,
        category: category || 'Engineering & Tech',
        readTime: readTime || '5 min read',
        author: author || `${req.user.firstName || 'Admin'} ${req.user.lastName || ''}`.trim(),
        summary,
        content,
        coverImage: coverImage || null,
        published: published !== undefined ? published : true,
      });

      return res.status(201).json({
        success: true,
        message: 'Article created successfully!',
        data: article,
      });
    } catch (error) {
      logger.error('CREATE ARTICLE FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to create article',
      });
    }
  },

  // Update article (Admin)
  updateArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const article = await Article.findByPk(id);

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found.',
        });
      }

      await article.update(req.body);

      return res.status(200).json({
        success: true,
        message: 'Article updated successfully!',
        data: article,
      });
    } catch (error) {
      logger.error('UPDATE ARTICLE FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to update article',
      });
    }
  },

  // Delete article (Admin)
  deleteArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const article = await Article.findByPk(id);

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found.',
        });
      }

      await article.destroy();

      return res.status(200).json({
        success: true,
        message: 'Article deleted successfully!',
      });
    } catch (error) {
      logger.error('DELETE ARTICLE FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete article',
      });
    }
  },
};

module.exports = articleController;

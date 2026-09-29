const { articleQuery } = require('../nativequery');
const logger = require('../utils/logger');

const articleController = {
  getArticles: async (req, res) => {
    try {
      const articles = await articleQuery.findAllPublishedArticlesQuery();
      return res.status(200).json({
        success: true,
        data: articles
      });
    } catch (error) {
      logger.error('GET ARTICLES FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getAllArticlesAdmin: async (req, res) => {
    try {
      const articles = await articleQuery.findAllArticlesQuery();
      return res.status(200).json({
        success: true,
        data: articles
      });
    } catch (error) {
      logger.error('GET ALL ARTICLES ADMIN FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createArticle: async (req, res) => {
    try {
      const { title, content, author, readTime, category, status, imageUrl } = req.body;

      if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Title and content are required' });
      }

      const article = await articleQuery.createArticleQuery({
        title,
        content,
        author: author || 'Admin',
        readTime: readTime || '5 min read',
        category: category || 'General',
        status: status || 'Published',
        imageUrl: imageUrl || null
      });

      return res.status(201).json({
        success: true,
        message: 'Article created successfully',
        data: article
      });
    } catch (error) {
      logger.error('CREATE ARTICLE FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  updateArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const article = await articleQuery.updateArticleQuery(id, req.body);

      if (!article) {
        return res.status(404).json({ success: false, message: 'Article not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Article updated successfully',
        data: article
      });
    } catch (error) {
      logger.error('UPDATE ARTICLE FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await articleQuery.deleteArticleQuery(id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Article not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Article deleted successfully'
      });
    } catch (error) {
      logger.error('DELETE ARTICLE FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getAllArticles: function(req, res) {
    return this.getArticles(req, res);
  },

  getAdminArticles: function(req, res) {
    return this.getAllArticlesAdmin(req, res);
  }
};

module.exports = articleController;

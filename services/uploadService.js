const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

const deleteLocalFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.error('DELETE LOCAL FILE FAILED:', error.message);
  }
};

const handleFileUpload = async (file, isVideo = false) => {
  if (!file || !file.path) {
    return null;
  }

  try {
    const uploadOptions = {
      resource_type: isVideo ? 'video' : 'image',
      folder: isVideo ? 'edtech/videos' : 'edtech/images'
    };

    const result = await cloudinary.uploader.upload(file.path, uploadOptions);
    deleteLocalFile(file.path);
    return result.secure_url;
  } catch (error) {
    deleteLocalFile(file.path);
    logger.error('FILE UPLOAD FAILED:', error.message);
    throw new Error('File upload failed');
  }
};

module.exports = {
  deleteLocalFile,
  handleFileUpload
};

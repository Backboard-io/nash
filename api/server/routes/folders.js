const express = require('express');
const { logger } = require('@librechat/data-schemas');
const {
  listFoldersBB,
  createFolderBB,
  deleteFolderBB,
} = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();
router.use(requireJwtAuth);

router.get('/', async (req, res) => {
  try {
    const folders = await listFoldersBB(req.user.id);
    res.status(200).json(folders);
  } catch (error) {
    logger.error('Error listing folders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, sharedMemory } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    const folder = await createFolderBB(req.user.id, name.trim(), sharedMemory === true);
    res.status(201).json(folder);
  } catch (error) {
    logger.error('Error creating folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:folderId', async (req, res) => {
  try {
    const deleted = await deleteFolderBB(req.user.id, req.params.folderId);
    if (deleted) {
      res.status(200).json({ message: 'Folder deleted' });
    } else {
      res.status(404).json({ error: 'Folder not found' });
    }
  } catch (error) {
    logger.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

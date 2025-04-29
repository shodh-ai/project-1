const express = require('express');
const dailyController = require('../controllers/dailyController');

const router = express.Router();

/**
 * @route GET /api/room
 * @desc Create or get a Daily.co room
 * @param {string} name - Room name to create (optional)
 * @returns {Object} - Object containing room details including URL
 */
router.get('/room', dailyController.createRoom);

/**
 * @route GET /api/token
 * @desc Generate a Daily.co meeting token
 * @param {string} room - Room name to create token for
 * @param {string} username - User identity to create token for
 * @returns {Object} - Object containing token
 */
router.get('/token', dailyController.generateToken);

module.exports = router;

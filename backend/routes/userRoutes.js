const express = require('express');
const { updateTheme, getMe, updateSettings } = require('../controllers/userController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMe);
router.put('/theme', updateTheme);
router.put('/settings', updateSettings);

module.exports = router;

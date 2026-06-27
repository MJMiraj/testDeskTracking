const express = require('express');
const { updateTheme, getMe } = require('../controllers/userController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMe);
router.put('/theme', updateTheme);

module.exports = router;

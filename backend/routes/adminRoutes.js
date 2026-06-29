const express = require('express');
const { getAllUsersStats } = require('../controllers/adminController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getAllUsersStats);

module.exports = router;

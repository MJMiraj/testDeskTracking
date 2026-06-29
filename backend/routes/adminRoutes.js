const express = require('express');
const { getAllUsersStats, updateUserRole } = require('../controllers/adminController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getAllUsersStats);
router.put('/users/:id/role', updateUserRole);

module.exports = router;

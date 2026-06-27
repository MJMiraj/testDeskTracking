const express = require('express');
const { applyLeave, getMyLeaves } = require('../controllers/leaveController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').post(applyLeave).get(getMyLeaves);

module.exports = router;

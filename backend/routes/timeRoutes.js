const express = require('express');
const { getEntries, getSummary, startTimer, stopTimer } = require('../controllers/timeController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/summary', getSummary);
router.get('/auto', require('../controllers/timeController').autoStartSession);

router.route('/')
    .get(getEntries)
    .post(startTimer);

router.put('/:id/stop', stopTimer);

module.exports = router;

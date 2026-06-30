const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadScreenshot, getScreenshots, getActivities } = require('../controllers/trackingController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

// Cloudinary Setup
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'desktime_pro_screenshots',
    format: async (req, file) => 'png', // supports promises as well
    public_id: (req, file) => `${req.user.id}-${Date.now()}`
  },
});

const upload = multer({ storage });

router.use(protect);

router.post('/upload', upload.single('screenshot'), uploadScreenshot);
router.get('/screenshots', getScreenshots);
router.get('/activities', getActivities);

module.exports = router;

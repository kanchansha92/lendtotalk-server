// // routes/onboardingRoutes.js
// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const {
//   updateName,
//   updateEmail,
//   updateAge,
//   updateGender,
//   updateLookingFor,
//   updateInterests,
//   getInterestsList,
//   uploadPhoto,
//   enableLocation,
//   skipLocation,
//   getOnboardingProgress,
//   completeOnboarding,
// } = require('../controllers/onboardingController');
// const { protect } = require('../middleware/authMiddleware');

// // Configure multer for file uploads
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     // Accept images only
//     if (!file.mimetype.startsWith('image/')) {
//       return cb(new Error('Only image files are allowed!'), false);
//     }
//     cb(null, true);
//   },
// });

// // All routes require authentication
// router.use(protect);

// // Step-by-step onboarding routes
// router.post('/name', updateName);
// router.post('/email', updateEmail);
// router.post('/age', updateAge);
// router.post('/gender', updateGender);
// router.post('/looking-for', updateLookingFor);
// router.post('/interests', updateInterests);
// router.get('/interests-list', getInterestsList);
// router.post('/upload-photo', upload.single('photo'), uploadPhoto);
// router.post('/location', enableLocation);
// router.post('/skip-location', skipLocation);

// // Get progress
// router.get('/progress', getOnboardingProgress);

// // Bulk complete (for testing or quick setup)
// router.post('/complete', completeOnboarding);

// module.exports = router;










// routes/onboardingRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  updateName,
  updateEmail,
  updateAge,
  updateGender,
  updateLookingFor,
  updateInterests,
  getInterestsList,
 uploadPhoto,
  enableLocation,
  skipLocation,
  getOnboardingProgress,
  uploadPhotos,
  updateBio,
} = require('../controllers/onboardingController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadSinglePhoto, uploadMultiplePhotos } = require('../middlewares/uploadMiddleware');
// const { protect } = require('../middleware/authMiddleware');

// Configure multer for memory storage
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image files are allowed'), false);
//     }
//   },
// });

// All onboarding routes require authentication
router.use(protect);

// Step-by-step onboarding routes
router.post('/name', updateName);
router.post('/email', updateEmail);
router.post('/age', updateAge);
router.post('/gender', updateGender);
router.post('/looking-for', updateLookingFor);
router.get('/interests-list', getInterestsList);
router.post('/interests', updateInterests);
router.post('/bio', updateBio);
// router.post('/upload-photo', upload.single('photo'), uploadPhoto);
// router.post('/upload-photo', uploadSinglePhoto, uploadPhoto);
// router.post(
//   "/upload-photo",
  
//   uploadMultiplePhotos,
//   uploadPhotos
// );
router.post("/upload-photo", uploadMultiplePhotos, uploadPhotos);
router.post('/location', enableLocation);
router.post('/skip-location', skipLocation);

// Progress tracking
router.get('/progress', getOnboardingProgress);

module.exports = router;
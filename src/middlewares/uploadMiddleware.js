const multer = require('multer');

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
];

// File size limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Memory storage for Cloudinary upload
const storage = multer.memoryStorage();

// File filter for images
const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

// File filter for documents
const fileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, and RAR are allowed.'), false);
  }
};

// Image upload middleware (for chat images)
const uploadChatImage = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
  fileFilter: imageFilter,
}).single('image');

// File upload middleware (for chat files)
const uploadChatFile = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
}).single('file');

// Multiple photos upload (for profile/onboarding)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const uploadMultiplePhotos = (req, res, next) => {
  upload.array("photo", 6)(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

// Error handler wrapper
const handleUploadError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size too large',
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadMultiplePhotos,
  uploadChatImage: handleUploadError(uploadChatImage),
  uploadChatFile: handleUploadError(uploadChatFile),
};

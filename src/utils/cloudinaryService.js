// const cloudinary = require('cloudinary').v2;
// const streamifier = require('streamifier');

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// exports.uploadToCloudinary = (fileBuffer, options = {}) => {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         folder: options.folder || 'lend2talk',
//         transformation: options.transformation || [],
//         resource_type: 'auto',
//       },
//       (error, result) => {
//         if (error) {
//           console.error('Cloudinary Upload Error:', error);
//           reject(error);
//         } else {
//           resolve(result);
//         }
//       }
//     );

//     streamifier.createReadStream(fileBuffer).pipe(uploadStream);
//   });
// };

// exports.deleteFromCloudinary = async (publicId) => {
//   try {
//     const result = await cloudinary.uploader.destroy(publicId);
//     return result;
//   } catch (error) {
//     console.error('Cloudinary Delete Error:', error);
//     throw error;
//   }
// };

// exports.getOptimizedImageUrl = (publicId, options = {}) => {
//   return cloudinary.url(publicId, {
//     transformation: [
//       {
//         width: options.width || 800,
//         height: options.height || 800,
//         crop: options.crop || 'fill',
//         gravity: options.gravity || 'face',
//       },
//       { quality: 'auto' },
//       { fetch_format: 'auto' },
//     ],
//   });
// };



// const cloudinary = require('cloudinary').v2;
// const streamifier = require('streamifier');

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const uploadToCloudinary = (fileBuffer, options = {}) => {
//   return new Promise((resolve, reject) => {
//     if (!fileBuffer) {
//       return reject(new Error('File buffer is missing'));
//     }

//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         folder: options.folder || 'lend2talk',
//         transformation: options.transformation || [],
//         resource_type: 'image',
//       },
//       (error, result) => {
//         if (error) {
//           console.error('Cloudinary Upload Error:', error);
//           return reject(error);
//         }
//         resolve(result);
//       }
//     );

//     streamifier.createReadStream(fileBuffer).pipe(uploadStream);
//   });
// };

// const deleteFromCloudinary = async (publicId) => {
//   return cloudinary.uploader.destroy(publicId);
// };

// const getOptimizedImageUrl = (publicId, options = {}) => {
//   return cloudinary.url(publicId, {
//     transformation: [
//       {
//         width: options.width || 800,
//         height: options.height || 800,
//         crop: options.crop || 'fill',
//         gravity: options.gravity || 'face',
//       },
//       { quality: 'auto' },
//       { fetch_format: 'auto' },
//     ],
//   });
// };

// module.exports = {
//   uploadToCloudinary,
//   deleteFromCloudinary,
//   getOptimizedImageUrl,
// };




const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = { uploadToCloudinary };

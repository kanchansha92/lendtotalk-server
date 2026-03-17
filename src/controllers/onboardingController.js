// controllers/onboardingController.js
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinaryService');

// @desc    Update user name
// @route   POST /api/onboarding/name
// @access  Private
exports.updateName = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid name (at least 2 characters)',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.name = name.trim();
    user.registrationStep = 'email_entry';
    await user.save();

    res.json({
      success: true,
      message: 'Name updated successfully',
      data: {
        name: user.name,
        nextStep: 'email_entry',
      },
    });
  } catch (error) {
    console.error('Update Name Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user email
// @route   POST /api/onboarding/email
// @access  Private
exports.updateEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;

    // Email is optional, but if provided, validate it
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered',
        });
      }
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (email) {
      user.email = email.toLowerCase().trim();
    }
    user.registrationStep = 'age_entry';
    await user.save();

    res.json({
      success: true,
      message: email ? 'Email updated successfully' : 'Email skipped',
      data: {
        email: user.email,
        nextStep: 'age_entry',
      },
    });
  } catch (error) {
    console.error('Update Email Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user age/date of birth
// @route   POST /api/onboarding/age
// @access  Private
exports.updateAge = async (req, res) => {
  try {
    const { age, dateOfBirth } = req.body;
    const userId = req.user.id;

    let calculatedAge = age;

    // If date of birth is provided, calculate age
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      calculatedAge = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        calculatedAge--;
      }
    }

    if (!calculatedAge || calculatedAge < 18 || calculatedAge > 100) {
      return res.status(400).json({
        success: false,
        message: 'You must be at least 18 years old to use this app',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.age = calculatedAge;
    if (dateOfBirth) {
      user.dateOfBirth = new Date(dateOfBirth);
    }
    user.registrationStep = 'gender_selection';
    await user.save();

    res.json({
      success: true,
      message: 'Age updated successfully',
      data: {
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        nextStep: 'gender_selection',
      },
    });
  } catch (error) {
    console.error('Update Age Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user gender
// @route   POST /api/onboarding/gender
// @access  Private
exports.updateGender = async (req, res) => {
  try {
    const { gender } = req.body;
    const userId = req.user.id;

    const validGenders = ['male', 'female'];
    if (!gender || !validGenders.includes(gender.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid gender (Male or Female)',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.gender = gender.toLowerCase();
    user.registrationStep = 'preference_selection';
    await user.save();

    res.json({
      success: true,
      message: 'Gender updated successfully',
      data: {
        gender: user.gender,
        nextStep: 'preference_selection',
      },
    });
  } catch (error) {
    console.error('Update Gender Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update looking for preference
// @route   POST /api/onboarding/looking-for
// @access  Private
exports.updateLookingFor = async (req, res) => {
  try {
    const { lookingFor } = req.body;
    const userId = req.user.id;

    const validPreferences = [
      'to date and meet instantly',
      'to commit with therapist',
      'others',
      'prefer not to say',
    ];

    if (!lookingFor || !validPreferences.includes(lookingFor.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid preference',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.lookingFor = lookingFor;
    user.registrationStep = 'interests_selection';
    await user.save();

    res.json({
      success: true,
      message: 'Preference updated successfully',
      data: {
        lookingFor: user.lookingFor,
        nextStep: 'interests_selection',
      },
    });
  } catch (error) {
    console.error('Update Looking For Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user interests
// @route   POST /api/onboarding/interests
// @access  Private
exports.updateInterests = async (req, res) => {
  try {
    const { interests } = req.body;
    const userId = req.user.id;

    if (!interests || !Array.isArray(interests)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide interests as an array',
      });
    }

    // Validate: User can select up to 4 interests
    if (interests.length < 1 || interests.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'Please select between 1 and 4 interests',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.interests = interests.map((interest) => interest.trim());
    user.registrationStep = 'photo_upload';
    await user.save();

    res.json({
      success: true,
      message: 'Interests updated successfully',
      data: {
        interests: user.interests,
        nextStep: 'photo_upload',
      },
    });
  } catch (error) {
    console.error('Update Interests Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get available interests list
// @route   GET /api/onboarding/interests-list
// @access  Private
exports.getInterestsList = async (req, res) => {
  try {
    const interestsList = [
      { id: 'photography', name: 'Photography', icon: '📷' },
      { id: 'gaming', name: 'Gaming', icon: '🎮' },
      { id: 'music', name: 'Music', icon: '🎵' },
      { id: 'travel', name: 'Travel', icon: '✈️' },
      { id: 'sports', name: 'Sports', icon: '⚽' },
      { id: 'cooking', name: 'Cooking', icon: '🍳' },
      { id: 'reading', name: 'Reading', icon: '📚' },
      { id: 'movies', name: 'Movies', icon: '🎬' },
      { id: 'art', name: 'Art', icon: '🎨' },
      { id: 'fitness', name: 'Fitness', icon: '💪' },
      { id: 'fashion', name: 'Fashion', icon: '👗' },
      { id: 'dancing', name: 'Dancing', icon: '💃' },
      { id: 'yoga', name: 'Yoga', icon: '🧘' },
      { id: 'pets', name: 'Pets', icon: '🐾' },
      { id: 'technology', name: 'Technology', icon: '💻' },
      { id: 'nature', name: 'Nature', icon: '🌿' },
      { id: 'coffee', name: 'Coffee', icon: '☕' },
      { id: 'wine', name: 'Wine', icon: '🍷' },
      { id: 'shopping', name: 'Shopping', icon: '🛍️' },
      { id: 'meditation', name: 'Meditation', icon: '🧘‍♀️' },
    ];

    res.json({
      success: true,
      data: interestsList,
    });
  } catch (error) {
    console.error('Get Interests List Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Upload profile photo
// @route   POST /api/onboarding/upload-photo
// @access  Private
// exports.uploadPhoto = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please upload a photo',
//       });
//     }

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     // Upload to cloudinary
//     const uploadResult = await uploadToCloudinary(req.file.buffer, {
//       folder: 'lend2talk/profiles',
//       transformation: [
//         { width: 800, height: 800, crop: 'fill', gravity: 'face' },
//         { quality: 'auto' },
//       ],
//     });

//     // Set as profile picture if it's the first photo
//     if (!user.profilePicture) {
//       user.profilePicture = uploadResult.secure_url;
//     }

//     // Add to photos array
//     user.photos.push({
//       url: uploadResult.secure_url,
//       isPrimary: !user.profilePicture || user.photos.length === 0,
//       uploadedAt: new Date(),
//     });

//     user.registrationStep = 'location_setup';
//     await user.save();

//     res.json({
//       success: true,
//       message: 'Photo uploaded successfully',
//       data: {
//         photoUrl: uploadResult.secure_url,
//         profilePicture: user.profilePicture,
//         nextStep: 'location_setup',
//       },
//     });
//   } catch (error) {
//     console.error('Upload Photo Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during photo upload',
//       error: error.message,
//     });
//   }
// };


// exports.uploadPhotos = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Please upload at least one photo",
//       });
//     }

//     if (req.files.length > 6) {
//       return res.status(400).json({
//         success: false,
//         message: "You can upload up to 6 photos only",
//       });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const uploadedPhotos = [];
//     const isFirstUpload = user.photo.length === 0;

//     for (let i = 0; i < req.files.length; i++) {
//       const file = req.files[i];

//       const uploadResult = await uploadToCloudinary(file.buffer, {
//         folder: "lend2talk/profiles",
//         transformation: [
//           { width: 800, height: 800, crop: "fill", gravity: "face" },
//           { quality: "auto" },
//         ],
//       });

//       uploadedPhotos.push({
//         url: uploadResult.secure_url,
//         isPrimary: isFirstUpload && i === 0,
//         uploadedAt: new Date(),
//       });
//     }

//     // Set profile picture if not already set
//     if (!user.profilePicture && uploadedPhotos.length > 0) {
//       user.profilePicture = uploadedPhotos[0].url;
//     }

//     user.photos.push(...uploadedPhotos);
//     user.registrationStep = "location_setup";

//     await user.save();

//     res.json({
//       success: true,
//       message: "Photos uploaded successfully",
//       data: {
//         photo: uploadedPhotos,
//         profilePicture: user.profilePicture,
//         nextStep: "location_setup",
//       },
//     });
//   } catch (error) {
//     console.error("Upload Photos Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error during photo upload",
//       error: error.message,
//     });
//   }
// };
exports.uploadPhotos = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("📸 Files received:", req.files?.length);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one photo",
      });
    }

    if (req.files.length > 6) {
      return res.status(400).json({
        success: false,
        message: "You can upload up to 6 photos only",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const uploadedPhotos = [];
    const isFirstUpload = user.photos.length === 0; // ✅ FIXED

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      console.log("⬆ Uploading:", file.mimetype, file.size);

      const uploadResult = await uploadToCloudinary(file.buffer, {
        folder: "lend2talk/profiles",
        resource_type: "image",
        transformation: [
          { width: 800, height: 800, crop: "fill", gravity: "face" },
          { quality: "auto" },
        ],
      });

      uploadedPhotos.push({
        url: uploadResult.secure_url,
        isPrimary: isFirstUpload && i === 0,
        uploadedAt: new Date(),
      });
    }

    // Set profile picture if not already set or if explicitly updating
    if (uploadedPhotos.length > 0) {
      user.profilePicture = uploadedPhotos[0].url;
    }

    user.photos.push(...uploadedPhotos);
    user.registrationStep = "bio-entry";

    await user.save();

    res.json({
      success: true,
      message: "Photos uploaded successfully",
      data: {
        photos: uploadedPhotos,
        profilePicture: user.profilePicture,
        nextStep: "bio-entry",
      },
    });
  } catch (error) {
    console.error("🔥 Upload Photos Error:", error);
    console.error("🔥 Stack:", error.stack);

    res.status(500).json({
      success: false,
      message: "Server error during photo upload",
      error: error.message,
    });
  }
};


// exports.uploadPhotos = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ success: false, message: "Please upload at least one photo" });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     const isFirstUpload = user.photos.length === 0;

//     // Use Promise.all for PARALLEL uploads (much faster)
//     const uploadPromises = req.files.map((file, i) => {
//       return uploadToCloudinary(file.buffer, {
//         folder: "lend2talk/profiles",
//         transformation: [
//           { width: 800, height: 1066, crop: "fill", gravity: "face" },
//           { quality: "auto" },
//         ],
//       }).then((result) => ({
//         url: result.secure_url,
//         isPrimary: isFirstUpload && i === 0,
//         uploadedAt: new Date(),
//       }));
//     });

//     const uploadedPhotos = await Promise.all(uploadPromises);

//     if (!user.profilePicture && uploadedPhotos.length > 0) {
//       user.profilePicture = uploadedPhotos[0].url;
//     }

//     user.photos.push(...uploadedPhotos);
//     user.registrationStep = "location_setup";

//     await user.save();

//     res.json({
//       success: true,
//       message: "Photos uploaded successfully",
//       data: {
//         photos: uploadedPhotos,
//         nextStep: "location_setup",
//       },
//     });
//   } catch (error) {
//     console.error("Upload Error:", error);
//     res.status(500).json({ success: false, message: "Server error", error: error.message });
//   }
// };
// @desc    Enable location
// @route   POST /api/onboarding/location
// @access  Private
// exports.enableLocation = async (req, res) => {
//   try {
//     const { latitude, longitude, address, city, state, country } = req.body;
//     const userId = req.user.id;

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     if (latitude && longitude) {
//       user.location = {
//         type: 'Point',
//         coordinates: [longitude, latitude],
//         address,
//         city,
//         state,
//         country,
//       };
//       user.locationEnabled = true;
//     }

//     // Mark profile as completed
//     user.registrationStep = 'completed';
//     user.profileCompleted = true;
//     await user.save();

//     res.json({
//       success: true,
//       message: 'Location enabled successfully. Profile setup complete!',
//       data: {
//         location: user.location,
//         profileCompleted: true,
//         redirectToHome: true, // Frontend should redirect to home page
//       },
//     });
//   } catch (error) {
//     console.error('Enable Location Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message,
//     });
//   }
// };



// exports.enableLocation = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { latitude, longitude, address, city, state, country } = req.body;

//     if (!latitude || !longitude) {
//       return res.status(400).json({
//         success: false,
//         message: "Latitude & longitude required",
//       });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     user.location = {
//       type: "Point",
//       coordinates: [longitude, latitude],
//       address,
//       city,
//       state,
//       country,
//     };

//     user.locationEnabled = true;
//     user.registrationStep = "completed";
//     user.profileCompleted = true;

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Location enabled",
//       data: {
//         city,
//         country,
//         redirect: "home",
//       },
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };




// exports.enableLocation = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const {
//       latitude,
//       longitude,
//       address,
//       city,
//       state,
//       country,
//       locationSource, // "gps" or "manual"
//     } = req.body;

//     // Validation
//     if (locationSource === "gps") {
//       if (!latitude || !longitude) {
//         return res.status(400).json({
//           success: false,
//           message: "Latitude & longitude required for GPS location",
//         });
//       }
//     }

//     if (locationSource === "manual") {
//       if (!city || !country) {
//         return res.status(400).json({
//           success: false,
//           message: "City and country are required",
//         });
//       }
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     user.locationEnabled = true;
//     user.locationSource = locationSource;

//     // Save coordinates only if available
//     if (latitude && longitude) {
//       user.location = {
//         type: "Point",
//         coordinates: [longitude, latitude],
//         address,
//         city,
//         state,
//         country,
//       };
//     } else {
//       // Manual location (no geo queries)
//       user.location = {
//         address,
//         city,
//         state,
//         country,
//       };
//     }

//     user.registrationStep = "completed";
//     user.profileCompleted = true;

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Location enabled",
//       data: {
//         city,
//         country,
//         redirect: "home",
//       },
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// exports.enableLocation = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const {
//       latitude,
//       longitude,
//       address,
//       city,
//       state,
//       country,
//       locationSource, // "gps" | "manual"
//     } = req.body;

//     // 🛑 VALIDATION
//     if (!["gps", "manual"].includes(locationSource)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid location source",
//       });
//     }

//     if (locationSource === "gps" && (!latitude || !longitude)) {
//       return res.status(400).json({
//         success: false,
//         message: "Latitude & longitude required for GPS",
//       });
//     }

//     if (locationSource === "manual" && (!city || !country)) {
//       return res.status(400).json({
//         success: false,
//         message: "City and country are required",
//       });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // ✅ COMMON FLAGS
//     user.locationEnabled = true;
//     user.locationSource = locationSource;

//     // ✅ GPS LOCATION (WITH ADDRESS)
//     if (locationSource === "gps") {
//       user.location = {
//         type: "Point",
//         coordinates: [longitude, latitude], // MUST BE [lng, lat]
//         address: address || "",
//         city: city || "",
//         state: state || "",
//         country: country || "",
//       };
//     }

//     // ✅ MANUAL LOCATION (NO COORDINATES)
//     if (locationSource === "manual") {
//       user.location = {
//         type: "Point",
//         coordinates: [0, 0], // safe default to avoid geo crash
//         address: address || "",
//         city,
//         state,
//         country,
//       };
//     }

//     user.registrationStep = "completed";
//     user.profileCompleted = true;

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Location enabled successfully",
//       data: {
//         locationSource,
//         city: user.location.city,
//         country: user.location.country,
//         redirect: "home",
//       },
//     });
//   } catch (error) {
//     console.error("Enable Location Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };



// exports.enableLocation = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const {
//       latitude,
//       longitude,
//       address,
//       city,
//       state,
//       country,
//       locationSource,
//     } = req.body;

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     user.locationEnabled = true;
//     user.locationSource = locationSource;

//     // ✅ GPS LOCATION
//     if (locationSource === "gps") {
//       if (!latitude || !longitude) {
//         return res.status(400).json({
//           success: false,
//           message: "Latitude & longitude required",
//         });
//       }

//       user.location = {
//         type: "Point",
//         coordinates: [longitude, latitude],
//       };

//       user.address = address || "";
//       user.city = city || "";
//       user.state = state || "";
//       user.country = country || "";
//     }

//     // ✅ MANUAL LOCATION
//     if (locationSource === "manual") {
//       if (!city || !country) {
//         return res.status(400).json({
//           success: false,
//           message: "City and country required",
//         });
//       }
// if (locationSource === "manual") {
//   user.location = {
//     address: address || `${city}, ${country}`, // ✅ fallback
//     city,
//     state: state || "",
//     country,
//   };
// }

//       // Keep geo valid
//       user.location = {
//         type: "Point",
//         coordinates: [0, 0],
//       };

//       user.address = address || "";
//       user.city = city;
//       user.state = state || "";
//       user.country = country;
//     }

//     user.registrationStep = "completed";
//     user.profileCompleted = true;

//     await user.save();

//     res.json({
//       success: true,
//       message: "Location saved successfully",
//     });
//   } catch (error) {
//     console.error("Location Error:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };



exports.updateBio = async (req, res) => {
  try {
    const { bio } = req.body;
    const userId = req.user.id;

    // Validate bio
    if (!bio || bio.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid bio (at least 5 characters)",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update bio
    user.bio = bio.trim();

    // Optional: update registration step
    user.registrationStep = "location_setup";

    await user.save();

    res.json({
      success: true,
      message: "Bio updated successfully",
      data: {
        bio: user.bio,
        nextStep: "location_setup",
      },
    });
  } catch (error) {
    console.error("Update Bio Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


exports.enableLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      latitude,
      longitude,
      address,
      city,
      state,
      country,
      locationSource,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.locationEnabled = true;
    user.locationSource = locationSource;

    // ===============================
    // 📍 GPS LOCATION
    // ===============================
    if (locationSource === "gps") {
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude & longitude required for GPS",
        });
      }

      // ✅ GeoJSON (ONLY coordinates)
      user.location = {
        type: "Point",
        coordinates: [longitude, latitude],
      };

      // ✅ Address fields
      user.address = address || "";
      user.city = city || "";
      user.state = state || "";
      user.country = country || "";
    }

    // ===============================
    // 🏠 MANUAL LOCATION
    // ===============================
    if (locationSource === "manual") {
      if (!city || !country) {
        return res.status(400).json({
          success: false,
          message: "City and country are required",
        });
      }

      // ✅ Keep GeoJSON valid (no GPS yet)
      user.location = {
        type: "Point",
        coordinates: [0, 0],
      };

      // ✅ Address fields
      user.address = address || `${city}, ${country}`;
      user.city = city;
      user.state = state || "";
      user.country = country;
    }

    user.registrationStep = "completed";
    user.profileCompleted = true;

    await user.save();

    res.json({
      success: true,
      message: "Location saved successfully",
      data: {
        locationSource,
        city: user.city,
        country: user.country,
      },
    });
  } catch (error) {
    console.error("Location Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// @desc    Skip location setup
// @route   POST /api/onboarding/skip-location
// @access  Private
exports.skipLocation = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.locationEnabled = false;
    user.registrationStep = 'completed';
    user.profileCompleted = true;
    await user.save();

    res.json({
      success: true,
      message: 'Location skipped. Profile setup complete!',
      data: {
        profileCompleted: true,
        redirectToHome: true, // Frontend should redirect to home page
      },
    });
  } catch (error) {
    console.error('Skip Location Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get onboarding progress
// @route   GET /api/onboarding/progress
// @access  Private
exports.getOnboardingProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      'name email age dateOfBirth gender lookingFor interests profilePicture photos location locationEnabled registrationStep profileCompleted'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const progress = {
      currentStep: user.registrationStep,
      completedSteps: [],
      isComplete: user.profileCompleted,
    };

    // Determine which steps are completed
    if (user.name) progress.completedSteps.push('name_entry');
    if (user.email) progress.completedSteps.push('email_entry');
    if (user.age) progress.completedSteps.push('age_entry');
    if (user.gender) progress.completedSteps.push('gender_selection');
    if (user.lookingFor) progress.completedSteps.push('preference_selection');
    if (user.interests && user.interests.length > 0)
      progress.completedSteps.push('interests_selection');
    if (user.profilePicture) progress.completedSteps.push('photo_upload');
    if (user.locationEnabled || user.registrationStep === 'completed')
      progress.completedSteps.push('location_setup');

    // Calculate percentage
    const totalSteps = 8;
    const completedCount = progress.completedSteps.length;
    progress.percentage = Math.round((completedCount / totalSteps) * 100);

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          age: user.age,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          lookingFor: user.lookingFor,
          interests: user.interests,
          profilePicture: user.profilePicture,
          photos: user.photos,
          locationEnabled: user.locationEnabled,
          location: user.location,
        },
        progress,
      },
    });
  } catch (error) {
    console.error('Get Onboarding Progress Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};



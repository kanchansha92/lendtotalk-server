

// const User = require('../models/User');

const User = require("../models/User");

/* ======================================================
   UPDATE USER PROFILE (EXTENDED)
   PUT /api/auth/update-profile
====================================================== */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      name,
      email,
      profilePicture,
      bio,
      gender,
      age,
      interests,
      lookingFor,
      location,
    } = req.body;

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // Update allowed fields
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (profilePicture) user.profilePicture = profilePicture;
    if (bio) user.bio = bio;
    if (gender) user.gender = gender;
    if (age) user.age = age;
    if (lookingFor) user.lookingFor = lookingFor;

    if (interests && Array.isArray(interests)) {
      user.interests = interests;
    }

    if (location) {
      user.location = {
        city: location.city || user.location?.city,
        state: location.state || user.location?.state,
        country: location.country || user.location?.country,
      };
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Profile update failed",
      error: error.message,
    });
  }
};



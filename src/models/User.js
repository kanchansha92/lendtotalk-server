// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    // Basic Info
    username: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // Allows null/undefined values
    },
    phone: {
      type: String,
      // required: true,
      unique: true,
      trim: true,
      sparse: true,
    },
    countryCode: {
      type: String,
      default: '+91',
    },
    password: {
      type: String,
      select: false, // Don't return password by default
    },

    // Profile Information
    age: {
      type: Number,
      min: 18,
      max: 100,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    // bio: {
    //   type: String,
    //   maxlength: 500,
    // },
    lookingFor: {
      type: String,
      enum: [
        'to date and meet instantly',
        'to commit with therapist',
        'others',
        'prefer not to say',
      ],
    },
    interests: [
      {
        type: String,
        trim: true,
      },
    ],
    profilePicture: {
      type: String,
      default: '',
    },
    photos: [
      {
        url: String,
        isPrimary: Boolean,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Location


    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        index: "2dsphere",
        default: [0, 0],
      },


    },
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    locationSource: {
      type: String,
      enum: ["gps", "manual"],
      default: "manual",
    },


    locationEnabled: {
      type: Boolean,
      default: false,
    },

    // registrationStep: {
    //   type: String,
    //   enum: ["name", "email", "gender", "location", "completed"],
    //   default: "name",
    // },

    // profileCompleted: {
    //   type: Boolean,
    //   default: false,
    // },

    // Authentication
    authProvider: {
      type: String,
      enum: ['phone', 'facebook', 'google', 'local'],
      default: 'phone',
    },
    socialId: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpPlain: {
      type: String,
      select: false, // hide from responses
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    // OTP Tracking
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpResendCount: {
      type: Number,
      default: 0,
    },
    otpLastSentAt: {
      type: Date,
    },
    lastActive: { type: Date, default: Date.now },
    isCurrentlyOnline: { type: Boolean, default: false },
    // Registration Progress
    registrationStep: {
      type: String,
      enum: [
        'phone_entry',
        'otp_verification',
        'profile_setup',
        'name_entry',
        'email_entry',
        'age_entry',
        'gender_selection',
        'preference_selection',
        'interests_selection',
        'photo_upload',
        'bio-entry',
        'location_setup',
        'completed',
      ],
      default: 'phone_entry',
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },

    // User Type & Preferences
    userType: {
      type: String,
      enum: ['regular', 'premium', 'vip'],
      default: 'regular',
    },
    preferences: {
      ageRange: {
        min: {
          type: Number,
          default: 18,
        },
        max: {
          type: Number,
          default: 50,
        },
      },
      distanceRange: {
        type: Number,
        default: 50, // in kilometers
      },
      showMe: {
        type: String,
        enum: ['everyone', 'male', 'female'],
        default: 'everyone',
      },
    },

    // App Settings
    notifications: {
      push: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: true,
      },
      matches: {
        type: Boolean,
        default: true,
      },
      messages: {
        type: Boolean,
        default: true,
      },
    },

    // Privacy Settings
    privacy: {
      showOnlineStatus: {
        type: Boolean,
        default: true,
      },
      showDistance: {
        type: Boolean,
        default: true,
      },
      incognitoMode: {
        type: Boolean,
        default: false,
      },
    },

    // Bio & About
    bio: {
      type: String,
      maxlength: 500,
    },
    occupation: String,
    education: String,
    height: Number, // in cm
    relationshipStatus: {
      type: String,
      enum: ['single', 'divorced', 'widowed', 'complicated'],
    },

    // Stats
    profileViews: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    matches: {
      type: Number,
      default: 0,
    },

    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpiry: Date,

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedReason: String,
    lastLogin: Date,
    lastActive: Date,

    // Subscription
    subscription: {
      type: {
        type: String,
        enum: ['free', 'basic', 'premium', 'vip'],
        default: 'free',
      },
      startDate: Date,
      endDate: Date,
      autoRenew: {
        type: Boolean,
        default: false,
      },
    },

    // Device Info
    deviceTokens: [
      {
        token: String,
        platform: {
          type: String,
          enum: ['ios', 'android', 'web'],
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // E2EE public key
    publicKey: {
      type: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for geospatial queries
UserSchema.index({ location: '2dsphere' });

// Index for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ isActive: 1, isBlocked: 1 });
UserSchema.index({ age: 1, gender: 1 });

// Virtual for age calculation
UserSchema.virtual('calculatedAge').get(function () {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }
  return this.age;
});

// Method to check if profile is complete
UserSchema.methods.isProfileComplete = function () {
  return (
    this.name &&
    this.age &&
    this.gender &&
    this.profilePicture &&
    this.interests &&
    this.interests.length > 0
  );
};

// Method to get public profile
UserSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    age: this.age || this.calculatedAge,
    gender: this.gender,
    profilePicture: this.profilePicture,
    photos: this.photos,
    bio: this.bio,
    interests: this.interests,
    occupation: this.occupation,
    education: this.education,
    location: this.privacy.showDistance
      ? {
        city: this.location.city,
        state: this.location.state,
      }
      : null,
  };
};

// Update last active
UserSchema.methods.updateLastActive = async function () {
  this.lastActive = Date.now();
  return await this.save();
};

// Password hashing pre-save hook
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
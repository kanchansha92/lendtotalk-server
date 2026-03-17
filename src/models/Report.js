const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
    {
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        reportedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        reason: {
            type: String,
            required: true,
            enum: [
                'Harassment',
                'Spam',
                'Inappropriate Content',
                'Fake Profile',
                'Solicitation',
                'Other',
            ],
        },
        description: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
ReportSchema.index({ reporter: 1 });
ReportSchema.index({ reportedUser: 1 });
ReportSchema.index({ status: 1 });

module.exports = mongoose.model('Report', ReportSchema);

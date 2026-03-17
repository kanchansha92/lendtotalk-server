const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

exports.initiatePayment = async (req, res) => {
    try {
        const { plan, amount } = req.body;
        const userId = req.user.id;

        if (!plan || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Plan and amount are required'
            });
        }

        // Razorpay amount is in paise (1 INR = 100 paise)
        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        const transaction = await Transaction.create({
            user: userId,
            amount,
            plan,
            transactionId: order.id,
            status: 'pending',
            metadata: { orderId: order.id }
        });

        return res.status(201).json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('Initiate payment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.confirmPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
        const userId = req.user.id;

        // Verify signature
        const text = razorpay_order_id + "|" + razorpay_payment_id;
        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
            .update(text)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        const transaction = await Transaction.findOne({ transactionId: razorpay_order_id, user: userId });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        transaction.status = 'success';
        transaction.metadata = { ...transaction.metadata, razorpay_payment_id };
        await transaction.save();

        const user = await User.findById(userId);
        user.subscription = {
            type: plan || transaction.plan,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoRenew: true
        };
        user.userType = (plan || transaction.plan) === 'vip' ? 'vip' : 'premium';
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Subscription updated successfully',
            subscription: user.subscription
        });

    } catch (error) {
        console.error('Confirm payment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { initiatePayment, confirmPayment } = require('../controllers/subscriptionController');

router.use(protect);

router.post('/initiate', initiatePayment);
router.post('/confirm', confirmPayment);

module.exports = router;

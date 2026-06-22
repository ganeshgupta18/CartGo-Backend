const express = require('express');
const { 
  registerUser, 
  verifyOtp, 
  resendOtp, 
  loginUser, 
  getUsers, 
  createUserByAdmin, 
  deleteUser,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getWishlist,
  toggleWishlist
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/toggle', protect, toggleWishlist);

router.route('/users')
  .get(protect, admin, getUsers)
  .post(protect, admin, createUserByAdmin);
router.route('/users/:id')
  .delete(protect, admin, deleteUser);

module.exports = router;

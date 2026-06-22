const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationOtp: otp,
      verificationOtpExpires: otpExpires
    });

    if (user) {
      // Send Welcome / OTP Email
      const message = `
        <h2>Welcome to CartGo, ${name}!</h2>
        <p>Thank you for registering on our platform.</p>
        <p>To verify your email address, please use the following OTP:</p>
        <h1 style="color: #4f46e5; letter-spacing: 2px;">${otp}</h1>
        <p>This verification OTP is valid for 15 minutes.</p>
      `;

      await sendEmail({
        email: user.email,
        subject: 'Welcome to CartGo - Verify Your Email',
        message
      });

      res.status(201).json({
        message: 'Registration successful! Verification OTP sent to your email.',
        email: user.email
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }

    if (user.verificationOtp !== otp) {
      return res.status(400).json({ message: 'Invalid verification OTP' });
    }

    if (user.verificationOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    user.isVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpires = undefined;
    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationOtp = otp;
    user.verificationOtpExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const message = `
      <h2>CartGo - New Verification OTP</h2>
      <p>Hello ${user.name},</p>
      <p>You requested a new verification OTP. Please use this to activate your account:</p>
      <h1 style="color: #4f46e5; letter-spacing: 2px;">${otp}</h1>
      <p>This OTP is valid for 15 minutes.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'CartGo - Verification OTP',
      message
    });

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.isVerified) {
        // Automatically send a new OTP if trying to log in while unverified
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationOtp = otp;
        user.verificationOtpExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        const message = `
          <h2>CartGo - Email Verification Required</h2>
          <p>Hello ${user.name},</p>
          <p>Your account is registered but not verified. Please verify your email to log in.</p>
          <p>Your verification OTP is: </p>
          <h1 style="color: #4f46e5; letter-spacing: 2px;">${otp}</h1>
          <p>This OTP is valid for 15 minutes.</p>
        `;

        await sendEmail({
          email: user.email,
          subject: 'CartGo - Verify Your Email',
          message
        });

        return res.status(401).json({
          message: 'Account not verified. Verification OTP sent to your email.',
          isVerified: false,
          email: user.email
        });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      isVerified: true
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    if (userIdToDelete === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(userIdToDelete);
    if (user) {
      await user.deleteOne();
      res.status(200).json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (user && (await bcrypt.compare(currentPassword, user.password))) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();
      res.status(200).json({ message: 'Password changed successfully' });
    } else {
      res.status(400).json({ message: 'Invalid current password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const message = `
      <h2>CartGo - Reset Password Verification</h2>
      <p>Hello ${user.name},</p>
      <p>You requested to reset your password. Please use the following 6-digit OTP code to verify your identity:</p>
      <h1 style="color: #ea580c; letter-spacing: 2px;">${otp}</h1>
      <p>This OTP code is valid for 15 minutes. If you did not request this, please ignore this email.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'CartGo - Reset Password OTP',
      message
    });

    res.status(200).json({ message: 'Verification OTP sent to your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (user.resetPasswordOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    res.status(200).json({ message: 'Verification successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (user.resetPasswordOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.wishlist || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.wishlist) {
      user.wishlist = [];
    }

    const index = user.wishlist.indexOf(productId);
    if (index > -1) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.push(productId);
    }

    await user.save();

    const populatedUser = await User.findById(req.user._id).populate('wishlist');
    res.json({ wishlist: populatedUser.wishlist || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
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
};

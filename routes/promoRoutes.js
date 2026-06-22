const express = require('express');
const PromoCode = require('../models/PromoCode');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

const router = express.Router();

// @desc    Get active promo codes
// @route   GET /api/promos
// @access  Public
router.get('/', async (req, res) => {
  try {
    const promos = await PromoCode.find({ isActive: true });
    res.json(promos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all promo codes (Admin)
// @route   GET /api/promos/all
// @access  Private/Admin
router.get('/all', protect, admin, async (req, res) => {
  try {
    const promos = await PromoCode.find({});
    res.json(promos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a new promo code
// @route   POST /api/promos
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { code, discountPercentage, description } = req.body;
    
    const exists = await PromoCode.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(400).json({ message: 'Promo code already exists' });
    }

    const promo = await PromoCode.create({
      code: code.toUpperCase(),
      discountPercentage,
      description
    });
    
    res.status(201).json(promo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Toggle promo code status
// @route   PUT /api/promos/:id/toggle
// @access  Private/Admin
router.put('/:id/toggle', protect, admin, async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: 'Promo code not found' });
    }
    
    promo.isActive = !promo.isActive;
    await promo.save();
    res.json(promo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a promo code
// @route   DELETE /api/promos/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: 'Promo code not found' });
    }
    await promo.deleteOne();
    res.json({ message: 'Promo code deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Validate promo code
// @route   POST /api/promos/validate
// @access  Public
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }
    
    const promo = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true });
    if (!promo) {
      return res.status(400).json({ message: 'Invalid or expired promo code' });
    }
    
    res.json({
      code: promo.code,
      discountPercentage: promo.discountPercentage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

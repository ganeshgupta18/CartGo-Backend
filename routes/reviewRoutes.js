const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');

// Get all app reviews
router.get('/app', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: null }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if authenticated user has submitted app review
router.get('/app/check', protect, async (req, res) => {
  try {
    const review = await Review.findOne({ productId: null, userId: req.user._id });
    res.json({ hasReviewed: !!review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product reviews
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit a review (app review if productId is null/omitted)
router.post('/', protect, async (req, res) => {
  try {
    const { productId, rating, comment, image } = req.body;
    const userId = req.user._id;
    const userName = req.user.name;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    if (productId) {
      // Product Review
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check if user already reviewed this product
      let review = await Review.findOne({ productId, userId });
      if (review) {
        review.rating = rating;
        review.comment = comment;
        if (image !== undefined) review.image = image;
        await review.save();
      } else {
        review = new Review({
          productId,
          userId,
          name: userName,
          rating,
          comment,
          image
        });
        await review.save();
      }

      // Recalculate average rating & numReviews for the product
      const reviews = await Review.find({ productId });
      const numReviews = reviews.length;
      const ratings = reviews.reduce((acc, item) => item.rating + acc, 0) / numReviews;

      product.numReviews = numReviews;
      product.ratings = ratings;
      await product.save();

      return res.status(201).json(review);
    } else {
      // App/Service Review
      let review = await Review.findOne({ productId: null, userId });
      if (review) {
        review.rating = rating;
        review.comment = comment;
        await review.save();
      } else {
        review = new Review({
          productId: null,
          userId,
          name: userName,
          rating,
          comment
        });
        await review.save();
      }
      return res.status(201).json(review);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

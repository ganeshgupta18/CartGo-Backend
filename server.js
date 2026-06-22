const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

// Connect Database
connectDB();

const app = express();

// CORS Configuration
app.use(
cors({
origin: [
'http://localhost:3000',
'http://127.0.0.1:3000',
process.env.FRONTEND_URL
],
credentials: true
})
);

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/promos', require('./routes/promoRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// Test Route
app.get('/', (req, res) => {
res.send('CartGo API is running...');
});

// Export for Vercel
module.exports = app;

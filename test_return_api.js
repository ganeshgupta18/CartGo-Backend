const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Programmatic Product Return Policy Tests ---');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Clean up past test users & orders
    await User.deleteMany({ email: 'tester_return@gmail.com' });
    await Order.deleteMany({});
    console.log('Cleaned up database records.');

    // 2. Register tester_return@gmail.com
    console.log('\nRegistering test user...');
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Return Tester',
        email: 'tester_return@gmail.com',
        password: 'password123'
      })
    });
    
    if (!registerRes.ok) {
      throw new Error('Registration failed');
    }

    // 3. Retrieve verification OTP from database and verify
    let user = await User.findOne({ email: 'tester_return@gmail.com' });
    const otp = user.verificationOtp;
    
    console.log('Verifying email via OTP...');
    const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester_return@gmail.com',
        otp
      })
    });
    const verifyData = await verifyRes.json();
    const token = verifyData.token;

    if (!token) {
      throw new Error('Verification failed to return token');
    }
    console.log('Logged in successfully, token retrieved.');

    // 4. Place a fresh test order
    console.log('\nPlacing a mock order...');
    const orderRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        items: [
          {
            productId: new mongoose.Types.ObjectId(), // Dummy ID
            qty: 1,
            price: 150
          }
        ],
        totalAmount: 150,
        address: {
          fullName: 'Return Tester',
          street: '123 Test St',
          city: 'Noida',
          postalCode: '201301',
          country: 'India'
        },
        paymentId: 'dummy_pay_id'
      })
    });
    const orderData = await orderRes.json();
    const orderId = orderData._id;

    if (!orderRes.ok || !orderId) {
      throw new Error('Failed to place order');
    }
    console.log(`Placed order successfully. ID: ${orderId}`);

    // 5. Test Return within the 3-day window (Should succeed)
    console.log('\nSetting order status to Delivered...');
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(orderId) },
      { $set: { status: 'Delivered', deliveredAt: new Date() } }
    );

    console.log('\nTesting Return within 3 days (Should succeed)...');
    const returnRes = await fetch(`${API_URL}/orders/${orderId}/return`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const returnData = await returnRes.json();
    console.log('Return request status:', returnRes.status);
    console.log('Return request body status:', returnData.status);

    if (returnRes.status !== 200 || returnData.status !== 'Returned') {
      throw new Error('Failed to return order within eligible window');
    }
    console.log('✅ Eligible return test passed.');

    // 6. Test Return after the 3-day window (Should fail)
    console.log('\nUpdating order creation and delivery timestamp to 4 days ago...');
    
    // Reset order status to Delivered and backdate both createdAt and deliveredAt
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(orderId) },
      { $set: { createdAt: fourDaysAgo, status: 'Delivered', deliveredAt: fourDaysAgo } }
    );

    console.log('Testing Return after 4 days (Should fail with 400)...');
    const expiredReturnRes = await fetch(`${API_URL}/orders/${orderId}/return`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const expiredReturnData = await expiredReturnRes.json();
    console.log('Expired Return status:', expiredReturnRes.status);
    console.log('Expired Return response message:', expiredReturnData.message);

    if (expiredReturnRes.status !== 400 || !expiredReturnData.message.includes('Return window closed')) {
      throw new Error('Backend failed to block expired return request');
    }
    console.log('✅ Expired return block test passed.');

    console.log('\n✅ ALL PRODUCT RETURN POLICY ENFORCEMENT TESTS PASSED SUCCESSFULLY!');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTests();

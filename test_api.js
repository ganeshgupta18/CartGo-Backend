const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Programmatic Authentication Flow Tests ---');
  try {
    // 1. Connect to MongoDB to verify data directly
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cartgo');
    console.log('Connected to MongoDB.');

    // Clean up past test users
    await User.deleteMany({ email: { $in: ['tester123@gmail.com', 'tester_unverified@gmail.com'] } });
    console.log('Cleaned up previous test users.');

    // 2. Register tester123@gmail.com
    console.log('\nTesting User Registration...');
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'tester123@gmail.com',
        password: 'password123'
      })
    });
    const registerData = await registerRes.json();
    console.log('Register response status:', registerRes.status);
    console.log('Register response data:', registerData);

    if (registerRes.status !== 201) {
      throw new Error('Registration failed');
    }

    // 3. Check database to verify user was created and is unverified
    let user = await User.findOne({ email: 'tester123@gmail.com' });
    console.log('\nVerifying user state in Database:');
    console.log('- User Name:', user.name);
    console.log('- isVerified:', user.isVerified);
    console.log('- OTP:', user.verificationOtp);
    console.log('- OTP Expiration:', user.verificationOtpExpires);

    if (user.isVerified !== false || !user.verificationOtp) {
      throw new Error('User was not created in unverified state or has no OTP');
    }

    // 4. Try logging in before verifying (should fail)
    console.log('\nTesting Login prior to Verification (Should fail):');
    const prematureLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester123@gmail.com',
        password: 'password123'
      })
    });
    const prematureLoginData = await prematureLoginRes.json();
    console.log('Premature Login response status:', prematureLoginRes.status);
    console.log('Premature Login response data:', prematureLoginData);

    if (prematureLoginRes.status !== 401 || prematureLoginData.isVerified !== false) {
      throw new Error('Premature login check failed: unverified user allowed or incorrect error payload');
    }

    // 5. Verify email with wrong OTP (should fail)
    console.log('\nTesting OTP verification with incorrect OTP:');
    const wrongVerifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester123@gmail.com',
        otp: '000000'
      })
    });
    console.log('Verify (wrong OTP) status:', wrongVerifyRes.status);
    console.log('Verify (wrong OTP) data:', await wrongVerifyRes.json());

    if (wrongVerifyRes.status === 200) {
      throw new Error('Verify succeeded with invalid OTP');
    }

    // Get the updated OTP from DB because the premature login regenerated it!
    user = await User.findOne({ email: 'tester123@gmail.com' });
    const correctOtp = user.verificationOtp;
    console.log(`\nRetrieved correct OTP from DB: ${correctOtp}`);

    // 6. Verify email with correct OTP (should succeed and return token)
    console.log('\nTesting OTP verification with correct OTP:');
    const correctVerifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester123@gmail.com',
        otp: correctOtp
      })
    });
    const correctVerifyData = await correctVerifyRes.json();
    console.log('Verify (correct OTP) status:', correctVerifyRes.status);
    console.log('Verify (correct OTP) data (token included):', !!correctVerifyData.token);

    if (correctVerifyRes.status !== 200 || !correctVerifyData.token) {
      throw new Error('OTP Verification failed');
    }

    // 7. Verify database shows user is now verified
    user = await User.findOne({ email: 'tester123@gmail.com' });
    console.log('\nDatabase user verified status:', user.isVerified);
    if (user.isVerified !== true) {
      throw new Error('Database isVerified field was not set to true');
    }

    // 8. Test logging in now (should succeed)
    console.log('\nTesting Login after Verification (Should succeed):');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester123@gmail.com',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    console.log('Login response status:', loginRes.status);
    console.log('Login response data (token included):', !!loginData.token);

    if (loginRes.status !== 200 || !loginData.token) {
      throw new Error('Post-verification login failed');
    }

    console.log('\n✅ ALL BACKEND AUTHENTICATION FLOW TESTS PASSED SUCCESSFULLY!');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTests();

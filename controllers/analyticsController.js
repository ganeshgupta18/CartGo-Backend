const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Visit = require('../models/Visit');

const recordVisit = async (req, res) => {
  try {
    let visit = await Visit.findOne({});
    if (!visit) {
      visit = await Visit.create({ count: 1 });
    } else {
      visit.count += 1;
      await visit.save();
    }
    res.json({ success: true, count: visit.count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({});
    const totalProducts = await Product.countDocuments({});
    const totalUsers = await User.countDocuments({ role: 'user' });

    const orders = await Order.find({});
    const totalRevenue = orders.reduce((acc, item) => acc + item.totalAmount, 0);

    const returnedOrders = orders.filter(order => order.status === 'Returned');
    const totalReturnedOrders = returnedOrders.length;
    const totalReturnedAmount = returnedOrders.reduce((acc, item) => acc + item.totalAmount, 0);

    // Calculate 5% admin commission on total revenue
    const adminCommission = totalRevenue * 0.05;

    // Get visitor counts
    const visitRecord = await Visit.findOne({});
    const totalUserVisits = visitRecord ? visitRecord.count : 0;

    res.json({ 
      totalOrders, 
      totalProducts, 
      totalUsers, 
      totalRevenue, 
      totalUserVisits, 
      adminCommission,
      totalReturnedOrders,
      totalReturnedAmount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAdminStats, recordVisit };

const Order = require('../models/Order');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const addOrderItems = async (req, res) => {
  try {
    const { items, totalAmount, address, paymentId, deliveryCharge, deliveryDate } = req.body;
    if (items && items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    } else {
      const computedDeliveryDate = deliveryDate ? new Date(deliveryDate) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const computedDeliveryCharge = deliveryCharge !== undefined ? Number(deliveryCharge) : 0;

      const order = new Order({
        userId: req.user._id,
        items,
        totalAmount,
        address,
        paymentId,
        deliveryCharge: computedDeliveryCharge,
        deliveryDate: computedDeliveryDate
      });
      const createdOrder = await order.save();

      // Format expected delivery date for email
      const deliveryDateStr = computedDeliveryDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Send Order Confirmation Email
      const message = `
        <h2>Order Confirmation</h2>
        <p>Hello ${req.user.name},</p>
        <p>Your order has been successfully placed! Order ID: <strong>${createdOrder._id}</strong></p>
        <p>Total Amount Paid: <strong>₹${totalAmount.toFixed(2)}</strong></p>
        <p>Delivery Charge: <strong>${computedDeliveryCharge === 0 ? 'FREE' : `₹${computedDeliveryCharge.toFixed(2)}`}</strong></p>
        <p>Expected Delivery Date: <strong>${deliveryDateStr} (Delivered within 2 days)</strong></p>
        <p>It will be shipped to: ${address.street}, ${address.city}</p>
        <p>Thank you for shopping with CartGo!</p>
      `;

      await sendEmail({
        email: req.user.email,
        subject: 'CartGo - Order Confirmation',
        message
      });

      res.status(201).json(createdOrder);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).populate('items.productId');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('userId', 'id name');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      const oldStatus = order.status;
      order.status = req.body.status || order.status;
      
      if (order.status === 'Delivered' && oldStatus !== 'Delivered') {
        order.deliveredAt = Date.now();
      }

      const updatedOrder = await order.save();

      // If status changed, send an email notification
      if (oldStatus !== updatedOrder.status) {
        const user = await User.findById(order.userId);
        if (user) {
          const message = `
            <h2>Order Status Update</h2>
            <p>Hello ${user.name},</p>
            <p>We are writing to inform you that your order <strong>#${order._id}</strong> has been updated.</p>
            <p>New Status: <strong style="color: #ea580c;">${updatedOrder.status}</strong></p>
            <p>Thank you for shopping with CartGo!</p>
          `;

          await sendEmail({
            email: user.email,
            subject: `CartGo - Order #${order._id} Status: ${updatedOrder.status}`,
            message
          });
        }
      }

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const returnOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to return this order' });
    }

    if (order.status !== 'Delivered') {
      return res.status(400).json({ message: 'Only delivered orders can be returned.' });
    }

    const deliveredDate = order.deliveredAt || order.updatedAt || order.createdAt;
    const timeElapsed = Date.now() - new Date(deliveredDate).getTime();
    const returnLimit = 3 * 24 * 60 * 60 * 1000;

    if (timeElapsed > returnLimit) {
      return res.status(400).json({ 
        message: 'Return window closed. Products can only be returned within 3 days of delivery.' 
      });
    }

    order.status = 'Returned';
    const updatedOrder = await order.save();

    const userMessage = `
      <h2>Order Return Confirmed</h2>
      <p>Hello ${req.user.name},</p>
      <p>Your return request for order <strong>#${order._id}</strong> has been successfully processed.</p>
      <p>We will contact you shortly regarding the pickup and refund process.</p>
      <p>Thank you for shopping with CartGo!</p>
    `;

    await sendEmail({
      email: req.user.email,
      subject: `CartGo - Order #${order._id} Return Received`,
      message: userMessage
    });

    const adminMessage = `
      <h2>Return Request Notification</h2>
      <p>User <strong>${req.user.name}</strong> (${req.user.email}) has initiated a return for order <strong>#${order._id}</strong>.</p>
      <p>Placed On: ${new Date(order.createdAt).toLocaleDateString()}</p>
      <p>Total Return Refund Amount: <strong>₹${order.totalAmount.toFixed(2)}</strong></p>
      <p>Please log in to the admin panel to inspect details.</p>
    `;

    await sendEmail({
      email: process.env.GMAIL_USER || 'itsganesh1801@gmail.com',
      subject: `CartGo Return Request: Order #${order._id}`,
      message: adminMessage
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addOrderItems, getMyOrders, getOrders, updateOrderStatus, returnOrder };

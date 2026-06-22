const sendEmail = require('../utils/sendEmail');

const sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const emailContent = `
      <h2>New Contact Form Inquiry</h2>
      <p><strong>From Name:</strong> ${name}</p>
      <p><strong>Reply Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p style="background: #f4f4f5; padding: 15px; border-radius: 8px; font-family: monospace;">${message}</p>
    `;

    await sendEmail({
      email: process.env.GMAIL_USER || 'itsganesh1801@gmail.com', // Sends to company email
      subject: `CartGo Inquiry: ${subject}`,
      message: emailContent
    });

    res.status(200).json({ message: 'Your message has been sent successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendContactMessage };

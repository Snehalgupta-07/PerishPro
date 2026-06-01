const nodemailer = require('nodemailer');

const sendDonationEmail = async (shelterEmail, shelterName, donationDetails, storeName) => {
  // If SMTP configs are provided, use them. Otherwise, create a mock test account with ethereal.email
  let transporter;
  
  const hasSMTP = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;
  
  if (hasSMTP) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Generate test SMTP service account from ethereal.email
    console.log("No SMTP settings in .env. Creating Ethereal Email test account...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  const itemsListHtml = donationDetails.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.category}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${item.quantity} ${item.unit}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">$${item.costPrice.toFixed(2)}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: `"PerishPro Donation Service" <no-reply@perishpro.com>`,
    to: shelterEmail,
    subject: `🚨 Incoming Food Donation Dispatch from ${storeName || 'PerishPro Retailer'}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #e5e7eb; padding: 0; border-radius: 16px; background-color: #ffffff; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 700;">Food Donation Dispatch</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">PerishPro Sustainability Network</p>
        </div>
        <div style="padding: 30px; color: #374151;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${shelterName} Team</strong>,</p>
          <p style="font-size: 16px; line-height: 1.5;">We are pleased to inform you that a donation of food supplies has been dispatched and is ready for pickup/delivery.</p>
          
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <strong style="color: #1e3a8a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Dispatch Details</strong><br/>
            <div style="margin-top: 8px; font-size: 15px; line-height: 1.6;">
              🏪 <strong>Store:</strong> ${storeName || 'PerishPro Store'}<br/>
              📅 <strong>Pickup Date:</strong> ${new Date(donationDetails.pickupDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br/>
              📊 <strong>Total Items:</strong> ${donationDetails.totalItemsCount} units
            </div>
          </div>

          <h3 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; color: #111827; margin-top: 30px;">Donated Items List</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 25px; font-size: 14px;">
            <thead>
              <tr style="background-color: #f9fafb; color: #4b5563;">
                <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Product</th>
                <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Category</th>
                <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Value/Unit</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 13px; color: #6b7280; line-height: 1.5;">
            <strong>Quality Assurance Note:</strong> All donated products have been verified via our automated computer vision freshness model and are checked safe for immediate consumption. Please ensure items are stored and consumed according to standard food safety guidelines upon receipt.
          </div>

          <div style="margin-top: 40px; text-align: center; font-size: 14px; color: #9ca3af;">
            Thank you for helping us reduce food waste and feed the community! 💚<br/>
            <strong style="color: #6b7280; display: inline-block; margin-top: 5px;">The PerishPro Team</strong>
          </div>
        </div>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Donation email sent: ${info.messageId}`);
  if (!hasSMTP) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`Ethereal URL: ${previewUrl}`);
    return previewUrl;
  }
  return true;
};

module.exports = { sendDonationEmail };

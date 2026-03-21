const bcrypt = require('bcrypt');
const { z } = require('zod');
const User = require('../Models/user');

// Zod schemas
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  storeName: z.string().max(150).optional(),
  storeAddress: z.string().max(300).optional()
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(.{8,})$/, {
      message:
        'Password must be at least 8 characters long, include an uppercase letter and a special character'
    })
});

// GET /api/user/profile or /api/user/profile/:id
const getUserProfile = async (req, res) => {
  try {
    // isAuthenticated middleware sets req.user (full user doc)
    const requester = req.user;
    const requestedId = req.params.id;

    // If id param provided, fetch that user; otherwise return authenticated user's profile
    const userIdToFetch = requestedId || (requester && requester._id);

    if (!userIdToFetch) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userIdToFetch).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('getUserProfile error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/user/profile
const updateUserProfile = async (req, res) => {
  try {
    // Require authenticated user
    const authUser = req.user;
    if (!authUser || !authUser._id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userId = authUser._id.toString();

    // Validate payload
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    const updates = parsed.data;

    // If email is being updated, ensure uniqueness
    if (updates.email) {
      const existing = await User.findOne({ email: updates.email.toLowerCase(), _id: { $ne: userId } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email is already in use' });
      }
      updates.email = updates.email.toLowerCase();
    }

    // Update and return user (without password)
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, message: 'Profile updated', user: updated });
  } catch (err) {
    console.error('updateUserProfile error', err);
    // Mongoose validation errors
    if (err && err.name === 'ValidationError') {
      const msgs = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ success: false, message: msgs });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/user/password
const updatePassword = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser || !authUser._id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userId = authUser._id.toString();

    const parsed = updatePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    const { currentPassword, newPassword } = parsed.data;

    // fetch user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('updatePassword error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  updatePassword
};

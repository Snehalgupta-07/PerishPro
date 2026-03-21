const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, updatePassword } = require('../Controllers/user');
const { isAuthenticated } = require('../middlewares/auth'); 

router.get('/profile', isAuthenticated, getUserProfile);
router.get('/profile/:id', isAuthenticated, getUserProfile);
router.put('/profile', isAuthenticated, updateUserProfile);
router.put('/password', isAuthenticated, updatePassword);

module.exports = router;
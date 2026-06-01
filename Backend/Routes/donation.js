const express = require('express');
const router = express.Router();
const donationController = require('../Controllers/donation');
const { isAuthenticated } = require('../Middlewares/auth');

router.get('/', isAuthenticated, donationController.listDonations);
router.get('/:id', isAuthenticated, donationController.getDonation);
router.post('/', isAuthenticated, donationController.createDonation);

module.exports = router;

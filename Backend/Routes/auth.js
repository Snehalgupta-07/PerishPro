const express = require('express');
const { handleSignUp, handleSignIn, handleSignOut } = require('../Controllers/auth');

const router = express.Router();

router.post("/sign-up",handleSignUp);
router.post("/sign-in",handleSignIn);
router.post("/sign-out",handleSignOut);

module.exports = router;
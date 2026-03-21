const jwt = require("jsonwebtoken");
const User = require("../Models/user");

const isAuthenticated = async (req, res, next) => {
  try {
    let token = req.body.token || req.headers.authorization;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "UnAuthenticated",
      });
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length).trim();
    }


    const decodedUser = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findById(decodedUser._id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "UnAuthenticated",
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("Failed to Authenticate User", error);
    return res.status(401).json({
      success: false,
      message: "Failed to Authenticate User",
      error: error.message,
    });
  }
};

module.exports = { isAuthenticated };

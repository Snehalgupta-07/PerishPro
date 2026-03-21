// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const User = require("../Models/user");

const userSchemaValidate = z.object({
  name: z
    .string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
    })
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, { message: "Invalid Email Address." }),
  password: z
    .string({ required_error: "Password is Required." })
    .regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(.{8,})$/, { message: "Password must be at least 8 characters long, include an uppercase letter and a special character" }),
  phone: z.string().optional()
});

const generateToken = (userId) => {
  try {
    const token = jwt.sign({ _id: userId }, process.env.JWT_KEY, {
      algorithm: "HS256",
      expiresIn: "7d",
    });

    return token;
  } catch (error) {
    console.error("Error Generating Token", error);
    return "";
  }
};

const handleSignUp = async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
      const validate = userSchemaValidate.safeParse({ name, email, password, phone });
  
      if (!validate.success) {
        const messages = validate.error.issues.map((err) => err.message).join(", ");
        return res.status(400).json({
          success: false,
          message: messages,
        });
      }
  
      // Check existing user
      const foundUser = await User.findOne({ email: email });
      if (foundUser) {
        return res.status(409).json({
          success: false,
          message: "User already exists with this email",
        });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user = new User({
        name,
        email,
        password: hashedPassword,
        phone: phone || "",
      });
  
      await user.save();
  
      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("Error Signing Up", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Issue, Please try again!",
      });
    }
  };
  
const handleSignIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email or Password is required",
      });
    }

    const foundUser = await User.findOne({ email: email }).select("+password");
    if (!foundUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const checkPassword = await bcrypt.compare(password, foundUser.password);
    if (!checkPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(foundUser._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    const userResponse = {
      id: foundUser._id,
      name: foundUser.name,
      email: foundUser.email,
      phone: foundUser.phone,
    };

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Error Signing In", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Issue, Please try again!",
    });
  }
};

const handleSignOut = (req, res) => {
  try {
    res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === "production" });

    return res.status(200).json({
      success: true,
      message: "User signed out successfully",
    });
  } catch (error) {
    console.error("Error signing out", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Issue, Please try again!",
    });
  }
};

module.exports = {
  handleSignUp,
  handleSignIn,
  handleSignOut,
  generateToken,
};

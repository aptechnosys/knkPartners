const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// Register User
exports.registerUser = async (req, res, next) => {
  
  try {

    const { email, password, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      const error = new Error("User already exists");
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.create({
      email,
      password,
      role: role || "agent",
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
    });

  } catch (error) {
    next(error);
  }
};

// Login User
exports.loginUser = async (req, res, next) => {

  
  const { email, password } = req.body;

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    

    if (!user) {
  
  const error = new Error("Invalid email or password");
  error.statusCode = 401;
  return next(error);
}

const isMatch = await user.matchPassword(password);

if (!isMatch) {
  const error = new Error("Invalid email or password");
  error.statusCode = 401;
  return next(error);
}

    // if (!user || !(await user.matchPassword(password))) {
    //   const error = new Error("Invalid email or password");
    //   error.statusCode = 401;
    //   return next(error);
    // }
     
    user.lastLogin = new Date();
        await user.save();

    res.status(200).json({
      success: true,
      token: generateToken(user._id),

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });

  } catch (error) {
    next(error);
  }
};

// GET ALL USERS
exports.getAllUsers = async (req, res, next) => {
  try {

    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    next(error);
  }
};

// get profile details
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(
      req.user.id
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// for change password 
exports.changePassword = async (
  req,
  res
) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    const user =
      await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch =
      await user.matchPassword(
        currentPassword
      );

    if (!isMatch) {
      return res.status(400).json({
        message:
          "Current password is incorrect",
      });
    }

    user.password = newPassword;

    await user.save();

    res.json({
      message:
        "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

 
// Get profile detail
exports.updateProfile = async (req, res) => {
  try {
    

    const user = await User.findById(req.user.id);

    

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;

    await user.save();

    const updatedUser = await User.findById(
      req.user.id
    ).select("-password");

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.log(
      "UPDATE PROFILE ERROR =>",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// Upload Avatar
exports.uploadAvatar = async (
  req,
  res
) => {

  
  try {

    const user =
      await User.findById(
        req.user.id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message:
          "Please upload an image",
      });
    }

    // for avatar
    user.avatar = `/uploads/avatars/${req.file.filename}`;

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Avatar uploaded successfully",

      avatar:
        user.avatar,
    });

  } catch (error) {

    console.log(
      "UPLOAD AVATAR ERROR =>",
      error
    );

    res.status(500).json({
      message:
        error.message,
    });

  }
};
const express = require("express");
const userModel = require("../models/user.model");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const  authController = require("../controllers/auth.controller")


const authRouter = express.Router();

// POST  api/auth/register

authRouter.post("/register", async (req, res) => {
  const { email, username, password, bio, profileImage } = req.body;

  // const isUserExistByEmail = await userModel.findOne({email})

  // if(isUserExistByEmail){
  //     return res.status(409).json({
  //         message: "User already exists with same email"
  //     })
  // }

  // const isUserExistsByUsername = await userModel.findOne({username})

  // if(isUserExistsByUsername){
  //     return res.status(409).json({
  //         message: "user already exist by username"
  //     })
  // }

  // in this above case we are calling the database twice for varification which might result in overload to database , why dont we call it once so that the load on database reduces significiently and make it more efficient

  const isUserAlreadyExists = await userModel.findOne({
    $or: [{ username }, { email }],
  });

  if (isUserAlreadyExists) {
    return res.status(409).json({
      message:
        "User already Exists " +
        (isUserAlreadyExists.email == email
          ? "Email already exists"
          : "Username already exists"),
    });
  }

  const hash = crypto.createHash("sha256").update(password).digest("hex");

  const user = await userModel.create({
    username,
    email,
    bio,
    profileImage,
    password: hash,
  });

  const token = jwt.sign(
    {
      /*
        - user ka data hona chahiye,
        - data unique hona chahiye
    */

      id: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  res.cookie("token", token);

  res.status(200).json({
    message: "User Registered Successfully",
    user: {
      name: user.username,
      email: user.email,
      bio: user.bio,
      profileImage: user.profileImage,
    },
  });
});

authRouter.post("/login", authController.loginController);

module.exports = authRouter;

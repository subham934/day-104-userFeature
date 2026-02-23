const userModel = require("../models/user.model");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");


async function loginController (req, res) {
  const { username, email, password } = req.body;

  /*
      user can either login with either: {username, password} OR {email, password }
    */

  const user = await userModel.findOne({
    $or: [
      {
        // condition - 1
        username: username,
      },
      {
        // condition - 2
        email: email
      },
    ],
  });

  if(!user){
    return res.status(404).json({
        message: "User not found"
    })


  }

  const hash = crypto.createHash('sha256').update(password).digest('hex');

  const isPasswordValid = hash == user.password


  if(!isPasswordValid){
    return res.status(401).json({
        message: "Invalid Password"
    })
  }

  const token = jwt.sign(
    {id: user._id},
    process.env.JWT_SECRET,
    {expiresIn: '1d'}
  )

  res.cookie("token", token)

  res.status(200).json({
    message: "User LoggedIn Successfully",
    user: {
        username: user.username,
        email: user.email,
        bio: user.bio,
        profileImage : user.profileImage
    }
  })
}


module.exports = {
    loginController
}

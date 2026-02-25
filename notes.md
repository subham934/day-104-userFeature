till now, while registering, we used to hash the password and then store it to database and when we used come to login, we convert the password to hash annd compare it to see if it matches our hashed password saved in DB or not. if both are same, we say the password matches or if not then Invalid password.

now for the same thing we install a package called bcryptjs npm i bcryptjs

we could use crypto , but thats for basic level stuff and now we are at prolevel


======================================

=> previously we did manual thing, performing low level code while hashing the password , atfirst we hashed it with :

  const hash = crypto.createHash('sha256').update(password).digest('hex');

and for the confirmation also , we did hased the new password and compared it to our database's hashed password, and it was quite noob thing.

=> Now with bycryptjs we hash it with the code :
const hash = await bcrypt.hash(password, 10) 

=> ✅ 10 = salt rounds (cost factor)

It means:

bcrypt internally random salt generate karta hai

2^10 = 1024 rounds of processing

Zyada rounds = zyada slow = more secure

So 10 is computational cost, not layers.  

=>and now to compare the saved password of database to the new login password we do as below:


    const hash = await bcrypt.compare(password, user.password)

the entire code is as below:

src > controllers > auth.controller.js
--------------------------------------

const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function registerController (req, res)  {
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

  const hash = await bcrypt.hash(password, 10)

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
}

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

  const isPasswordValid =  await bcrypt.compare(password, user.password)


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
  registerController,
    loginController
}


========================================


Lets say we have a post in instagram, it has data like
{
  caption: String,
  img_url : String,
  user: userID,
  createdAt: datetime
}

Now, lets create a model for frontend , for that we need to create a file inside models:

src > models > post.model.js
----------------------------


const mongoose = require("mongoose")


const postSchema = new mongoose.Schema({
    caption: {
        type: String,
        default : ""
    },
    imgUrl: {
        type: String,
        required: [true, "img_url is required for creating a post"]
    },
    <!-- our database name is instagram, and inside it has one collection called "users", and similarly we are creating one more collection called "posts" . This "posts" has a userID apart from caption and imageUrl to tell which user has created this post. the userID should come from "users" collection , now the question arise, which users id is it,  for that we provide a referance as below  -->
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: [true, "user id is required for creating a post"],
    }
})

const postModel = mongoose.model("posts",postSchema)

module.exports = postModel;


==========================================

Now that its done, let's create an api 

=> any file sent from frontend will be received on req.file, bydefault our express server can't read the file sent by our frontend, so to solve the issue , we use a middleware called multer.


src > controllers > post.controller.js
--------------------------------------

const postModel = require("../models/post.model");
const Imagekit = require("@imagekit/nodejs");
const { toFile } = require("@imagekit/nodejs");

const imagekit = new Imagekit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

async function createPostController(req, res) {
  
console.log(req.body, req.file);

  const file = await imagekit.files.upload({
    file: await toFile(Buffer.from(req.file.buffer), "file"),
    fileName: "Test",
  });

  res.send(file);
}

module.exports = { createPostController };




=> now when we go to post.controller.js we can see that the console.log(req.body, req.file);
give response to as below 

[Object: null prototype] { caption: 'my_picture' } {
  fieldname: 'imgUrl',
  originalname: 'WhatsApp Image 2024-11-12 at 9.50.02 AM.jpeg',        
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: <Buffer ff d8 ff e0 00 10 4a 46 49 46 00 01 01 00 00 01 00 01 00 00 ff db 00 84 00 06 06 06 06 07 06 07 08 08 07 0a 0b 0a 0b 0a 0f 0e 0c 0c 0e 0f 16 10 11 10 ... 142196 more bytes>,
  size: 142246

=> this below gives us the detail of the uploaded file and where it is saved in imagekit, the link and everything.

{
    "message": "Post created Successfully",
    "post": {
        "caption": "my_picture",
        "imgUrl": "https://ik.imagekit.io/lq7qd2rhd/cohort-2-instagram/Test_FtRLKtv7_",
        "user": "699c9094be487b06aedaaf8b",
        "_id": "699de887ae64bbc6bca4ebd9",
        "__v": 0
    }
}


src > controllers > post.controller.js
--------------------------------------

const postModel = require("../models/post.model");
const Imagekit = require("@imagekit/nodejs");
const { toFile } = require("@imagekit/nodejs");

const imagekit = new Imagekit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

async function createPostController(req, res) {
  
console.log(req.body, req.file);

  const file = await imagekit.files.upload({
    file: await toFile(Buffer.from(req.file.buffer), "file"),
    fileName: "Test",
  });

  res.send(file);
}

module.exports = { createPostController };


{
    "message": "Post created Successfully",
    "post": {
        "caption": "my_picture",
        "imgUrl": "https://ik.imagekit.io/lq7qd2rhd/cohort-2-instagram/Test_FtRLKtv7_",
        "user": "699c9094be487b06aedaaf8b",
        "_id": "699de887ae64bbc6bca4ebd9",
        "__v": 0
    }
}


===========================================

Today is day-104, yesterday we have created "createPostController" , we have written the entire logic about how our user exist or not, taking token from cookies and checking if its correct or not now we need to create one more api 




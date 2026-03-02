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

go thorough post.controller.js, you'll figure it out.

=======================================

Request
   ↓
app.js
   ↓
post.routes.js
   ↓
identifyUser middleware
   ↓
post.controller.js
   ↓
MongoDB


=> In post.controller.js we can see that , to identify user, we took the token from cookies varify if the token exist or not, if the token do exist, we  varify its the token from that perticular user and then we took the id from that token and did the necessary function as below:



post.controller.js 
------------------

  const token = req.cookies.token

  if(!token){
    return res.status(401).json({
      message: "Unauthorized access"
    })
  }


  let decoded;
  
  try{
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  }
  catch(err){
    return res.status(401).json({
      message: "Token Invalid"
    })
  }

=> this above line is used 3 times in all the 3 controller as below: 

src > controllers > post.controller.js
--------------------------------------

const postModel = require("../models/post.model");
const Imagekit = require("@imagekit/nodejs");
const { toFile } = require("@imagekit/nodejs");
const jwt = require("jsonwebtoken")


const imagekit = new Imagekit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

async function createPostController(req, res) {
  
  // console.log(req.body, req.file);

  const token = req.cookies.token;

  if(!token){
    return res.status(401).json({
      message: "Token not provided, unauthorized access."
    })
  }  

    let decoded = null

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
        return res.status(401).json({
            message: "user not authorized"
        })
    }

  const file = await imagekit.files.upload({
    file: await toFile(Buffer.from(req.file.buffer), "file"),
    fileName: "Test",
    folder: "cohort-2-instagram"
  });

  const post = await postModel.create({
    caption: req.body.caption,
    imgUrl: file.url,
    user:decoded.id
  })

  res.status(201).json({
    message: "Post created Successfully",
    post
  })


}

async function getPostController(req, res) {
  const token = req.cookies.token;
  
  
  if(!token){
    return res.status(401).json({
      message: "Unauthorized access"
    })
  }
  
  // this token helps us find out token from that perticular user, it help us figure out that the request came from that perticular user

  let decoded = null;
  try{
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  }
  catch(err){
    return res.status(401).json({
      message: "Token Invalid"
    })
  }

  const userId = decoded.id;

  const posts = await postModel.find({
    user: userId
  })

  res.status(200)
     .json({
      message: "Posts fetched successfully.",
      posts  
     }) 
    
}

async function getPostDetailsController(req, res){
  
  const token = req.cookies.token

  if(!token){
    return res.status(401).json({
      message: "Unauthorized access"
    })
  }


  let decoded;
  
  try{
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  }
  catch(err){
    return res.status(401).json({
      message: "Token Invalid"
    })
  }

  const userId = decoded.id
  const postId = req.params.postId

  const post = await postModel.findById(postId)

  if(!post){
    return res.status(404).json({
      message: "Post not found."
    })
  }

  // to check if postId is created by that perticular user

  const isValidUser = post.user.toString() === userId

  if(!isValidUser){
    return res.status(403).json({
      message: "Forbidden Content."
    })
  }

  return res.status(200).json({
    message: "Post fetched successfully.",
    post
  })

}

module.exports = { createPostController, getPostController, getPostDetailsController };


=> since the said code is repeated multiple times , the solution to this repetation is middleware, we remove the code from the controller and move it auth.middleware.js

=> server send request to app.js, this app.js forwards request on the basis of router, if the request is related to authentication it will go to authRouter, if it is based on post it will go to postRouter,   we know postRouter has 3 api , 

1. POST /api/posts 
2. GET /api/posts
3. GET /api/posts/details/:postid

=> there are controllers in respect to this apis

1. createPostController
2. getPostController
3. getPostDetailsController


=> these 3 controller are connected with their respective apis. In all these 3 controller , we are doing one common function i.e., identifying the user, for which we have written the same code 3 times. So now what we are gonna do is write that code in other file inside a function caller identifyUser(). the parameter of this function is (req, res, next)



--------------------------------------
src > middlewares > auth.middleware.js
--------------------------------------


const jwt = require("jsonwebtoken");

async function identifyUser(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      message: "Token not provided, unauthorized access.",
    });
  }

  let decoded = null;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      message: "user not authorized",
    });
  }
}

module.exports = identifyUser;



=> the above identifyUser() function will take the token from request and respond us with the data inside the token to state who made the request.

=> identifyUser identify karta hai ki request kis user ne ki hai.

=> ususally request API se controller pe jati hai

=> ab jab api se request controller pe jayegi toh hum pehle api se use identifyUser ko bhejenge phir wo request Controller pe jayegi

=> jab request identifyUser() pe rahegi tab usstime hum reqest main ak naya property add kar sakte hai, uss property ka name hai "req.user"

=> we can name it anything we like eg:  req.trump, req.modi

=> below is the process on how to add that proprty req.user to the variable decoded 

=> after we set the property of req.user = decoded, we need to forward that request to controller, for that we call a function next()

--------------------------------------
src > middlewares > auth.middleware.js
--------------------------------------


const jwt = require("jsonwebtoken");

async function identifyUser(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      message: "Token not provided, unauthorized access.",
    });
  }

  let decoded = null;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      message: "user not authorized",
    });
  }

  req.user = decoded;
  next()
}

module.exports = identifyUser;


=> the below is the process on how we pass a middleware from API to controller

-----------------------------
src > routes > post.routes.js
-----------------------------

const express = require("express");
const postRouter = express.Router();
const postController = require("../controllers/post.controller");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const identifyUser = require("../middlewares/auth.middleware");


postRouter.post(
  "/",
  upload.single("imgUrl"),
  identifyUser,
  postController.createPostController,
);


postRouter.get("/", identifyUser, postController.getPostController);


postRouter.get(
  "/details/:postId", // this is api
  identifyUser, // here is the middleware
  postController.getPostDetailsController, // this is controller
);

module.exports = postRouter;


=> since the controller has access to request , it has got access to req.user and we can implement req.user instead of "decoded" variable as below:



--------------------------------------
src > controllers > post.controller.js
--------------------------------------


const postModel = require("../models/post.model");
const Imagekit = require("@imagekit/nodejs");
const { toFile } = require("@imagekit/nodejs");



const imagekit = new Imagekit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

async function createPostController(req, res) {

  const file = await imagekit.files.upload({
    file: await toFile(Buffer.from(req.file.buffer), "file"),
    fileName: "Test",
    folder: "cohort-2-instagram",
  });

  const post = await postModel.create({
    caption: req.body.caption,
    imgUrl: file.url,
    user: req.user.id,
  });

  res.status(201).json({
    message: "Post created Successfully",
    post,
  });
}

async function getPostController(req, res) {
  // this token helps us find out token from that perticular user, it help us figure out that the request came from that perticular user

  const userId = req.user.id;

  const posts = await postModel.find({
    user: userId,
  });

  res.status(200).json({
    message: "Posts fetched successfully.",
    posts,
  });
}

async function getPostDetailsController(req, res) {
  const userId = req.user.id;
  const postId = req.params.postId;

  const post = await postModel.findById(postId);

  if (!post) {
    return res.status(404).json({
      message: "Post not found.",
    });
  }

  // to check if postId is created by that perticular user

  const isValidUser = post.user.toString() === userId;

  if (!isValidUser) {
    return res.status(403).json({
      message: "Forbidden Content.",
    });
  }

  return res.status(200).json({
    message: "Post fetched successfully.",
    post,
  });
}

module.exports = { createPostController, getPostController, getPostDetailsController };




=> we can't store userId inside user.model.js, the solution is edge collection.


# Edge Collection in MongoDB

---

## 1 What is an Edge Collection?

An **Edge Collection** is a separate collection that stores **relationships between two documents**.

Instead of embedding relationships inside documents (like storing followers array inside user), we create a **dedicated collection** to represent connections.

It’s inspired by graph databases(you don't need to know graph databases yet) where:

* **Node** → User
* **Edge** → Relationship (Follow)

---

## 2 Why Not Store Followers Inside User?

You *could* do this:

```js
{
  _id: userId,
  name: "Ankur",
  followers: [userId1, userId2, userId3],
  following: [userId4, userId5]
}
```

### Problems:

| Problem             | Why It’s Bad                                  |
| ------------------- | --------------------------------------------- |
| Large array growth  | A popular user(celebrity eg: Virat kohli) may have millions of followers |
| Document size limit | MongoDB has 16MB document limit               |
| Hard to scale       | Every follow/unfollow updates same document   |
| Concurrency issues  | High contention on popular users              |

So instead of embedding, we create a **relationship collection**.

---

# 3 Edge Collection for Followers

## Collections Structure

### Users Collection

```js
{
  _id: ObjectId,
  username: String,
  email: String
}
```

---

### Follows Collection (Edge Collection)

```js
{
  _id: ObjectId,
  follower: ObjectId,   // who follows
  following: ObjectId,  // whom they follow
  createdAt: Date
}
```

Here:

* `follower` → source node
* `following` → destination node

This document represents:

> User A follows User B

---

# 4 Real World Example – Instagram Style

Imagine on Instagram:

If **User A follows User B**

We store:

```js
{
  follower: A,
  following: B
}
```

This is exactly how large systems model relationships internally — not via arrays inside user document.

---

# 5 Schema Implementation (Mongoose)

### User Model

```js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: String
});

module.exports = mongoose.model("User", userSchema);
```

---

### Follow Model (Edge Collection)

```js
const mongoose = require("mongoose");

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

followSchema.index({ follower: 1, following: 1 }, { unique: true });

module.exports = mongoose.model("Follow", followSchema);
```

### Why Unique Index?

To prevent:

```
User A follows User B multiple times
```

---

# 6 Follow API (Express)

### Follow User

```js
router.post("/follow/:id", async (req, res) => {
  const followerId = req.user.id;  // from auth middleware
  const followingId = req.params.id;

  if (followerId === followingId) {
    return res.status(400).json({ message: "You can't follow yourself" });
  }

  const follow = await Follow.create({
    follower: followerId,
    following: followingId
  });

  res.json({ message: "Followed successfully" });
});
```

---

### Unfollow User

```js
router.delete("/unfollow/:id", async (req, res) => {
  const followerId = req.user.id;
  const followingId = req.params.id;

  await Follow.findOneAndDelete({
    follower: followerId,
    following: followingId
  });

  res.json({ message: "Unfollowed successfully" });
});
```

---

# 7 Getting Followers List

```js
const followers = await Follow.find({ following: userId })
  .populate("follower", "username email");
```

This means:

> Give me all users who follow this user.

---

# 8 Getting Following List

```js
const following = await Follow.find({ follower: userId })
  .populate("following", "username email");
```

---

# 9 Counting Followers Efficiently

Instead of fetching all documents:

```js
const count = await Follow.countDocuments({ following: userId });
```

---

# 10 Indexing for Performance

Always index:

```js
followSchema.index({ follower: 1 });
followSchema.index({ following: 1 });
```

Why?

Because queries will mostly be:

* Who follows X?
* Who does X follow?

Without index → Full collection scan
With index → O(log n)

---

# 11 Benefits of Edge Collection

| Feature                  | Benefit                    |
| ------------------------ | -------------------------- |
| Separate collection      | Clean separation of data   |
| Scales to millions       | No document growth issue   |
| Easy querying            | Simple find queries        |
| Works well with sharding | High scalability           |
| Graph-like modeling      | Supports complex relations |

---

# 12 Advanced: Mutual Followers (Common Friends)

```js
db.follows.aggregate([
  { $match: { follower: userA } },
  {
    $lookup: {
      from: "follows",
      localField: "following",
      foreignField: "follower",
      as: "mutual"
    }
  }
]);
```

Edge collection makes graph-style queries possible.

---

# 13 When To Use Edge Collection?

Use it when:

* Many-to-many relationships
* High scalability requirement
* Relationship has metadata (timestamp, status)
* Social features (followers, friends, likes, connections)

Avoid it when:

* Relationship is small and bounded
* Low scale application

---

# Final Understanding

Edge collection means:

> Instead of storing relationships inside document,
> Store them as separate documents representing connections.

For followers feature:

* Users = Nodes
* Follows = Edges

That’s scalable system design.




please read notes from :

https://github.com/ankurdotio/cohort-2.0/tree/main/notes
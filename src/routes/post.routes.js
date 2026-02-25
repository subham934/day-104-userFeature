const express = require("express");
const postRouter = express.Router();
const postController = require("../controllers/post.controller");


const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/posts [protected-only valid user can create post]rs
 * req.body - {caption, image-file }
 */

/**
 * /api/posts/
 */

postRouter.post("/",upload.single("imgUrl"), postController.createPostController);


/**
 *  GET /api/posts [protected-only valid user can access] 
 * 
 * here, we will the post created by the perticular user
 */

postRouter.get('/', postController.getPostController)


/**
 * GET /api/posts/details/:postid
 * return a detail aobut specific post with the id. also check whether the post belong to the user that is requesting
 */

postRouter.get('/details/:postId', postController.getPostDetailsController)




module.exports = postRouter;

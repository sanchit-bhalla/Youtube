import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

/*
    - A router object is an isolated instance of middleware and routes. 
    - Think of it as a “mini-application,” . We can add middleware and HTTP method routes (such as get, put, post, and so on) to it just like an application
    - A router behaves like middleware itself.
    - We can use a router for a particular root URL; In this way we separate routes into files or even mini-apps.
*/
const router = Router();

// router.route(path) -  Returns an instance of a single route which you can then use to handle HTTP verbs with optional middleware. Use router.route() to avoid duplicate route naming and thus typing errors.
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// secured routes
// verifyJwt --> If user is logged in i.e accessToken is present, it will add user to the req.user
router.route("/logout").post(verifyJWT, logoutUser);

export default router;

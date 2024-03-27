import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { body, param } from "express-validator";

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

router.route("/refresh-token").post(refreshAccessToken);

router
  .route("/reset-password")
  .post(
    verifyJWT,
    [
      body("oldPassword").isLength({ min: 8 }),
      body("newPassword").isLength({ min: 8 }),
      body("confirmNewPassword").isLength({ min: 8 }),
    ],
    changeCurrentPassword
  );

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/update-details").post(
  verifyJWT,
  [
    body("fullName").notEmpty().escape(), //  escape --> transforms special HTML characters with others that can be represented as text. Basically we are Sanitizing Input
    body("email").normalizeEmail().isEmail(),
  ],
  updateAccountDetails
);

router
  .route("/update-avatar")
  .post(verifyJWT, upload.single("avatar"), updateUserAvatar);

router
  .route("/update-cover-image")
  .post(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router
  .route("/:username")
  .get(verifyJWT, param("username").trim().notEmpty(), getUserChannelProfile);

export default router;

import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  removeFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //  save without validating bcz we don't need to validate here as we just update refreshToken

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for avatar(required) and coverImage
  // upload them to cloudinary
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res
  const { username, email, fullName, password } = req.body;
  // console.log({ username, email, fullName, password });

  // Instead of checking each field individually, we can do this.
  // some - determines whether the specified callback function returns true for any element of an array.
  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // if user already exists with current username or email
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists.");
  }

  /*
    req.files?.avatar is of form
    [
      {
        fieldname: 'avatar',
        originalname: 'blazzer.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        destination: './public/temp',
        filename: 'blazzer.jpg-1710501686466-209382079',
        path: 'public\\temp\\blazzer.jpg-1710501686466-209382079',
        size: 7322
      }
    ],
  */

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar image is required");

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(400, "Avatar image is required");

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // Check if user is created or not
  // Even though it takes 1 extra db call, but using this way we became sure that user has been created or not
  // Also we don't want password and refresh token in the response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering the user.");

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res, next) => {
  // get username or email from req.body
  // find if user exists
  // match password, if user exists
  // Generate access and refrsh token
  // send secure cookie

  const { username, email, password } = req.body;
  if (!username && !email)
    throw new ApiError(400, "Username or Email is required");

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(404, "User does not exist");

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) throw new ApiError(401, "Invalid user credentials!");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // At this point, user (which we fetch using findOne above) has no refreshToken bcz refreshToken is added by generateAccessAndRefreshTokens method but we fetch the user before calling this method.
  // Also we should not send password to the client.
  // So we have 2 options. Either we hit another db query or update the previous user
  // If databse query is an expensive operation, then we should update otherwise we can hit database query 1 more time
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // By default cookies can be modified from frontend. But if we pass below options, then cookies can be modified from server only
  const options = {
    httpOnly: true, // Flags the cookie to be accessible only by the web server
    secure: true, // cookie to be used with HTTPS only.
  };

  // res.cookie() - set the HTTP Set-Cookie header with the options provided.
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // clear cookies and reset the refreshToken
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true, // return the modified document rather than the original
    }
  );

  // Web browsers and other compliant clients will only clear the cookie if the given options is identical to those given to res.cookie(), excluding expires and maxAge.
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // If someone is using mobile app then we need req.body.refreshToken
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, "unauthorized request");

  try {
    // Synchronously verify given token using a secret or a public key to get a decoded token.
    // Decoded token will have the _id which we pass in payload while creating refresh token (generateRefreshToken method in user.model.js)
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // console.log({ decodedRefreshToken });

    const user = await User.findById(decodedRefreshToken?._id);
    if (!user) throw new ApiError(401, "Invalid Refresh token!");

    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(401, "Refresh token is expired!");

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const options = {
      httpOnly: true, // Flags the cookie to be accessible only by the web server
      secure: true, // cookie to be used with HTTPS only.
    };

    // res.cookie() - set the HTTP Set-Cookie header with the options provided.
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Access Token Refreshed successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token!");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    throw new ApiError(422, "Invalid inputs passed", errors?.array());

  const { oldPassword, newPassword, confirmNewPassword } = req.body;

  if (newPassword !== confirmNewPassword)
    throw new ApiError(400, "New password and Confirm password didn't match");

  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "not authorized");

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) throw new ApiError(400, "Invalid Old password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  // this method is called when user is authenticated(logged in). and when user is logged in , we get the user from req.user (see verifyJWT method in auth.middleware.js)
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    throw new ApiError(400, "Invalid fields", errors?.array());

  const { fullName, email } = req.body;

  if (!fullName || !email) throw new ApiError(400, "All fields are required");

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email },
    },
    {
      new: true,
    } // returns the updated user
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

// multer and authentication middleware is required before this
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is misssing");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url)
    throw new ApiError(400, "Error occured while uploading avatar");

  const avatarPublicId = req.user?.avatarPublicId;

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true } // gives updated object
  ).select("-password -refreshToken");

  // Delete previous uploaded avatar from cloudinary
  // It it returns false, it means previous image has not been removed from cloudinary. We need to remove it manually.
  // We could also use transactions and show message to user `Update operation failed. Please try agin later!`
  await removeFromCloudinary(avatarPublicId);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

// multer and authentication middleware is required before this
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath)
    throw new ApiError(400, "Cover Image file is misssing");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url)
    throw new ApiError(400, "Error occured while uploading coverImage");

  const coverImagePublicId = req.user?.coverImagePublicId;

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true } // gives updated object
  ).select("-password -refreshToken");

  // Delete previous uploaded coverImage from cloudinary
  // It it returns false, it means previous image has not been removed from cloudinary. We need to remove it manually.
  // We could also use transactions and show message to user `Update operation failed. Please try agin later!`
  await removeFromCloudinary(coverImagePublicId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Cover Image updated successfully")
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    throw new ApiError(422, "Username is required", errors?.array());

  const { username } = req.params;

  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() },
    },
    {
      // Get all the subscribers of my channel
      $lookup: {
        from: "subscriptions", // model name converted to lowercase and in plural form i.e Subscription --> subscriptions
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // Get all channels which I'm subscribing
      $lookup: {
        from: "subscriptions", // model name converted to lowercase and in plural form i.e Subscription --> subscriptions
        localField: "_id",
        foreignField: "subscriber",
        as: "channels_subscribed",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedCount: { $size: "$channels_subscribed" }, // Count of all the channels which I'm subscribing
        isSubscribed: {
          // if the user(who is viewing(opening) the channel) is subscribed to the channel
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] }, // $in aggregation operator - { $in: [ <expression>, <array expression> ] }. "$subscribers.subscriber" resolves to array of subscriber
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) throw new ApiError(404, "channel does not exists");

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully.")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  // Nested lookup needed bcz
  // 1st lookup gives the history video documents but that documents contains owner Id only
  // To get owner info of that video we need to do nested lookup
  const user = await User.aggregate([
    {
      // req.user._id is a string created by mongoose. But in aggregation pipelines we need mongodb Id
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
  ]);

  if (!user?.length)
    throw new ApiError(500, "Some error occured while fetching watch history.");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully."
      )
    );
});

export {
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
  getWatchHistory,
};

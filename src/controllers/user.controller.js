import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

export { registerUser };

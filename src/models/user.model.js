import mongoose from "mongoose";
import EmailValidator from "email-validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true, // not a validator. It's a convenient helper for building MongoDB unique indexes
      lowercase: true,
      trim: true,
      index: true, // for faster searching on basis of username
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (val) {
          return EmailValidator.validate(val);
        },
        message: "Please provide a valid email",
      },
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
      required: true,
    },
    coverImage: {
      type: String, // cloudinary url
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// add avatarPublicId and coverImagePublicId as virtuals
// We can store public ids in db also along with url (avatar, coverImage)
// In Mongoose, a virtual is a property that is not stored in MongoDB.
userSchema.virtual("avatarPublicId").get(function () {
  // avatar --> http://res.cloudinary.com/dshvoo7qz/image/upload/v1710588859/k501mjof2zzzxac6nt3f.jpg
  // It is of form : http://res.cloudinary.com/cloud_name/image/upload/`v${version}`/public_id.jpg
  return this.avatar
    ?.split(/\bupload\b/)?.[1]
    ?.replace(/^\/v[A-Za-z0-9]+\//, "")
    ?.split(".")?.[0]; // k501mjof2zzzxac6nt3f
});

userSchema.virtual("coverImagePublicId").get(function () {
  // coverImage --> http://res.cloudinary.com/dshvoo7qz/image/upload/v1710588860/jzglj9u6ejf4kguvppko.jpg
  return this.coverImage
    ?.split(/\bupload\b/)?.[1]
    ?.replace(/^\/v[A-Za-z0-9]+\//, "")
    ?.split(".")?.[0]; // jzglj9u6ejf4kguvppko
});

// encrypt password before saving
userSchema.pre("save", async function (next) {
  // We want to encrypt password only when password is changed i.e 1st time or whenever password changes
  // If user changes avatar and save, then we don't want to encrypt it again bcz password is not modified
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// custom document instance methods
userSchema.methods.isPasswordCorrect = async function (password) {
  // bcrypt.compare(plain text, encrypted password)
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY, // expressed in seconds or a string describing a time span zeit/ms. Eg: 60, "2 days", "10h", "7d"
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema); // collection created with name `users` in the db

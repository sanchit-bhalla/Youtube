import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    liked: {
      // Since like can be made on a Video, Community Post(tweet) or Comment.
      // So instead of hardcoding 'ref', we use refPath which basically allow mongoose to dynamically chooses the right Model
      type: Schema.Types.ObjectId,
      refPath: "likedModel", // chooses right Model based on likedModel property
    },
    likedModel: {
      type: String,
      required: true,
      enum: ["Video", "Comment", "Tweet"],
    },
  },
  { timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema); // collection created with name `likes`

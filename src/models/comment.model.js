import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      validate: {
        validator: function (val) {
          console.log("valdator: ", val);
          return /[^\s]/.test(val);
        },
        message: "Comment can not be empty",
      },
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    parent: {
      // Since comment can be made on a Video, Community Post(tweet) or another comment.
      // So instead of hardcoding 'ref', we use refPath which basically allow mongoose to dynamically chooses the right Model
      type: Schema.Types.ObjectId,
      refPath: "parentModel", // chooses right Model based on parentModel property
    },
    parentModel: {
      type: String,
      required: true,
      enum: ["Video", "Comment", "Tweet"],
    },
  },
  { timestamps: true }
);

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema); // collection created with name `comments`

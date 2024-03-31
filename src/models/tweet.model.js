import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, "Tweet content is required"],
      validate: {
        validator: function (val) {
          console.log("valdator: ", val);
          return /[^\s]/.test(val);
        },
        message: "Tweet can not be empty",
      },
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Tweet = mongoose.model("Tweet", tweetSchema); // collection created with name `tweets`

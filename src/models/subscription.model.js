import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      // one who is subscribing
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    channel: {
      // to whom 'subscriber' is subscribing
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Channel is required"],
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);

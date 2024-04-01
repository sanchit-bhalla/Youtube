import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: [1, "Playlist name can't be empty"],
    },
    description: {
      type: String,
      required: true,
    },
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema); // collection created with name `playlists`

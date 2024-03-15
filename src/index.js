// require("dotenv").config({ path: "./env" }); // CommonJs syntax
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

// WAY 1 to connect with DB - connection part not inside index.js
let server;
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("ERR: ", error);
      throw error;
    });

    server = app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port: ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => console.log(`MONGO db connection failed !!! `, err));

// WAY 2 to connect with DB - connection part inside the index.js file
/*
  import mongoose from "mongoose";
  import { DB_NAME } from "./constants";
  import express from "express";
  const app = express();
  
  // IIFE
  (async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    
    // Add listeners in case our express app is not able to listen to the database
    app.on("error", (error) => {
      console.log("ERR: ", error);
      throw error;
    });

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    });
    
  } catch (error) {
    console.error("ERROR: ", error);
    throw error;
  }
})();
*/

// **** Handles all the unhandled rejected promises *******
// Each time there is an unhandled rejection anywhere in our nodejs application, process will emit an event called unhandledRejection
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("Unhandled Exception occured! Shutting down...");

  // To gracefully exit, we first give server some time to handle the existing requests
  server?.close(() => {
    process.exit(1); // 0 for success, 1 for uncaught exception
  });
});

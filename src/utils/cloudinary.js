import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    // console.log("File is uploaded successfully on cloudinary! ", response.url);
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file
    return response;
  } catch (err) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

const removeFromCloudinary = async (publicId, resource_type = "image") => {
  try {
    if (!publicId) return false;

    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type,
      invalidate: true,
    });
    // console.log(response);

    return response;
  } catch (err) {
    return false;
  }
};

export { uploadOnCloudinary, removeFromCloudinary };

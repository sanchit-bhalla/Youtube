import multer from "multer";

const MIME_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "application/pdf": "pdf",
};

const fileFilter = (req, file, cb) => {
  // The function should call `cb` with a boolean to indicate if the file should be accepted
  // You can always pass an error if something goes wrong:

  // valid only if file type should be png or jpeg or jpg or pdf
  const isValid = !!MIME_TYPE[file.mimetype]; // double bang(!!) operator cnverts truthy and falsy values into boolean
  const error = isValid ? null : new Error("Invalid mimetype");
  cb(error, isValid);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    /*
        If same file name already present, then previous file will be replaced by the new file.
        So we should add some kind of unique suffix to each file's name before saving.
        However here when we save file, we upload it to cloudinay and then unlink it from our local server. So can also omit adding extra suffix to make file name unique
    */
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.originalname + "-" + uniqueSuffix); // originalfilename is the name of the file on the user's computer
  },
});

// export const upload = multer({ storage, fileFilter });
export const upload = multer({ storage });

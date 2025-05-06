import {
  DeleteObjectCommand,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import catchAsync from "./catchAsync.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const deleteFileFromS3 = async (fileUrl) => {
  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileUrl.split("/").pop(),
  };

  try {
    await s3.send(new DeleteObjectCommand(deleteParams));
  } catch (error) {
    throw new Error("Error deleting file from S3");
  }
};

export const uploadFileToS3 = async (file) => {
  let fileStream;
  if (process.env.NODE_ENV === "development") {
    fileStream = fs.createReadStream(file.path);
  } else {
    const filePath = path.join("/tmp", file.filename);
    fileStream = fs.createReadStream(filePath);
  }

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${Date.now()}_${path.basename(file.originalname)}`,
    Body: fileStream,
    ContentType: file.mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${params.Key}`;
    fs.unlink(file.path, (err) => {
      if (err) {
        console.error(`Error removing file from server: ${err.message}`);
      } else {
        console.log("File successfully removed from server after upload");
      }
    });
    return fileUrl;
  } catch (error) {
    console.error("Error during S3 upload:", error);
    throw new Error(`Error uploading file: ${error.message}`);
  }
};

const base64ToBuffer = (base64String) => {
  const base64Data = base64String.includes("base64,")
    ? base64String.split("base64,")[1]
    : base64String;
  return Buffer.from(base64Data, "base64");
};

const getMimeType = (base64String) => {
  const match = base64String.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : "image/jpeg";
};

export const uploadBase64ToS3 = async (base64String) => {
  try {
    const mimeType = getMimeType(base64String);
    const fileBuffer = base64ToBuffer(base64String);
    const fileExtension = mimeType.split("/")[1];
    const fileName = `${uuidv4()}_${Date.now()}.${fileExtension}`;
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${params.Key}`;
    console.log("File uploaded to S3:", fileUrl);

    return fileUrl;
  } catch (error) {
    console.error("Error during Base64 to S3 upload:", error);
    throw new Error("Error uploading file to S3");
  }
};

export const uploadBufferToS3 = async (pdfBuffer, fileName) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: pdfBuffer,
    ContentType: "application/pdf",
  };

  try {
    const command = new PutObjectCommand(params);
    const data = await s3.send(command);
    return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload PDF to S3");
  }
};

export const generatePreSignedUrl = catchAsync(async (req, res) => {
  const { fileName, fileType } = req.body;
 console.log(fileName)
 console.log(fileType)
  const uniqueFileName = `${Date.now()}-${fileName}`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: uniqueFileName,
    ContentType: fileType,
  };

  const command = new PutObjectCommand(params);
  const url = await getSignedUrl(s3, command, {
    expiresIn: 3600,
  });

  res.status(200).json({
    url,
    fileKey: uniqueFileName,
  });
});

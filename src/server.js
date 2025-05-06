import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDb from "./db/index.js";
import morgan from "morgan";
import globalErrorHandler from "./middleware/globalErrorHandler.js";
import userRouter from "./routes/userRoutes.js";
import helperRouter from "./routes/helperRoutes.js";
import logger from "./utils/logger.js";
import AppError from "./utils/appError.js";
import { generateDocs, setupSwagger } from "./utils/swagger.js";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 7000;
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/uploads", express.static("uploads"));
app.use(cors());

//await generateDocs();

setupSwagger(app);

const morganFormat = ":method :url :status :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Hello, API working!",
  });
});

app.use("/api/v1/upload-helper", helperRouter);
app.use("/api/v1/user", userRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

connectDb()
  .then(
    app.listen(port, () => {
      console.log(`app is running at port ${port}`);
    })
  )
  .catch((err) => console.log(err));

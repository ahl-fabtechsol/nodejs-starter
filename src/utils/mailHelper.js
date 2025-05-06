import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const createTransporter = () => {
  return nodemailer.createTransport({
    debug: true,
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

const sendMail = async ({
  to,
  subject,
  template,
  templateData = {},
  attachments = [],
}) => {
  try {
    const transporter = createTransporter();
    const templatePath = path.join(__dirname, "../views", `${template}.ejs`);
    const html = await ejs.renderFile(templatePath, templateData);
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email. Please try again later.");
  }
};

export default sendMail;

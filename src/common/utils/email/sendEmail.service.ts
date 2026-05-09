import nodemailer from "nodemailer";
import { EMAIL, PASSWORD } from "../../../config/config.service";
import Mail from "nodemailer/lib/mailer/index";





export const sendEmail = async (mailOptions: Mail.Options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    // tls: {
    //   rejectUnauthorized: false,
    // },
    auth: {
      user: EMAIL,
      pass: PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: EMAIL,
    ...mailOptions
  });
  return info.accepted.length > 0 ? true : false;
};

export const generateOTP = async () => {
  return Math.floor(Math.random() * 900000 + 100000);
}


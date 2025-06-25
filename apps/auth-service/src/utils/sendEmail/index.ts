import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import ejs from 'ejs';
import path from 'node:path';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const renderEmailTempalte = async (templateName: string, data: Record<string, any>): Promise<string> => {
  const templatePath = path.join(process.cwd(), "apps", 'auth-service', "src", "utils", "email-templates", `${templateName}.ejs`);
  const html = await ejs.renderFile(templatePath, data);
  return html;
};

export const sendEmail = async (to: string, subject: string, templateName: string, data: Record<string, any>) => {
  try {
    const html = await renderEmailTempalte(templateName, data);

    const mailOptions = {
      from: `<${process.env.SMTP_USER}`,
      to,
      subject,
      html,
    };
    await transporter.sendMail(mailOptions);

    return true;

  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
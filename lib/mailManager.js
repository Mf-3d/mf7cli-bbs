const nodemailer = require("nodemailer");

// メール送信のあれ
const auth = {
  type: "OAuth2",
  user: process.env.mail_address, // アドレス
  clientId: process.env.client_id, // Client ID
  clientSecret: process.env.client_secret, // Client Secret
  refreshToken: process.env.refresh_token // Reflesh Token
};

// これは...なんだっけ
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth
});

module.exports = {
  send: (subject, to, html) => {
    const mailOptions = {
      from: "mf7cli-BBS",
      subject: ""
    };

    mailOptions.subject = subject;
    mailOptions.to = to;
    mailOptions.html = html;

    transporter.sendMail(mailOptions);
  }
}
# gmail-send
Node module for simplify sending email through the gmail API

Requires enabling the Gmail API with appropriate permissions. To do this, follow step (02) of the answer here: https://stackoverflow.com/questions/51933601/what-is-the-definitive-way-to-use-gmail-with-oauth-and-nodemailer

This will get you the required `clientID`, `clientSecret`,  `accessToken`, and `refreshToken`.

To use this module, require it with, for example: `sendEmail = require('./path/to/index.js')`. Finally, to send email, call `sendEmail(credentials, to, from, subject, message)`.

# gmail-send
Node module to simplify sending email through gmail using googleapis

Requires enabling the Gmail API with appropriate permissions. A quick way to do this is to click the button here: https://developers.google.com/gmail/api/quickstart/nodejs

This will also get you the required client credentials, which must be passed to this module. The credentials must contain at least `{"installed": {"client_id":"string", "client_secret":"string", "redirect_uris": ["string"]}}`. The link above will get this for you. If you want to load this from a file, as described in the above tutorial, the file can be loaded with something like: `const credentials = fs.readFileSync('credentials.json')`

Upon first run, the module will prompt for the appropriate code from the given website to authenticate the OAuth2 token. Thereafter, the credentials are stored in `token.json` and a refreshtoekn will be used without the need for interaction.

To use this module, first install the `googleapis` module with `npm install googleapis`. Then require this module with, for example: `sendEmail = require('./thisfile.js')`. Finally, to send email, call `sendEmail(credentials, to, from, subject, message)`.

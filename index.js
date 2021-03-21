const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const SCOPES = [
	'https://mail.google.com/',
	'https://www.googleapis.com/auth/gmail.modify',
	'https://www.googleapis.com/auth/gmail.compose',
	'https://www.googleapis.com/auth/gmail.send'
];

const TOKEN_PATH = 'token.json';  // The file token.json stores the user's access and refresh tokens, and is created automatically when the authorization flow completes for the first time.

/**
 * Create an OAuth2 client with the given credentials
 * @param {Object} credentials The authorization client credentials containing at least {"installed": {"client_id":"string", "client_secret":"string", "redirect_uris": ["string"]}}
 * @returns {Promise} resolves to the OAuth2 Object
 */
function authorize(credentials) {
	return new Promise(async (resolve, reject) => {
		let oAuth2Client;
		try {
			const {client_secret, client_id, redirect_uris} = credentials.installed;
			oAuth2Client = new google.auth.OAuth2( client_id, client_secret, redirect_uris[0] );
		} catch (err) { reject(`Gmail send - error with credentials: ${err}`); }
		fs.readFile(TOKEN_PATH, (err, token) => {  // Check if we have previously stored a token.
			if (err) resolve(await getNewToken(oAuth2Client));
			oAuth2Client.setCredentials(JSON.parse(token));
			resolve(oAuth2Client);
		});
	});
}

/**
 * Get and store new token after prompting for user authorization, and then execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @returns {Promise} resolves to the oAuth2Client Object
 */
function getNewToken(oAuth2Client) {
	return new Promise((resolve, reject) => {
		let rl;
		try {
			const authUrl = oAuth2Client.generateAuthUrl({
				access_type: 'offline',
				scope: SCOPES
			});
			console.log('Authorize this app by visiting this url:', authUrl);
			rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
		} catch (err) { reject(`Gmail send error in authorization url: ${err}`); }
		rl.question('Enter the code from that page here: ', (code) => {
			rl.close();
			oAuth2Client.getToken(code, (err, token) => {
				if (err) reject('Gmail send - Error retrieving access token', err);
				else {
					oAuth2Client.setCredentials(token);
					fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {  // Store the token to disk for later program executions
						if (err) reject(`Gmail send - error writing token to file: ${err}`);
						else console.info(`Gmail send - Token stored to ${TOKEN_PATH}`);
						resolve(oAuth2Client);
					});
				}
			});
		});
	});
}

/**
 * Create the email body, encoded as base64 as required by the gmail api
 * @param {string} to - email address to send the message to
 * @param {string} from  - email address to send the message to
 * @param {string} subject - the email message subject
 * @param {string} message - the body of the email message
 * @returns {Buffer} the encoded email message
 */
 function makeBody(to, from, subject, message) {
	let str = `Content-Type: text/html; charset="UTF-8"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nto: ${to}\nfrom: ${from}\nsubject: ${subject}\n\n${message}`;
	return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');  // convert to base64url string
}

/**
 * Send the message
 * @param {google.auth.OAuth2} auth - An authorized OAuth2 client.
 * @param {string} to - email address to send the message to
 * @param {string} from  - email address to send the message to
 * @param {string} subject - the email message subject
 * @param {string} message - the body of the email message
 */
function sendMessage(auth, to, from, subject, message) {
	return new Promise((resolve, reject) => {
		const gmail = google.gmail({version: 'v1', auth});
		gmail.users.messages.send({
			auth: auth,
			userId: 'me',
			resource: { raw: makeBody(to, from, subject, message) }
		}, (err, response) => {
			if (err) reject(`Error in sendMessage(): ${err}`);
			else resolve(response);
		});
	});
}

/**
 * Send email using the gmail API. Require this module with, for example, sendEmail = require('./thisfile.js'); and then send email with sendEmail(to,from,subject,message);
 * @param {Object} credentials The authorization client credentials containing at least {"installed": {"client_id":"string", "client_secret":"string", "redirect_uris": ["string"]}}
 * @param {string} to - email address to send the message to
 * @param {string} from  - email address to send the message to
 * @param {string} subject - the email message subject
 * @param {string} message - the body of the email message
 * @param {function(error)} [errHandler] - if supplied, this function will be called with the error passed to it in the event of an error; otherwise, errors will be logged to console.error()
 * @returns {Object} the api response from the gmail api
 */
module.exports = async function (credentials, to, from, subject, message, errHandler) {
	try {
		let oAuth = await authorize(credentials);
		return await sendMessage(oAuth, to, from, subject, message);
	} catch (err) {
		if (errHandler) errHandler(err);
		else console.error(`Error sending gmail message: ${err}`);
		return null;
	}
};

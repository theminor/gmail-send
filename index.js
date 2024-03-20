const https = require('https');
const fs = require('fs');

/**
 * Log or send an error to the provided errHandler function
 * @param {string|Error} errMsg - the Error message to log or send 
 * @param {function(error)} [errHandler] - if supplied, this function will be called with the error passed to it in the event of an error; otherwise, errors will be logged to console.error()
 */
function handleErr(errMsg, errHandler) {
	if (errHandler) errHandler(errMsg);
	else console.error(errMsg);
	return null;
}

/**
 * 
 * @param {string|URL} url - The url to call 
 * @param {Object} options - Request options per NodeJs request (https://nodejs.org/api/http.html#http_http_request_options_callback)
 * @param {string} body - The data to send in the body of the request
 * @returns {Promise<Object>} Resolves to the response to the request (with the respose body added, i.e. {... body: "body"}
 */
function req(url, options, body) {
	options = options || {};
	if ((!options.method) && body) options.method  = 'POST';
	return new Promise((resolve, reject) => {
		const req = https.request(url, options, res => {
			let resDta = '';
			res.on('error', err => reject(`Request - response Error: ${err}`));
			res.on('data', d => resDta += d);
			res.on('end', () => {
				res.body = resDta;  // add a "body" to the response object
				resolve(res);
			});
		});
		req.on('error', err => reject(`Request error: ${err}`));
		req.end(body);
	});
}

/**
 * Refresh the Access token per the Gmail API and update the passed credentials Object (see https://developers.google.com/identity/protocols/oauth2/web-server#httprest_7)
 * @param {Object} credentials - The gmail API credentials in the form {clientId: "", clientSecret: "", refreshToken: "", accessToken: ""}
 * @param {function(error)} [errHandler] - if supplied, this function will be called with the error passed to it in the event of an error; otherwise, errors will be logged to console.error()
 * @param {string} [credentialsPath] - The path to the credentials JSON file storing the gmail API credentials in the form {clientId: "", clientSecret: "", refreshToken: "", accessToken: ""}. Defaults to "./credentials.json"
 * @returns {Promise<string>} Resolves to the new Access Token
 */
async function refreshToken(credentials, errHandler, credentialsPath) {
	let response;
	try {
		let respObj = await req(
			'https://oauth2.googleapis.com/token', 
			{ headers: {Accept: `application/json`, "Content-Type": `application/x-www-form-urlencoded`} },
			`client_id=${credentials.clientId}&client_secret=${credentials.clientSecret}&refresh_token=${credentials.refreshToken}&grant_type=refresh_token`
		);
		response = JSON.parse(respObj.body);
		credentials.accessToken = response['access_token'];  // should update credentials, since passed by reference and not by value
		fs.writeFileSync(credentialsPath, JSON.stringify(credentials));
	} catch (err) { handleErr(`Error refreshing Token or saving credentials to disk: ${err}`, errHandler); }
	return response['access_token'];
}

/**
 * Create the email body, encoded as base64 as required by the gmail api
 * @param {string} to - email address to send the message to
 * @param {string} from  - email address to send the message to
 * @param {string} subject - the email message subject
 * @param {string} message - the body of the email message
 * @param {string} [contentType] - the contenttype for the email message. Can be "text/plain", "text/html", or another supported content type. Defaults to "text/plain"
 * @returns {string} the encoded email message
 */
 function makeEmailBody(to, from, subject, message, contentType) {
	let str = `Content-Type: ${contentType || 'text/plain'}; charset="UTF-8"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nto: ${to}\nfrom: ${from}\nsubject: ${subject}\n\n${message}`;
	return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');  // convert to base64url string
}

/**
 * Send an email using the gmail API
 * @param {Object} credentials - The gmail API credentials in the form {clientId: "", clientSecret: "", refreshToken: "", accessToken: ""}
 * @param {string} to - Email address to send the message to
 * @param {string} from  - Email address to send the message to
 * @param {string} subject - The email message subject
 * @param {string} message - The body of the email message
 * @param {string} [contentType] - the content type for the email message. Can be "text/plain", "text/html", or another supported content type. Defaults to "text/plain"
 * @param {function(error)} [errHandler] - if supplied, this function will be called with the error passed to it in the event of an error; otherwise, errors will be logged to console.error()
 * @param {string} [credentialsPath] - The path to the credentials JSON file storing the gmail API credentials in the form {clientId: "", clientSecret: "", refreshToken: "", accessToken: ""}. Defaults to "./credentials.json"
 * @returns {Promise<Object>} Resolves to the response from the API or null if sending failed
 */
async function sendEmail(credentials, to, from, subject, message, contentType, errHandler, credentialsPath) {
	let response;
	let options = {
		headers: {
			Authorization: `Bearer ${credentials.accessToken}`,
			Accept: `application/json`,
			"Content-Type": `application/json`
		}
	};
	const body = JSON.stringify({raw: makeEmailBody(to, from, subject, message, contentType)});
	try {
		response = await req('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', options, body);
		if (response.statusCode === 401) {  // Unauthorized - Try to refresh an expired token
			options.headers.Authorization = `Bearer ${await refreshToken(credentials, errHandler, credentialsPath)}`;
			response = await req('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', options, body);
		}
	} catch (err) {
		handleErr(`Error sending email: ${err}`, errHandler);
		return null;
	}
	if (!response.statusCode) {
		handleErr(`Failed to send email; No returned Status Code.`, errHandler);
		return null;
	} else if (response.statusCode >= 300) {
		handleErr(`Failed to send email; returned Status Code: ${response.statusCode}`, errHandler);
		return null;
	} else return response;
}

/**
 * Send email using the gmail API. Require this module with, for example, sendEmail = require('./thisfile.js') and then send email with sendEmail(credentials, to, from, subject, message);
 * @param {string} to - email address to send the message to
 * @param {string} from  - email address to send the message to
 * @param {string} subject - the email message subject
 * @param {string} message - the body of the email message
 * @param {string} [contentType] - the contenttype for the email message. Can be "text/plain", "text/html", or another supported content type. Defaults to "text/plain"
 * @param {function(error)} [errHandler] - if supplied, this function will be called with the error passed to it in the event of an error; otherwise, errors will be logged to console.error()
 * @param {string} [credentialsPath] - The path to the credentials JSON file storing the gmail API credentials in the form {clientId: "", clientSecret: "", refreshToken: "", accessToken: ""}. Defaults to "./credentials.json"
 * @returns {Promise<Object>} Resolves to the api response body from the gmail api
 */
module.exports = async function (to, from, subject, message, contentType, errHandler, credentialsPath) {
	let credentials;
	if (!credentialsPath) credentialsPath = './credentials.json';
	try {
		credentials = JSON.parse(fs.readFileSync(credentialsPath));
	} catch (err) {
		// handleErr(`Error loading credentials file from ${credentialsPath || './credentials.json'}`, errHandler);
		// return null;
	}
	if (!credentials || !credentials.clientId) credentials = {clientId: process.env.SENDGMAIL_CLIENTID, clientSecret: process.env.SENDGMAIL_CLIENTSECRET, refreshToken: process.env.SENDGMAIL_REFRESHTOKEN, accessToken: process.env.SENDGMAIL_ACCESSTOKEN}
	if (!credentials || !credentials.clientId) return handleErr(`Error loading credentials file from ${credentialsPath || './credentials.json or from Environment Variables'}`, errHandler);
	else return await sendEmail(credentials, to, from, subject, message, contentType, errHandler, credentialsPath);
};

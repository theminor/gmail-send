const https = require('https');

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

	// ***
	console.log('req():', url, options, body);
	// ***

	return new Promise((resolve, reject) => {
		const req = https.request(url, options, res => {
			let resDta = '';
			res.on('error', err => reject('Request - response error in req(): ' + err + '. Response object: ' + res));
			res.on('data', d => resDta += d);
			res.on('end', () => {
				res.body = resDta;  // add a "body" to the response object
				resolve(res);
			});
		});
		req.on('error', err => reject('Request error in req(): ' + err + '. For request: ' + req));
		req.end(body);
	});
}

/**
 * Refresh the Access token per the Gmail API and update the passed credentials Object (see https://developers.google.com/identity/protocols/oauth2/web-server#httprest_7)
 * @param {Object} credentials - The gmail API credentials in the form {clientId: "", clientSecret: "", refreshToken: "", accessToken: ""}
 * @returns {Promise<string>} Resolves to the new Access Token
 */
async function refreshToken(credentials) {
	// ***
	console.log('refreshToken():', credentials);
	// ***

	let response;
	try {
		response = JSON.parse(await req(
			'https://oauth2.googleapis.com/token', 
			{
				headers: {
					Accept: `application/json`,
					"Content-Type": `application/x-www-form-urlencoded`
				}
			},
			`client_id=${credentials.clientId}&client_secret=${credentials.clientSecret}&refresh_token=${credentials.refreshToken}&grant_type=refresh_token`
		));

		// ***
		console.log('refresh response:', response);
		// ***

		credentials.accessToken = response.body['access_token'];  // should update credentials, since passed by reference and not by value
	} catch (err) {
		return err;
	}
	return response['access_token'];
}

/**
 * Create the email body, encoded as base64 as required by the gmail api
 * @param {string} to - email address to send the message to
 * @param {string} from  - email address to send the message to
 * @param {string} subject - the email message subject
 * @param {string} message - the body of the email message
 * @returns {string} the encoded email message
 */
 function makeEmailBody(to, from, subject, message) {
	let str = `Content-Type: text/html; charset="UTF-8"\nMIME-Version: 1.0\nContent-Transfer-Encoding: 7bit\nto: ${to}\nfrom: ${from}\nsubject: ${subject}\n\n${message}`;
	return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');  // convert to base64url string
}

/**
 * Send an email using the gmail API
 * @param {Object} credentials - The gmail API credentials in the form {clientId: "", clientSecret: "", refreshToken: "", accessToken: ""}
 * @param {string} to - Email address to send the message to
 * @param {string} from  - Email address to send the message to
 * @param {string} subject - The email message subject
 * @param {string} message - The body of the email message
 * @returns {Promise<Object>} Resolves to the response from the API
 */
async function sendEmail(credentials, to, from, subject, message) {
	let response;
	let options = {
		headers: {
			Authorization: `Bearer ${credentials.accessToken}`,
			Accept: `application/json`,
			"Content-Type": `application/json`
		}
	};
	const body = JSON.stringify({raw: makeEmailBody(to, from, subject, message)});

	// ***
	console.log('sendEmail():', options, body);
	// ***

	try {
		response = await req('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', options, body);
		if (response.statusCode === 401) {  // Unauthorized - Try to refresh an expired token
			options.headers.Authorization = `Bearer ${await refreshToken(credentials)}`;
			response = await req('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', options, body);
		}
	} catch (err) {
		return err;
	}
	if (response.statusCode && (response.statusCode >= 300)) console.error('sendEmail() failed; returned Status Code: ' + response.statusCode + '. Response object: ' + response);  // *** TO DO - handle with errorhandler
	return response;
}

/**
 * Send email using the gmail API. Require this module with, for example, sendEmail = require('./thisfile.js') and then send email with sendEmail(credentials, to, from, subject, message);
 * @param {Object} credentials - The gmail API credentials in the form {clientId: "", clientSecret: "", refreshToken: "", accessToken: ""}
 * @param {string} to - email address to send the message to
 * @param {string} from  - email address to send the message to
 * @param {string} subject - the email message subject
 * @param {string} message - the body of the email message
 * @param {function(error)} [errHandler] - if supplied, this function will be called with the error passed to it in the event of an error; otherwise, errors will be logged to console.error()
 * @returns {Promise<Object>} Resolves to the api response from the gmail api
 */
module.exports = async function (credentials, to, from, subject, message, errHandler) {
	// *** TO DO ***
	let resp = await sendEmail(credentials, to, from, subject, message);
	console.log('credentials:', credentials);
	return resp;

	/*
	try {
		return await sendMessage(await authorize(credentials), to, from, subject, message);
	} catch (err) {
		if (errHandler) errHandler(err);
		else console.error(`Error sending gmail message: ${err}`);
		return null;
	}
	*/
};


/**
 * 
 * @param {string|URL} url - The url to call 
 * @param {Object} options - Request options per NodeJs request (https://nodejs.org/api/http.html#http_http_request_options_callback)
 * @param {string} body - The data to send in the body of the request
 * @returns {Promise} Resolves to the response to the request in the form: {body: "body", response: responseObject}
 */
function req(url, options, body) {
	options = options || {};
	if ((!options.method) && body) options.method  = 'POST';
	return new Promise((resolve, reject) => {
		const req = https.request(url, options, res => {
			let resDta = {body: ''};
			if (res.statusCode && (res.statusCode >= 300)) reject('Request - response failed in req(); returned Status Code: ' + res.statusCode + '. Response object: ' + res);
			res.on('error', err => logMsg('Request - response error in req(): ' + err + '. Response object: ' + res));
			res.on('data', d => resDta.body += d);
			res.on('end', () => {
				resDta.reponse = res;  // now resDta = {body: "body", response: responseObject}
				resolve(resDta);
			});
		});
		req.on('error', err => logMsg('Request error in req(): ' + err + '. For request: ' + req));
		req.end(body);
	});
}

/**
 * Refresh the Access token per the Gmail API (see https://developers.google.com/identity/protocols/oauth2/web-server#httprest_7)
 * @param {Object} credentials - The gmail API credentials in the form {clientId: "", clientSecret: "", refreshToken: "", accessToken: ""}
 * @returns {string} The new Access Token
 */
async function refreshToken(credentials) {
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
		credentials.accessToken = response['access_token'];  // should update credentials, since passed by reference and not by value
		return response['access_token'];
	} catch (err) {
		return err;
	}
}

/**
 * Create the email body, encoded as base64 as required by the gmail api
 * @param {string} to - email address to send the message to
 * @param {string} from  - email address to send the message to
 * @param {string} subject - the email message subject
 * @param {string} message - the body of the email message
 * @returns {Buffer} the encoded email message
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
 */
async function sendEmail(credentials, to, from, subject, message) {
	let response = false;
	let options = {
		headers: {
			Authorization: `Bearer ${credentials.accessToken}`,
			Accept: `application/json`,
			"Content-Type": `application/json`
		}
	};
	const body = JSON.stringify({raw: makeEmailBody(to, from, subject, message)});
	try {
		response = await req('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', options, body);
	} catch (err1) {
		try {  // assume the error was due to expired token -- *** TO DO: check the response and actually verify the error before resorting to a token update ***
			options.headers.Authorization = `Bearer ${refreshToken(credentials)}`;
			response = await req('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', options, body);
		} catch (err2) {
			return err2;
		}
	}
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
 * @returns {Object} the api response from the gmail api
 */
module.exports = async function (credentials, to, from, subject, message, errHandler) {
	// *** TO DO ***
	try {
		return await sendMessage(await authorize(credentials), to, from, subject, message);
	} catch (err) {
		if (errHandler) errHandler(err);
		else console.error(`Error sending gmail message: ${err}`);
		return null;
	}
};

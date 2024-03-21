# send-gmail

A very simple Node module with one purpose: to send email through the gmail API. This module simply formats the email message and makes basic API requests through the gmail API. For a more robust email solution, check out [Nodemailer](https://nodemailer.com/)

send-gmail is a tiny module, requires no dependancies, and is a very simple solution to send an email from a Node server using the gmail API.

## Enabling API and Obtaining OAuth Credentials

> ***Please Note that the Google API has changed slightly, but the method below still works. The steps look a little different, especially with regard to the OAuth playground, but the idea is still the same.***

To use this module, enable the Gmail API with appropriate permissions. To do this, first visit the [Google Cloud Platform](https://console.developers.google.com), making sure you are logged in with the Google account for which you want to enable the API. Create a new project if you don't already have one, then, in the Dashboard for your project, enable the Gmail API. From there, you will create new credentials of type `Oauth client ID`. For the Application Type, choose `Web Application` and add `https://developers.google.com/oauthplayground` as an Authorized redirect URI. Once the credentials have been created, you should have a `Client ID` and `Client Secret`.

Now you just need to exchange the credentials for an initial access token, which can easily be done through the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground). Click on the settings/cog icon, select "Use your own OAuth credentials," and enter your `Client ID` and `Client Secret`. Then, in the list of APIs to enable (on the left side of the page), select and authorize `https://mail.google.com` under "Gmail API v1." You will need to complete and allow the authorization process through your google account when prompted. Finally, you can click "Exchange authorisation code for tokens," which will get you your initial `Authorization Token` and your `Refresh Token`.

There is a good (although somewhat outdated) [answer](https://stackoverflow.com/a/51933602) on StackOverflow that walks through this process pretty well with screenshots (some screens have since changed a little).

You will need the resulting credentials which will be passed to send-gmail as an object in the following form:
```
{
    "clientID": "yourClientID",
    "clientSecret": "yourClientSecret",
    "accessToken": "yourAccessToken",
    "refreshToken": "yourRefreshToken"
}
```

## Using the send-gmail Module

To use this module, first install it with `npm install send-gmail`. Then, in your application, require it with, for example: `const sendEmail = require('send-gmail')`.

Finally, to send email, call `await sendEmail(credentials, to, from, subject, message, contentType, errHandler)`, where `credentials` is the path credentials object described above. The parameters, `to`, `from`, `subject`, and `message` are strings contining the relevant email information. `errHandler` is an optional callback function to handle any errors (if not specified, errors will be logged to `console.log()`). `contentType` is the content type for the email message - this can be `text/plain`, `text/html`, or any other supported content type (`contentType` defaults to `text/plain` if not specified).

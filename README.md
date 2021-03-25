# gmail-send

A very simple Node module with one purpose: to send email through the gmail API. This module simply formats the email message and makes basic API requests through the gmail API. For a more robust email solution, check out [Nodemailer](https://nodemailer.com/)

## Enabling API and Obtaining OAuth Credentials

To use this module, enable the Gmail API with appropriate permissions. To do this, first visit the [Google Cloud Platform](https://console.developers.google.com), making sure you are logged in with the Google account for which you want to enable the API. Create a new project if you don't already have one, then, in the Dashboard for your project, enable the Gmail API. From there, you will create new credentials of type `Oauth client ID`. For the Application Type, choose `Web Application` and add `https://developers.google.com/oauthplayground` as an Authorized redirect URI. Once the credentials have been created, you should have a `Client ID` and `Client Secret`.

Now you just need to exchange the credentials for an initial access token, which can easily be done through the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground). Click on the settings/cog icon, select "Use your own OAuth credentials," and enter your `Client ID` and `Client Secret`. Then, in the list of APIs to enable (on the left side of the page), select and authorize `https://mail.google.com` under "Gmail API v1." You will need to complete and allow the authorization process through your google account when prompted. Finally, you can click "Exchange authorisation code for tokens," which will get you your initial `Authorization Token` and your `Refresh Token`.

There is a good (although somewhat outdated) [answer](https://stackoverflow.com/a/51933602) on StackOverflow that walks through this process pretty well with screenshots (some screens have since changed a little).

Store your credentials in a JSON file in the following form:
```
{
    "clientID": "yourClientID",
    "clientSecret": "yourClientSecret",
    "accessToken": "yourAccessToken",
    "refreshToken": "yourRefreshToken"
}
```

## Using the gmail-send Module

To use this module, require it with, for example: `sendEmail = require('./path/to/index.js')`.

Finally, to send email, call `await sendEmail(to, from, subject, message, contentType, errHandler, credentialsPath`), where `credentialsPath` is the path to your credentials JSON file in the following form: `{clientID: "yourClientID", clientSecret: "yourClientSecret", accessToken: "yourAccessToken", refreshToken:"yourRefreshToken"}`. The `credentialsPath` parameter will default to `"./credentials.json"` if not specified. This file should be kept secret, obviously and be sure it is ignored from your repository (already included in `.gitignore` if kept at the default location).

The parameters, `to`, `from`, `subject`, and `message` are strings contining the relevant email information.

`errHandler` is an optional callback function to handle any errors.

`contentType` is the content type for the email message as a string - this can be `text/plain`, `text/html`, or any other supported content type. `contentType` defaults to `text/plain` if not specified.

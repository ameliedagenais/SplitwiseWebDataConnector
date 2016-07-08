// -------------------------------------------------- //
// Module Dependencies
// -------------------------------------------------- //
var express = require('express');
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var http = require('http');
var request = require('request');
var path = require('path');
var config = require('./config.js');              // Get our config info (app id and app secret)
var sys = require('util');
var OAuth = require('Oauth');
var OAuth1_0 = require('oauth-1.0a');

var app = express();

// -------------------------------------------------- //
// Express set-up and middleware
// -------------------------------------------------- //
app.set('port', config.PORT);
app.use(cookieParser());                                    // cookieParser middleware to work with cookies
app.use(express.static(__dirname + '/public'));

// -------------------------------------------------- //
// Variables
// -------------------------------------------------- //
var clientID = config.CLIENT_ID
var clientSecret = config.CLIENT_SECRET
var callbackUrl = config.HOSTPATH + ":" + config.PORT + "/oauthCallback";

    var OAuth = OAuth.OAuth;
    var oauth = new OAuth(
    'https://secure.splitwise.com/api/v3.0/get_request_token',
    'https://secure.splitwise.com/api/v3.0/get_access_token',
    clientID,
    clientSecret,
    '1.0',
    callbackUrl,
    'HMAC-SHA1'
    );

// -------------------------------------------------- //
// Routes
// -------------------------------------------------- //

app.get('/', function(req, res) {
  res.redirect('/requesttoken');
});

// Get a request token
app.get('/requesttoken', function(req, res) {
    
    oauth.getOAuthRequestToken(
      function(error, oauth_token, oauth_token_secret, results)
      {
          if(error) {
            console.log("error: " + error);
          }
          else {
            res.cookie("oauthToken", oauth_token);
            res.cookie("oauthTokenSecret", oauth_token_secret);
            res.redirect('https://secure.splitwise.com/authorize?oauth_token=' + oauth_token);
          }
      }
    );  
 });

 // Once the user authorizes the WDC to use their 
 // Splitwise account we get redirected here. 
app.get('/oauthCallback?', function(req, res) {
    
    var oauth_verifier = req.query['oauth_verifier'];

    oauth.getOAuthAccessToken(
        req.cookies.oauthToken,
        req.cookies.oauthTokenSecret,
        oauth_verifier,
        function(error, oauth_access_token, oauth_access_token_secret, results)
        {
          if(error) {
            console.log("error: " + error);
          }
          else {
            res.cookie("accessToken", oauth_access_token);
            res.cookie("accessTokenSecret", oauth_access_token_secret);
            res.redirect('/index.html');
          }
        }
    );       
 });
 
  // Call the Splitwise API
app.get('/callapi', function(req, res) {
    
    try {
        var token = JSON.parse(req.query.token);
    } catch(e) {
        console.log("error in forward " + req.query.token + " " + e.message);
        res.end();
        return;
    }
    
    var apiParams = Object.assign({}, req.query.passThroughParams);
    apiParams.format = "json";
    apiParams.nojsoncallback = "1";
    
    var reqData = {
      url: req.query.passThroughUrl,
      method: 'GET',
      data: apiParams,
    };
    
    var auth = OAuth1_0({
        consumer: {
            public: clientID,
            secret: clientSecret
        },
        signature_method: 'HMAC-SHA1'
    });
    
    request({
      url: reqData.url,
      method: reqData.method,
      form: auth.authorize(reqData, token)
    }, function(error, response, body)
    {   
      if(!error)
      {
        res.write(body);
      }
      else
        console.log("Error : " + error);
      
      res.end();
      return;
    });        
 });

// -------------------------------------------------- //
// Create and start our server
// -------------------------------------------------- //
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

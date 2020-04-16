/**
 * Modules from the community: package.json
 */
var jwt = require('jsonwebtoken');
var rp = require('request-promise');
var crypto = require('crypto');

var production = 'https://api.paygateway.com/';
var sandbox = 'https://api.pit.paygateway.com/';
var version = '2019-06-27';
var region = 'US';

/**
 * Constructor
 */
var openedge = function (config)
{
    var self = this;

    self.Util = {
        validateArgument: function (arg, name)
        {
            if (arg === null || arg === undefined)
            {
                throw new Error('Required argument missing: ' + name);
            }
        },
        throwInvalidDataError: function (res)
        {
            throw new Error('Invalid response data: ' + JSON.stringify(res));
        },

        buildUrl: function (resource, endpoint, query)
        {
            var url = self.baseUrl;
            if (resource) url = url + '/' + resource;
            if (endpoint) url = url + '/' + endpoint;
            if (query) url = url + '?' + query;

            return url;
        },

        generateAuthToken: function ()
        {
            if (!self.merchant || !self.apiSecret) throw "Auth token could not be genereated: missing data";

            var encodedHeaderJSON = encodeURI(self.Util.generateEncodedJSONHeader());
            var encodedPayLoadJSON = encodeURI(self.Util.generateEncodedPayloadJSON(self.merchant, region));
            var encodedSignature = encodeURI(self.Util.generateHashSignature(encodedHeaderJSON, encodedPayLoadJSON));
            return encodedHeaderJSON + "." + encodedPayLoadJSON + "." + encodedSignature;
        },


        generateEncodedJSONHeader: function ()
        {
            var buff = new Buffer(JSON.stringify(
            {
                alg: "HS256",
                typ: "JWT"
            }));
            var base64data = buff.toString('base64');

            return buff.toString('base64');
        },

        generateHashSignature: function (encodedHeaderJSON, encodedPayLoadJSON)
        {
            var data = encodedHeaderJSON + "." + encodedPayLoadJSON;
            var hash = crypto.createHmac('sha256', self.apiSecret).update(data).digest('utf8');
            var buff = new Buffer(hash);
            return buff.toString('base64');
        },

        generateEncodedPayloadJSON: function ()
        {
            var buff = new Buffer(JSON.stringify(
            {
                accountCredential: self.merchant,
                region: region,
                type: "AuthTokenV2",
                ts: new Date().getTime()
            }));
            return buff.toString('base64');
        }
    };


    self.Util.validateArgument(config.merchant, 'merchant');
    self.Util.validateArgument(config.apiKey, 'apiKey');
    self.Util.validateArgument(config.apiSecret, 'apiSecret');
    self.Util.validateArgument(config.authToken, 'authToken');
    self.Util.validateArgument(config.environment, 'environment');

    self.merchant = config.merchant;
    self.apiKey = config.apiKey;
    self.apiSecret = config.apiSecret;

    self.baseUrl = config.environment === 'Production' ? production : sandbox;

    self.authToken = self.Util.generateAuthToken();

    return self;
};

module.exports = openedge;
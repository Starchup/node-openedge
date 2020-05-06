/**
 * Modules from the community: package.json
 */
var jwt = require('jsonwebtoken');
var rp = require('request-promise');
var crypto = require('crypto');
var uuidv4 = require('uuid/v4');

var production = 'https://api.paygateway.com';
var sandbox = 'https://api.pit.paygateway.com';
var version = '2019-06-27';

var regionToCode = {
    'US': '840',
    'CA': '124',
    'AU': '036',
    'NZ': '554'
};

/**
 * Constructor
 */
var openedge = function (config)
{
    var self = this;

    self.Request = {

        CreateRequest: function (httpMethod, resource, endpoint, body, query)
        {
            self.Util.validateArgument(httpMethod, 'httpMethod');
            self.Util.validateArgument(resource, 'resource');

            var options = {
                uri: self.Util.buildUrl(resource, endpoint, query),
                method: httpMethod,
                headers:
                {
                    'Content-Type': 'application/JSON',
                    'X-GP-Api-Key': self.apiKey,
                    'X-GP-Version': version,
                    'Authorization': 'AuthToken ' + self.authToken,
                    'X-GP-Request-ID': 'MER-' + uuidv4()
                },
                json: true
            };

            if (body) options.body = body;

            return rp(options).then(function (res)
            {
                var response = JSON.parse(res);

                if (response && response.response) return response.response;
                if (response && response.Response) return response.Response;
                if (response && response.results) return response.results;

                throw new Error('No response');
            });
        }
    };

    self.Card = {
        Create: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.cardNumber, 'options.cardNumber');
            self.Util.validateArgument(options.expMonth, 'options.expMonth');
            self.Util.validateArgument(options.expYear, 'options.expYear');

            var body = {
                card:
                {
                    card_number: options.cardNumber,
                    cardholder_name: options.firstName + ' ' + options.lastName,
                    expiry_month: options.expMonth,
                    expiry_year: options.expYear,
                    card_security_code: options.cvv
                },
                customer:
                {
                    first_name: options.firstName,
                    last_name: options.lastName,
                    billing_address:
                    {
                        line1: options.address,
                        postal_code: options.zipcode,
                        city: options.city,
                        country: options.country
                    }
                },
                payment:
                {
                    amount: 0,
                    currency_code: regionToCode[self.region]
                },
                transaction:
                {
                    country_code: regionToCode[self.region],
                    processing_indicators:
                    {
                        create_token: true
                    }
                }
            };

            return self.Request.CreateRequest('POST', 'transactions', 'auths', body).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                var resJSON = xmlP.parse(res);
                if (!resJSON || !resJSON.txn)
                {
                    self.Util.throwInvalidDataError(res);
                }

                if (resJSON.txn.ssl_result === 1)
                {
                    throw new Error('Card could not be tokenized: ' + resJSON.txn.ssl_result_message);
                }

                return {
                    foreignId: resJSON.txn.ssl_token
                };
            });
        },
        Get: function (options)
        {
            return;
        },
        Sale: function (options)
        {
            return;
        },
        Void: function (options)
        {
            return;
        },
        Refund: function (options)
        {
            return;
        }
    };

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
            if (!self.merchant || !self.apiSecret) throw "Auth token could not be generated: missing data";

            var encodedHeaderJSON = self.Util.generateEncodedJSONHeader();
            var encodedPayLoadJSON = self.Util.generateEncodedPayloadJSON(self.merchant, self.region);
            var encodedSignature = self.Util.generateHashSignature(encodedHeaderJSON, encodedPayLoadJSON);
            return self.Util.urlSafe(encodedHeaderJSON + "." + encodedPayLoadJSON + "." + encodedSignature);
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
            var timestamp = new Date().getTime();
            var buff = new Buffer(JSON.stringify(
            {
                account_credential: self.merchant,
                region: self.region,
                type: "AuthTokenV2",
                ts: timestamp
            }));
            return buff.toString('base64');
        },

        urlSafe: function (string)
        {
            return string.split('+').join('-').split('/').join('_');
        }
    };


    self.Util.validateArgument(config.merchant, 'merchant');
    self.Util.validateArgument(config.region, 'region');
    self.Util.validateArgument(config.apiKey, 'apiKey');
    self.Util.validateArgument(config.apiSecret, 'apiSecret');
    self.Util.validateArgument(config.authToken, 'authToken');
    self.Util.validateArgument(config.environment, 'environment');

    self.baseUrl = config.environment === 'Production' ? production : sandbox;

    self.merchant = config.merchant;
    self.region = config.region;
    self.apiKey = config.apiKey;
    self.apiSecret = config.apiSecret;
    self.authToken = self.Util.generateAuthToken();

    return self;
};

module.exports = openedge;
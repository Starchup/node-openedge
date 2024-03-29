/**
 * Modules from the community: package.json
 */
var xmlP = require('fast-xml-parser');
var jwt = require('jsonwebtoken');
var rp = require('request-promise');
var crypto = require('crypto');
var uuidv4 = require('uuid/v4');

var production = 'https://api.paygateway.com';
var sandbox = 'https://api.pit.paygateway.com';

var productionXML = 'https://t3secure.net';
var sandboxXML = 'https://test.t3secure.net';

var version = '2019-06-27';
var xmlVersion = 'XWeb3.11';

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
                    'X-GP-Api-Key': self.apiKey,
                    'X-GP-Version': version,
                    'Authorization': 'AuthToken ' + self.Util.generateAuthToken(),
                    'X-GP-Request-Id': 'MER-' + uuidv4()
                },
                json: true
            };

            if (body) options.body = body;

            return rp(options);
        },

        CreateXMLRequest: function (resource, data)
        {
            self.Util.validateArgument(resource, 'resource');

            return rp.post(
            {
                uri: self.Util.buildXMLUrl(resource),
                form: data,
                headers:
                {
                    'X-GP-Api-Key': self.apiKey,
                    'X-GP-Version': version,
                    'Authorization': 'AuthToken ' + self.Util.generateAuthToken(),
                    'X-GP-Request-ID': 'MER-' + uuidv4()
                }
            }).then(function (res)
            {
                if (res) return xmlP.parse(res);
                else self.Util.throwInvalidDataError(res);
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
                        line1: options.street,
                        postal_code: options.zipcode,
                        city: options.city,
                        state: options.state,
                        country: options.country
                    }
                },
                payment:
                {
                    amount: "0.0",
                    currency_code: regionToCode[self.region]
                },
                transaction:
                {
                    country_code: regionToCode[self.region],
                    processing_indicators:
                    {
                        create_token: true,
                        address_verification_service: false
                    }
                }
            };

            return self.Request.CreateRequest('POST', 'transactions', 'auths', body).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                if (res.status === 'Approved - CSC Mismatch')
                {
                    throw new Error('Card data invalid: CVV');
                }

                if (res.status === 'Approved - AVS Mismatch')
                {
                    throw new Error('Card data invalid: Billing zipcode');
                }

                if (res.status !== 'Approved')
                {
                    throw new Error('Card data invalid: ' + res.status);
                }

                return {
                    foreignId: res.card.token,
                    maskedNumber: res.card.masked_card_number,
                    cardHolderName: res.card.cardholder_name,
                    last4: res.card.masked_card_number.slice(-4),
                    expirationMonth: res.card.expiry_month,
                    expirationYear: res.card.expiry_year,
                    cardType: res.card.type,
                    postalCode: options.zipcode
                };
            });
        },
        Update: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.foreignKey, 'options.foreignKey');
            self.Util.validateArgument(options.cardNumber, 'options.cardNumber');
            self.Util.validateArgument(options.expMonth, 'options.expMonth');
            self.Util.validateArgument(options.expYear, 'options.expYear');

            var creds = self.merchant.split(':');

            if (creds.length !== 3) throw new Error('Credentials invalid');

            var xwebId = creds[0];
            var terminalId = creds[1];
            var authKey = creds[2];

            var expDate = options.expMonth + options.expYear;

            var xmlTransaction = '<GatewayRequest>\n';

            xmlTransaction += '<SpecVersion>' + xmlVersion + '</SpecVersion>\n';
            xmlTransaction += '<POSType>PC</POSType>\n';
            xmlTransaction += '<PinCapabilities>FALSE</PinCapabilities>\n';
            xmlTransaction += '<TrackCapabilities>NONE</TrackCapabilities>\n';
            xmlTransaction += '<XWebID>' + xwebId + '</XWebID>\n';
            xmlTransaction += '<TerminalID>' + terminalId + '</TerminalID>\n';
            xmlTransaction += '<AuthKey>' + authKey + '</AuthKey>\n';
            xmlTransaction += '<TransactionType>AliasUpdateTransaction</TransactionType>\n';
            xmlTransaction += '<Alias>' + options.foreignKey + '</Alias>\n';
            xmlTransaction += '<AcctNum>' + options.cardNumber + '</AcctNum>\n';
            xmlTransaction += '<ExpDate>' + expDate + '</ExpDate>\n';

            xmlTransaction += '</GatewayRequest>\n';

            return self.Request.CreateXMLRequest('x-chargeweb.dll', xmlTransaction).then(function (res)
            {
                if (!res || !res.GatewayResponse)
                {
                    self.Util.throwInvalidDataError(res);
                }

                if (res.GatewayResponse.ResponseCode !== 5)
                {
                    throw new Error('Could not update card: ' + res.GatewayResponse.ResponseDescription);
                }

                var expMonth = String(res.GatewayResponse.ExpDate).slice(-2);
                var expYear = String(res.GatewayResponse.ExpDate).slice(2);

                return {
                    foreignId: options.foreignKey,
                    maskedNumber: res.GatewayResponse.MaskedAcctNum,
                    last4: res.GatewayResponse.MaskedAcctNum.slice(-4),
                    expirationMonth: expMonth,
                    expirationYear: expYear,
                    cardType: res.GatewayResponse.CardType
                };
            });
        },
        Delete: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.foreignKey, 'options.foreignKey');

            var creds = self.merchant.split(':');

            if (creds.length !== 3) throw new Error('Credentials invalid');

            var xwebId = creds[0];
            var terminalId = creds[1];
            var authKey = creds[2];

            var xmlTransaction = '<GatewayRequest>\n';

            xmlTransaction += '<SpecVersion>' + xmlVersion + '</SpecVersion>\n';
            xmlTransaction += '<POSType>PC</POSType>\n';
            xmlTransaction += '<PinCapabilities>FALSE</PinCapabilities>\n';
            xmlTransaction += '<TrackCapabilities>NONE</TrackCapabilities>\n';
            xmlTransaction += '<XWebID>' + xwebId + '</XWebID>\n';
            xmlTransaction += '<TerminalID>' + terminalId + '</TerminalID>\n';
            xmlTransaction += '<AuthKey>' + authKey + '</AuthKey>\n';
            xmlTransaction += '<TransactionType>AliasDeleteTransaction</TransactionType>\n';
            xmlTransaction += '<Alias>' + options.foreignKey + '</Alias>\n';

            xmlTransaction += '</GatewayRequest>\n';

            return self.Request.CreateXMLRequest('x-chargeweb.dll', xmlTransaction).then(function (res)
            {
                if (!res || !res.GatewayResponse)
                {
                    self.Util.throwInvalidDataError(res);
                }

                if (res.GatewayResponse.ResponseCode !== 5)
                {
                    throw new Error('Could not update card: ' + res.GatewayResponse.ResponseDescription);
                }

                return {
                    foreignId: options.foreignKey
                };
            });
        },
        Sale: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.foreignKey, 'options.foreignKey');
            self.Util.validateArgument(options.amount, 'options.amount');

            var body = {
                card:
                {
                    token: options.foreignKey
                },
                payment:
                {
                    amount: String(options.amount.toFixed(2)),
                    currency_code: regionToCode[self.region]
                },
                transaction:
                {
                    country_code: regionToCode[self.region],
                    processing_indicators:
                    {
                        partial_approval: false
                    }
                }
            };
            return self.Request.CreateRequest('POST', 'transactions', 'sales', body).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                if (res.status !== 'Approved')
                {
                    throw new Error(res.status);
                }

                return {
                    foreignId: res.sale_id,
                    amount: parseFloat(res.payment.amount)
                };
            }).catch(function (err)
            {
                // Odd logic to parse out the error JSON from the message
                try
                {
                    if (!err.message || err.message.length < 1) throw err;

                    var jsonStartIndex = err.message.indexOf('{');
                    if (jsonStartIndex < 0) throw err;

                    var saleError = JSON.parse(err.message.substring(jsonStartIndex));

                    var processorError = saleError.processor_response;
                    var cardError = saleError.cardsecurity_response;

                    var additionalErrorMessage = [cardError, processorError].filter(function (e)
                    {
                        return e;
                    }).join(' - ');

                    throw new Error(saleError.status + ': ' + additionalErrorMessage);
                }
                catch (e)
                {
                    throw e;
                }
            });
        },
        Void: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.transactionForeignKey, 'options.transactionForeignKey');

            var body = {};

            return self.Request.CreateRequest('PUT', 'transactions', 'sales/' + options.transactionForeignKey + '/voids', body).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                if (res.status !== 'Voided')
                {
                    throw new Error(res.status);
                }

                return {
                    foreignId: res.sale_id,
                    amount: parseFloat(res.payment.amount)
                };
            });
        },
        Refund: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.foreignKey, 'options.foreignKey');
            self.Util.validateArgument(options.transactionForeignKey, 'options.transactionForeignKey');

            var body = {
                payment:
                {
                    amount: String(options.amount.toFixed(2))
                }
            };

            return self.Request.CreateRequest('POST', 'transactions', 'sales/' + options.transactionForeignKey + '/returns', body).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                if (res.status !== 'Approved')
                {
                    throw new Error(res.status);
                }

                return {
                    foreignId: res.return_id,
                    amount: parseFloat(res.payment.amount)
                };
            });
        },
    };

    self.Terminal = {
        SaleAuth: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.amount, 'options.amount');
            self.Util.validateArgument(options.localKey, 'options.localKey');
            self.Util.validateArgument(options.foreignKey, 'options.foreignKey');

            return self.Request.CreateRequest('POST', 'transactions', 'setup/transport_keys',
            {
                payment:
                {
                    amount: options.amount,
                    invoice_number: options.localKey,
                    reference_id: options.foreignKey
                },
                transaction:
                {
                    type: 'sale'
                },
                receipt:
                {
                    clerk_id: self.displayName
                }
            }).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                if (!res || !res.transport_key)
                {
                    throw new Error('Terminal transaction not prepared');
                }

                return {
                    foreignId: res.transport_key
                };
            });
        },
        SaleRequestData: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.foreignKey, 'options.foreignKey');
            self.Util.validateArgument(options.terminalNetworkAddress, 'options.terminalNetworkAddress');

            var protocol = options.protocol ? options.protocol : 'http://';
            var port = options.port ? options.port : ':8080';

            return {
                uri: protocol + options.terminalNetworkAddress + port + '/v2/pos?Format=JSON&TransportKey=' + options.foreignKey,
                method: 'GET',
                headers:
                {
                    'X-GP-Api-Key': self.apiKey,
                    'X-GP-Version': version,
                    'Authorization': 'AuthToken ' + self.Util.generateAuthToken(),
                    'X-GP-Request-Id': 'MER-' + uuidv4(),
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                json: true
            };
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

        buildXMLUrl: function (resource)
        {
            var url = self.baseXMLUrl;
            if (resource) url = url + '/' + resource;
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
            return crypto.createHmac('sha256', self.apiSecret).update(data).digest('base64');
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


    self.Util.validateArgument(config.displayName, 'displayName');
    self.Util.validateArgument(config.merchant, 'merchant');
    self.Util.validateArgument(config.region, 'region');
    self.Util.validateArgument(config.apiKey, 'apiKey');
    self.Util.validateArgument(config.apiSecret, 'apiSecret');
    self.Util.validateArgument(config.environment, 'environment');

    self.baseUrl = config.environment === 'Production' ? production : sandbox;
    self.baseXMLUrl = config.environment === 'Production' ? productionXML : sandboxXML;

    self.displayName = config.displayName;
    self.merchant = config.merchant;
    self.region = config.region;
    self.apiKey = config.apiKey;
    self.apiSecret = config.apiSecret;

    return self;
};

module.exports = openedge;
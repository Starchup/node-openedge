/**
 * Modules from the community: package.json
 */
var expect = require('chai').expect;

var openedge = require('./openedge.js');
var Openedge = new openedge(
{
    merchant: '',
    apiKey: '',
    apiSecret: '',
    authToken: '',
    environment: '',
});

var customerForeignId, cardForeignId, transactionForeignId;

describe('Customer Methods', function () {

});
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
    environment: 'sandbox',
    region: 'US'
});

var cardForeignId, transactionForeignId;

describe('Card Methods', function ()
{
    it('should create a credit card on openedge', function (done)
    {
        Openedge.Card.Create(
        {
            cardNumber: '5454545454545454',
            expMonth: '12',
            expYear: '20',
            cvv: '400',
            firstName: 'Q',
            lastName: 'Smith',
            street: '1 Secret Road',
            city: 'London',
            country: 'UK',
            zipcode: 'W30 UE'
        }).then(function (cardData)
        {
            expect(cardData).to.exist; // jshint ignore:line
            expect(cardData.foreignId).to.exist; // jshint ignore:line

            cardForeignId = cardData.foreignId;

            done();
        }).catch(done);
    });

    it('should fail to bill the failure amount on openedge', function (done)
    {
        Openedge.Card.Sale(
        {
            foreignKey: cardForeignId,
            amount: 13.01
        }).then(function (saleData)
        {
            done(new Error('Sale did not fail'));
        }).catch(function (err)
        {
            done();
        });
    });

    it('should bill a credit card on openedge', function (done)
    {
        Openedge.Card.Sale(
        {
            foreignKey: cardForeignId,
            amount: 3
        }).then(function (saleData)
        {
            expect(saleData).to.exist; // jshint ignore:line
            expect(saleData.foreignId).to.exist; // jshint ignore:line

            transactionForeignId = saleData.foreignId;

            done();
        }).catch(done);
    });

    it('should refund a credit card on openedge', function (done)
    {
        Openedge.Card.Refund(
        {
            foreignKey: cardForeignId,
            transactionForeignKey: transactionForeignId,
            amount: 2
        }).then(function (refundData)
        {
            expect(refundData).to.exist; // jshint ignore:line
            expect(refundData.foreignId).to.exist; // jshint ignore:line
            done();
        }).catch(done);
    });

    it('should void a credit card on openedge', function (done)
    {
        Openedge.Card.Void(
        {
            foreignKey: cardForeignId,
            transactionForeignKey: transactionForeignId
        }).then(function (voidData)
        {
            expect(voidData).to.exist; // jshint ignore:line
            expect(voidData.foreignId).to.exist; // jshint ignore:line
            done();
        }).catch(done);
    });
});
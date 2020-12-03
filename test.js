/**
 * Modules from the community: package.json
 */
var expect = require('chai').expect;
var uuidv4 = require("uuid/v4");

var rp = require('request-promise');

var openedge = require('./openedge.js');
var Openedge = new openedge(
{
    displayName: 'Starchup Cleaners',
    merchant: '',
    apiKey: '',
    apiSecret: '',
    environment: 'sandbox',
    region: 'US'
});

var localDeviceIP = '192.168.x.x';

var cardForeignId, transactionForeignId;

describe('Card Methods', function ()
{
    it('should create a credit card on openedge', function (done)
    {
        Openedge.Card.Create(
        {
            cardNumber: '4761739001010010',
            expMonth: '12',
            expYear: '22',
            cvv: '201',
            firstName: 'Q',
            lastName: 'Smith',
            street: '2578 600 N',
            city: 'Lindon',
            country: 'UT',
            zipcode: '84042'
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

    it('should refund a sale on openedge', function (done)
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

    it('should void a sale on openedge', function (done)
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

    it('should update a credit card on openedge', function (done)
    {
        Openedge.Card.Update(
        {
            foreignKey: cardForeignId,
            cardNumber: '4761739001010010',
            expMonth: '12',
            expYear: '23'
        }).then(function (updateData)
        {
            expect(updateData).to.exist; // jshint ignore:line
            expect(updateData.foreignId).to.exist; // jshint ignore:line
            expect(updateData.maskedNumber).to.exist; // jshint ignore:line
            expect(updateData.expirationMonth).to.exist; // jshint ignore:line
            expect(updateData.expirationYear).to.exist; // jshint ignore:line
            done();
        }).catch(done);
    });

    it('should delete a credit card on openedge', function (done)
    {
        Openedge.Card.Delete(
        {
            foreignKey: cardForeignId
        }).then(function (deleteData)
        {
            expect(deleteData).to.exist; // jshint ignore:line
            expect(deleteData.foreignId).to.exist; // jshint ignore:line
            done();
        }).catch(done);
    });
});


describe('Terminal Methods', function ()
{
    var terminalTransactionId;

    it('should get terminal auth information', function (done)
    {
        Openedge.Terminal.SaleAuth(
        {
            amount: '0.01',
            localKey: '1235',
            foreignKey: uuidv4()
        }).then(function (saleAuthData)
        {
            expect(saleAuthData).to.exist; // jshint ignore:line
            expect(saleAuthData.foreignId).to.exist; // jshint ignore:line

            terminalTransactionId = saleAuthData.foreignId;

            done();
        }).catch(done);
    });

    it('should get terminal auth information', function (done)
    {
        var saleRequestData = Openedge.Terminal.SaleRequestData(
        {
            foreignKey: terminalTransactionId,
            terminalNetworkAddress: localDeviceIP
        });

        expect(saleRequestData).to.exist; // jshint ignore:line
        expect(saleRequestData.uri).to.exist; // jshint ignore:line
        expect(saleRequestData.json).to.exist; // jshint ignore:line
        expect(saleRequestData.method).to.exist; // jshint ignore:line
        expect(saleRequestData.headers).to.exist; // jshint ignore:line

        rp(saleRequestData).then(function (saleData)
        {
            expect(saleData).to.exist; // jshint ignore:line
            expect(saleData.Status).to.equal('APPROVED');

            done();
        }).catch(function (err)
        {
            done(err);
        });
    });
});
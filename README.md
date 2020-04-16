# node-openedge
Openedgepays API wrapper for Node.js, fully promisified

#### Initialization

```
var integrity = require('node-openedge');
var conf = {
    username: '_your_username_',
    password: '_your_password_'
    merchant: _your_merchant_,
    environment: 'sandbox'
};
var Openedge = new integrity(conf);
```

#### Usage

```
Openedge.Customer.Create(
{
    info:
    {
        id: 1,
        businessName: 'MI6',
        firstName: 'James',
        lastName: 'Bond',
        phone: '(007) 007-0007',
        email: 'james@bond.com'
    },
    address:
    {
        street: '1 Secret Avenue',
        unit: '0',
        city: 'London'
    }
}).then(function (res)
{
    // Mission success
}).catch(function (err)
{
    // Bond blew things up
});
```
```
Openedge.Customer.Update(
{
    foreignKey: __your_customer_id__,
    info:
    {
        id: 1,
        businessName: 'MI6',
        firstName: 'James',
        lastName: 'Smith'
    }
});
```
```
Openedge.Card.Create(
{
    foreignKey: __your_customer_id__,

    nameOnCard: 'Q',
    cardNumber: '_sandbox_card_number_',
    exp: '0199'
});
```
```
Openedge.Card.Sale(
{
    foreignKey: __your_card_id__,
    amount: 1
});
```
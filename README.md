node-openedge
=============
Openedgepays API wrapper for Node.js, fully promisified

## Functionality
* Card Not Present (`transactions` API)
	* Card tokenization
		* Statuses accepted: `Approved`
		* Statuses explicitly not accepted: `Approved - CSC Mismatch` and `Approved - AVS Mismatch`
	* Card update (`XML API only`)
		* Status code accepted: `5`
	* Card deletion (`XML API only`)
		* Status code accepted: `5`
	* Sale with card token
		* Statuses accepted: `Approved`
	* Void sale
		* Statuses accepted: `Voided`
	* Refund amount
		* Statuses accepted: `Approved`
 * Card Present (`transactions` API)
	 * Generate an auth token for use with terminal
	 * Get REQUEST information to send to terminal for charge

## Updating the framework
* `git tag x.x.x`
* `git push --tags`
* `nom publish`
* 
## Initialization

```
var openedge = require('node-openedge');
var conf = {
	displayName: '',
    merchant: '',
    apiKey: '',
    apiSecret: '',
    environment: 'sandbox',
    region: 'US'
};
var Openedge = new openedge(conf);
```

## Usage
See tests https://github.com/Starchup/node-openedge/blob/master/test.js

## Information
* Regions supported (with matching code)
	* `US: 840`
	* `CA: 124`
	* `AU: 036`
	* `NZ: 554`
* API Version used: `2019-06-27`
* XML API Version used: `XWeb3.11`
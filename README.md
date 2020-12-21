node-openedge
=============
Openedgepays API wrapper for Node.js, fully promisified

## Functionality
* Card Not Present
	* Card tokenization
	* Card update
	* Card deletion
	* Sale with card token
	* Void sale
	* Refund amount
 * Card Present
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

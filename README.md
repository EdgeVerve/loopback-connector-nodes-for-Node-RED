# Loopback connector nodes for Node-RED

[Loopback] (https://github.com/strongloop/loopback) is a powerful NodeJS framework to create REST APIs based on declarative 
model definitions. [Node-RED] (https://github.com/node-red/node-red) is yet another porwerful tool to wire together APIs and online services.

This project provides a set of custom Node-RED nodes which can be used to integrate 
Node-RED with any loopback application. 

This integration greatly enhances the existing capabilities of loopback application by allowing to 
observe the application in Node-RED and inject code at runtime without touching the original application.

## Prerequisite

It is required to run Node-RED from within the loopback application. This project provides 
node-red.js module which can be used either in loopback boot script or in server.js to start
Node-RED server. Refer to installation section for more details.

## Installation

### Install this node module 
```
npm install git+https://github.com/sachinhub/loopback-connector-nodes-for-Node-RED.git 

or

npm install git+git@github.com:sachinhub/loopback-connector-nodes-for-Node-RED.git

```
### Start Node-RED Server from loopback application
In your loopback application simply add a new boot script with following code in it

```
var nodeRed = require("loopback-connector-nodes-for-Node-RED");

module.exports = function(server, callback) {
    nodeRed.start({port:22081}, function() {
        callback();
    })
}
```
Upon the application startup, Node-RED server will be available to access on http://localhost:22081/red. 

You can also specify following options while starting Node-RED

```
var options = {
    port: <port number on which Node-RED server to be started>,
    settings: {
        httpAdminRoot: ...,
        httpNodeRoot: ...,
        userDir: ...,
        nodesDir: ...,
        flowFile: ...,
    }
}
// Please see default settings.js file in node_modules/node-red for other options for settings.
```
## More information
Please refer [wiki](https://github.com/EdgeVerve/loopback-connector-nodes-for-Node-RED/wiki/Loopback-connector-for-Node-RED) documentation for more information on installation and usage.

## License
The project is licensed under Apache License , Version 2.0 , See [LICENSE](./LICENSE) for more details.

## Contributing
We welcome contributions. Some of the best ways to contribute are to try things out, file bugs, and join in design conversations. 

### [How to contribute](./CONTRIBUTION.md)

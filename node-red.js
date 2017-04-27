/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var http = require('http');
var express = require('express');

var RED = require('node-red');

module.exports = {
    start : start,
    stop : stop
}

function start(options, callback) {

    // Create an Express app
    var app = express();

    // Add a simple route for static content served from 'public'
    app.use('/', express.static('public'));

    // Create a server
    var server = http.createServer(app); // jshint ignore:line

    // Create the settings object - see default settings.js file for other
    // options
    var settings;
    if (options && options.settings) {
        settings = options.settings;
    } else {
        settings = {
            httpAdminRoot : '/red',
            httpNodeRoot : '/redapi',
            userDir : 'nodered/',
            nodesDir : '../nodes',
            flowFile : 'node-red-flows.json',
            functionGlobalContext : {}
        // enables global context
        };
    }

    // Initialise the runtime with a server and settings
    RED.init(server, settings);

    // Serve the editor UI from /red
    app.use(settings.httpAdminRoot, RED.httpAdmin);

    // Serve the http nodes UI from /api
    app.use(settings.httpNodeRoot, RED.httpNode);

    var port = options ? options.port || 3001 : 3001;

    server.listen(port);

    // Start the runtime
    RED.start();

    setTimeout(callback, 5000);
}

function stop() {
    RED.stop();
}

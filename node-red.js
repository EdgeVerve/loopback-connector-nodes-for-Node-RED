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
    stop : stop,
    RED  : RED
}

function start(options, callback) {
    
    var app = null;
    var server = null;
    var separateSever
    // Atul : if server is passed as part of options, same will be used.
    // server could have been passed as explicit parameter instead of part of options. but this is being done 
    // to support backward compatibility.
    // in future, signature of this can be chagned.
    if (!options.settings.server) {
        app = express();
        // Create a server
        server = http.createServer(app); // jshint ignore:line
    }
    else {
        app = options.settings.server;
        server = options.settings.server.server;
    }
    
    // Add a simple route for static content served from 'public'
    app.use('/', express.static('public'));
    
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
    var adminApp = RED.httpAdmin;
    var redNodes = RED.nodes;
    
    if (!options.settings.server) {
        
        var port = options ? options.port || 3001 : 3001;
        server.listen(port);
        RED.start().then(function () {
            return callback();
        });
    }
    else {
        // Start the runtime - removing earlier timeout implementation!!
        RED.start().then(function () {
            return callback();
        }).otherwise(function (err) {
            console.log('**ERROR : NODE RED WAS NOT STARTED ***' , err);
        });
    }
}

function stop() {
    RED.stop();
}


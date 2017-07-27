/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var oeLogger = require('oe-logger');

module.exports = function(RED) {
    function OeLoggerNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var context = node.callContext.ctx;
        var flowName = config.flowName;
        var message = config.message;
        var levelOfLog = config.levelOfLog;
        var log = oeLogger(flowName);
        log[levelOfLog](context, message);
    }
    RED.nodes.registerType("oe-logger", OeLoggerNode);
};
/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
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
        node.on('input', function(msg) {
            log[levelOfLog](context, message);
            if (msg && msg.next) {
                msg.next(msg);
            }
        });
    }
    RED.nodes.registerType("oe-logger", OeLoggerNode);
};
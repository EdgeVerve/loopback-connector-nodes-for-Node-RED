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
        if (flowName === '') {
            flowName = 'default-flow';
        }
        var levelOfLog = config.levelOfLog;
        if (levelOfLog === '') {
            levelOfLog = 'info';
        }
        var message = {};
        if (config.message !== '') {
            message.message = config.message;
        }
        var log = oeLogger(flowName);
        var addPayload = config.addPayload;
        var addInstance = config.addInstance;
        node.on('input', function(msg) {
            if (msg && msg.payload && addPayload === '1') {
               message.payload = msg.payload; 
            }
            if (msg && msg.ctx && msg.ctx.instance && addInstance === '1') {
                message.instance = msg.ctx.instance;
            }
            if (msg && msg.ctx && msg.ctx.options) {
                context = msg.ctx.options;
            } else if (msg && msg.callContext) {
                context = msg.callContext;
            }
            log[levelOfLog](context, JSON.stringify(message));
            node.send(msg);
        });
    }
    RED.nodes.registerType("oe-logger", OeLoggerNode);
};
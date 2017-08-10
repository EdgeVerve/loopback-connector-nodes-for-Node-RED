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
        this.context = node.callContext.ctx;
        this.flowName = config.flowName;
        if (this.flowName === '') {
            this.flowName = 'default-flow';
        }
        this.levelOfLog = config.levelOfLog;
        if (this.levelOfLog === '') {
            this.levelOfLog = 'info';
        }
        this.message = {};
        if (config.message !== '') {
            this.message.message = config.message;
        }
        this.log = oeLogger(this.flowName);
        this.complete = (config.complete||"payload").toString();
        if (this.complete === "false") {
            this.complete = "payload";
        }
        node.on('input', function(msg) {
            if (this.complete === "true") {
                this.message.msg = msg;
            }
            if (this.complete !== "true") {
                var property = "payload";
                var output = msg[property];
                 if (this.complete !== "false" && typeof this.complete !== "undefined") {
                    property = this.complete;
                    try {
                        output = RED.util.getMessageProperty(msg,this.complete);
                    } catch(err) {
                        output = undefined;
                    }
                }
                this.message[property] = output;
            }
            if (msg && msg.ctx && msg.ctx.options) {
                context = msg.ctx.options;
            } else if (msg && msg.callContext) {
                context = msg.callContext;
            }
            this.log[this.levelOfLog](context, JSON.stringify(this.message));
            node.send(msg);
        });
    }
    RED.nodes.registerType("oe-logger", OeLoggerNode);
};
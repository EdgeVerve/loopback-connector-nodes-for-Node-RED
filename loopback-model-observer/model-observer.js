/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');
var utils = require('../common/utils');

module.exports = function(RED) {

    function ModelObserverNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var modelName = config.modelname;
        var event = config.event;

        var Model = loopback.findModel(modelName, node.callContext);

        node.enabled = true;
        if (Model !== undefined) {

            Model.on(event, function (eventPayload) {
                var ctx = null;
                // If node was created and context was stored then check for payload for callContext
                if (node.callContext && node.callContext.ctx && eventPayload) {
                    ctx = eventPayload.ctx || eventPayload.callContext || eventPayload.options;
                    if (!ctx) {
                        console.log("NODE-RED Error : payload didn't have call context in ctx, callContext or options properties of payload.");
                        return;
                    }
                    if (ctx && ctx.options) {
                        ctx = ctx.options;
                    }
                }

                if (!utils.compareContext(node, { Model: Model, options: { ctx: ctx } } )) {
                    return next();
                }

                if (node.enabled) {
                    var msg = {
                        payload : eventPayload
                    };

                    node.send(msg);
                } else {
                    console.log('node is disabled............');
                }
            });
        }

        node.on('close', function() {
            node.enabled = false;
        });
    }

    RED.nodes.registerType("model-observer", ModelObserverNode);
}

/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');

module.exports = function(RED) {

    function removeOldObservers(Model, id) {

        if (Model._observers === undefined)
            return;

        var types = [ 'access', 'before save', 'after save', 'after access' ];

        for ( var i in types) {

            var observers = Model._observers[types[i]];

            if (observers !== undefined && observers.length !== 0) {

                for ( var j in observers) {
                    var observer = observers[j];

                    var nodeId;

                    // hack to get nodeId.
                    try {
                        nodeId = observer(null, null)();
                        // console.log('node id received from observer = ',
                        // nodeId);
                        if (nodeId === id) {
                            // Id matched. remove this observer
                            // console.log('node id matched. removing this
                            // observer.');
                            observers.splice(j, 1);
                            j--;
                        }
                    } catch (e) {
                    }
                }
            }

        }

    }

    function SyncObserverNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var modelName = config.modelname;
        var method = config.method;

        var Model = loopback.findModel(modelName);

        if (Model !== undefined) {
            // console.log ('Model = ', Model._observers[method][0]);

            // Remove existing observers if any.
            // console.log('observers before removing = ', Model._observers);
            removeOldObservers(Model, node.id);
            // console.log('observers after removing = ', Model._observers);

            Model.observe(method, new observer(node, modelName, method).observe);
        }

        node.on('close', function() {
            // console.log('node is closing. removing observers')
            if (Model != undefined) {
                // console.log('observers before removing = ',
                // Model._observers);
                removeOldObservers(Model, node.id);
                // console.log('observers after removing = ', Model._observers);
            }
        });
    }
    RED.nodes.registerType("sync-observer", SyncObserverNode);
}

var observer = function(node, modelName, methodName) {
    var _node = node;
    var _modelName = modelName;
    var _methodName = methodName;

    this.observe = function(ctx, next) {

        var id = _node.id;

        // sort of an hack to return a function in case this method is called by
        // node itself.
        if (ctx === null && next == null) {
            var getNRId = function() {
                return id;
            };

            return getNRId;
        }

        var msg = {};

        if (ctx.Model !== undefined) {
            msg.payload = ctx.Model.definition.name + '.' + _methodName + ' triggered';
        } else {
            msg.payload = _modelName + '.' + _methodName + ' triggered';
        }

        // msg.next = next;
        msg.ctx = JSON.parse(JSON.stringify(ctx));

        msg.next = function(msg) {

            if (msg.error) {
                return next (msg.error);
            }
            
            // var updatedCtx = msg.ctx;
            var updatedCtx = JSON.parse(JSON.stringify(msg.ctx));
            // console.log('callback function called. returning to loopback.
            // updatedCtx =', updatedCtx);

            if (updatedCtx.query !== undefined) {
                // ctx.query = updatedCtx.query;
                _.assign(ctx.query, updatedCtx.query);
            }

            if (updatedCtx.instance !== undefined) {

                _.assign(ctx.instance, updatedCtx.instance);
                // console.log('new instance = ', ctx.instance);
            }

            if (updatedCtx.data !== undefined) {
                _.assign(ctx.data, updatedCtx.data);
            }
            next();

        }

        _node.send(msg);
    }
}

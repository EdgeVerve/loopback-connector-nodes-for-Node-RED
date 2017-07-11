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

        var types = [ 'access', 'before save', 'after save', 'after access', 'composite loaded'];

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
        // check if autoscope fields are matching for which this observer is being called.
        // with new implementation, ctx.options contains callContext and settings has got autoscope fields
        // below code compares call context of running and saved callContext - if it matches, it will continue with flow
        if (_node.callContext && _node.callContext.ctx && ctx.Model.settings && ctx.Model.settings.autoscope && ctx.Model.settings.autoscope.length > 0) {
            for (var i = 0; i < ctx.Model.settings.autoscope.length; ++i) {
                var field = ctx.Model.settings.autoscope[i];
                if (!ctx.options || !ctx.options.ctx) {
                    return next();
                }
                if (ctx.options.ctx[field] !== _node.callContext.ctx[field])
                    return next();
            }
        }

        var msg = {};

        if (ctx.Model !== undefined) {
            // Ajith: Added following line to add Model to the msg
            msg.Model = ctx.Model;
            msg.payload = ctx.Model.definition.name + '.' + _methodName + ' triggered';
        } else {
            msg.payload = _modelName + '.' + _methodName + ' triggered';
        }
        msg.callContext = _node.callContext;
        // msg.next = next;
        msg.ctx = JSON.parse(JSON.stringify(ctx));

        msg.next = function(msg) {

            var err = {};
            if (_methodName === 'after save' || _methodName === 'after delete') {
                 if (typeof msg.payload === 'string' && msg.payload.startsWith('Error')) {
                    err = new Error(msg.payload);
                    err.retriable = true;
                    return next(err);
                 } else if (typeof msg.error === 'string') {
                     err = new Error(msg.error);
                     err.retriable = true;
                     return next(err);
                 } else if (msg.payload.error || msg.error) {
                    err = new Error(msg.payload.error || msg.error.message);
                    err.retriable = true;
                    return next(err);
                 }      
            } 

            if (msg.payload || msg.payload.error || msg.error) {
                //reporting errors in flow execution back to loopback
                return next(msg.payload.error || msg.error);
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
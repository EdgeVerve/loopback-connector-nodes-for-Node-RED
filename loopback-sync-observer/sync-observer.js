/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');

module.exports = function(RED) {

       function actualRemoveObservers(Model, id, observersCollection , types) {
        if (observersCollection === undefined || observersCollection.length === 0 )
            return;
        for ( var i in types) {
            var observers = observersCollection[types[i]];
            if (observers !== undefined && observers.length !== 0) {
                for ( var j in observers) {
                    var observer = observers[j];
                    var nodeId;
                    try {
                        nodeId = observer(null, null)();
                        if (nodeId === id) {
                            observers.splice(j, 1);
                            j--;
                        }
                    } catch (e) {
                    }
                }
            }

        }

    }

    function removeFsObservers(Model, id, observersCollection , types) {
         if (observersCollection === undefined)
            return;

        for ( var i in types) {

            var observers = observersCollection[types[i]];
            if (observers !== undefined && observers.length !== 0) {
                var actualObservers = observers.observers;
                for ( var j in actualObservers) {
                    var observer = actualObservers[j];
                    var nodeId;
                    try {
                        nodeId = observer.getId();
                        if (nodeId === id) {
                            actualObservers.splice(j, 1);
                            j--;
                        }
                    } catch (e) {
                    }
                }
            }

        }
    }

    function removeOldObservers(Model, id) {
        var types = [ 'access', 'before save','after delete', 'after save', 'after access', 'composite loaded'];
        actualRemoveObservers(Model,id, Model._observers, types);
        var fsTypes = ['after delete', 'after save'];
        removeFsObservers(Model,id, Model._fsObservers, fsTypes);

    }

    function SyncObserverNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var modelName = config.modelname;
        var method = config.method;

        var Model = loopback.findModel(modelName);

        if (Model !== undefined) {

            removeOldObservers(Model, node.id);

            Model.observe(method, new observer(node, modelName, method).observe);
        }

        node.on('close', function() {
            if (Model != undefined) {
                removeOldObservers(Model, node.id);
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

    this.observe.getId = function() {
            return _node.id;
    }

}
/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');

module.exports = function(RED) {

 
    function removeOldObservers(Model, id) {
        var types = [ 'access', 'before save','after delete', 'after save', 'after access', 'composite loaded'];
        actualRemoveObservers(Model,id, Model._observers, types);
        var fsTypes = ['after delete', 'after save'];
        removeFsObservers(Model,id, Model._fsObservers, fsTypes);

    }

    function AsyncObserverNode(config) {
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
    RED.nodes.registerType("async-observer", AsyncObserverNode);
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
        // if node was created with context
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
            msg.payload = ctx.Model.definition.name + '.' + _methodName + ' triggered';
        } else {
            msg.payload = _modelName + '.' + _methodName + ' triggered';
        }
        
        msg.callContext = _node.callContext;

        // msg.next = next;
        msg.ctx = JSON.parse(JSON.stringify(ctx));
        _node.send(msg);

        // return control to loopback application.
        next();
    }

    
    this.observe.getId = function() {
            return _node.id;
    }
}
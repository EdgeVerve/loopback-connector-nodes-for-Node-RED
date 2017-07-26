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

    function SyncObserverNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var modelName = config.modelname;
        var method = config.method;

        var Model = loopback.findModel(modelName, node.callContext);

        if (Model !== undefined) {

            utils.removeOldObservers(Model, node.id);

            Model.observe(method, new observer(node, modelName, method).observe);
        }

        node.on('close', function() {
            if (Model != undefined) {
                utils.removeOldObservers(Model, node.id);
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

        if (!utils.compareContext(_node, ctx)) {
            return next();
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
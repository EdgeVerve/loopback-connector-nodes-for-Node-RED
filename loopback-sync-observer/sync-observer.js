/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');
var utils = require('../common/utils');

module.exports = function (RED) {

    function SyncObserverNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.status({});
        var modelName = config.modelname;
        var method = config.method;
        if(!modelName || modelName.trim()==='') {
            node.status({fill:"red",shape:"dot",text:"ModelName not Set"});
            return  this.warn(RED._("asyncObserver.errors.modelNameNotSet")); 
        }
        if(!method || method.trim()==='') {
            node.status({fill:"red",shape:"dot",text:"Method not Set"});
            return this.warn(RED._("asyncObserver.errors.methodNotSet"));
        }
        var Model = loopback.findModel(modelName, node.callContext);

        if (Model !== undefined) {
            node.status({fill:"green",shape:"dot",text:modelName});

            utils.removeOldObservers(Model, node.id);

            Model.observe(method, new observer(node, modelName, method).observe);
        } else {
            node.status({fill:"red",shape:"dot",text:"Invalid ModelName: " + modelName});
            return this.error(RED._("asyncObserver.errors.modelNameInvalid"));
        }

        node.on('close', function () {
            if (Model != undefined) {
                utils.removeOldObservers(Model, node.id);
            }
        });
    }
    RED.nodes.registerType("sync-observer", SyncObserverNode);
}

var observer = function (node, modelName, methodName) {
    var _node = node;
    var _modelName = modelName;
    var _methodName = methodName;

    this.observe = function (ctx, next) {
        var id = _node.id;

        // sort of an hack to return a function in case this method is called by
        // node itself.
        if (ctx === null && next == null) {
            var getNRId = function () {
                return id;
            };

            return getNRId;
        }

        if (!utils.compareContext(_node, ctx)) {
            return next();
        }

        var msg = {};

        if (ctx.Model) {
            // Ajith: Added following line to add Model to the msg
            msg.Model = ctx.Model;
            msg.payload = ctx.Model.definition.name + '.' + _methodName + ' triggered';
        } else {
            msg.payload = _modelName + '.' + _methodName + ' triggered';
        }
        var callContext = ctx.options || _node.callContext;
        ctx.callContext = JSON.parse(JSON.stringify(callContext));
        msg.ctx = ctx;

        msg.next = function (msg1) {
            ctx.options = callContext;
            var err = msg1.error || (msg1.payload && msg1.payload.error);
            if (err) {
                if (typeof err === 'string') {
                    err = new Error(err);
                    err.retriable = true;
                }
                return next(err);
            }
            if (msg1.ctx.instance) {
                _.assign(ctx.instance, msg1.ctx.instance);
            }
            next();
        }


        _node.send(msg);
    }

    this.observe.getId = function () {
        return _node.id;
    }

}
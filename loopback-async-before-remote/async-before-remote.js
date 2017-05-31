/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');

module.exports = function(RED) {

    function removeOldObservers(Model, id, method) {
        var modelRemotes = Model.app._remotes.listenerTree.before[Model.modelName]
        var remote =  modelRemotes ? (modelRemotes[method] ? modelRemotes[method]._listeners : undefined) : undefined;
        if (remote !== undefined) {
            if(Array.isArray(remote)){
                for (var j in remote) {
                    var remoteMethod = remote[j];

                    var nodeId;

                    // hack to get nodeId.
                    try {
                        remoteMethod({}, function(nId){
                            nodeId = nId
                            
                            if (nodeId === id) {
                                // Id matched. remove this observer
                                // console.log('node id matched. removing this
                                // observer.');
                                remote.splice(j, 1);
                                j--;
                            }
                        })();
                        
                    } catch (e) {
                    }
                }
            } else {
                    // hack to get nodeId.
                    try {
                        remote({}, function(nId){
                            nodeId = nId;
                            //console.log('node id received from observer = ', nodeId);
                            if (nodeId === id) {
                                // Id matched. remove this observer
                                // console.log('node id matched. removing this
                                // observer.');
                                delete modelRemotes[method];
                                //remote.splice(j, 1);
                                //j--;
                            }
                        })();
                        
                    } catch (e) {
                        
                    }
                    
            }
            
        }

    }

    function AsyncBeforeRemoteNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var modelName = config.modelname;
        var method = config.method;

        var Model = loopback.findModel(modelName);

        if (Model !== undefined) {

            // Remove existing observers if any.
            // console.log('observers before removing = ', Model._observers);
            removeOldObservers(Model, node.id, method);
            // console.log('observers after removing = ', Model._observers);

            Model.beforeRemote(method, new observer(node, modelName, method).observe);
        }

        node.on('close', function() {
            // console.log('node is closing. removing observers')
            if (Model != undefined) {
                // console.log('observers before removing = ',
                // Model._observers);
                removeOldObservers(Model, node.id, method);
                // console.log('observers after removing = ', Model._observers);
            }
        });
    }
    RED.nodes.registerType("async-before-remote", AsyncBeforeRemoteNode);
}

var observer = function(node, modelName, methodName) {
    var _node = node;
    var _modelName = modelName;
    var _methodName = methodName;
    var _nodeId;

    this.observe = function(ctx, modelResult, next) {

        var id = _node.id

        // sort of an hack to return a function in case this method is called by
        // node itself.
        if (ctx && Object.keys(ctx).length === 0) {
            next(id);
        } else {

            if ( !(ctx.req && ctx.req.callContext && ctx.req.callContext.ctx) ){
                console.log("callContext not available")
                return next();
            }
            
            var Model = loopback.getModel(_modelName);
            
            // check if autoscope fields are matching for which this observer is being called.
            // with new implementation, ctx.options contains callContext and settings has got autoscope fields
            // below code compares call context of running and saved callContext - if it matches, it will continue with flow
            if (_node.callContext && _node.callContext.ctx && Model.settings && Model.settings.autoscope && Model.settings.autoscope.length > 0) {
                for (var i = 0; i < Model.settings.autoscope.length; ++i) {
                    var field = Model.settings.autoscope[i];
                    if (!ctx.req || !ctx.req.callContext || !ctx.req.callContext.ctx) {
                        return next();
                    }
                    if (ctx.req.callContext.ctx[field] !== _node.callContext.ctx[field])
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
            msg.ctx = ctx;
            _node.send(msg);

            // return control to loopback application.
            next();
            
        }
    }
}
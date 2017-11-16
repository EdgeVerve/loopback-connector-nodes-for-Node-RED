/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var loopback = require('loopback');
var _ = require('lodash');
var utils = require('../common/utils');

module.exports = function (RED) {
    function RemoteMethodNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        if (config.modelName) {
            var Model = loopback.findModel(config.modelName, node.callContext);
            if (Model && config.methodName) {
                Model.remoteMethod(config.methodName, {
                    accepts: [
                        {arg: 'req', type: 'object', 'http': {source: 'req'}},
                        {arg: 'res', type: 'object', 'http': {source: 'res'}} 
                    ],
                    returns : {type:'object', root:true},
                    http: {path: config.url, verb: config.method}
                });
                // Generate different functions for isStatic true / false
                Model[config.methodName] = function(req, res, options, cb) {
                    var msgid = RED.util.generateId();
                    var model=this;
                    node.send({_msgid:msgid,model:model,req:req,res:res,remoteMethodCallBack:cb});
                }
            }
        }

        var node = this;
        node.on('input', function (msg) {
        });
    }

    function RemoteMethodEnd(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function (msg) {
            if (msg.remoteMethodCallBack) {
                msg.payload =  msg.payload || {};
                msg.remoteMethodCallBack(null, msg.payload);
            }
            else {
                 node.send(msg);
            }
        });
    }

    RED.nodes.registerType("remote-method", RemoteMethodNode);

    RED.nodes.registerType("remote-method-end", RemoteMethodEnd);

}
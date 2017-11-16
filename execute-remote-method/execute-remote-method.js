/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');
var utils = require('../common/utils');
var http = require("follow-redirects").http;
var https = require("follow-redirects").https;
var urllib = require("url");
var mustache = require("mustache");
var querystring = require("querystring");

module.exports = function(RED) {
  function ExecuteRemoteMethod(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    

    
    node.enabled = true;
    var _node = this;
    
   
    this.on('input', function (msg) {
      var data = config.data;
      var modelName = config.modelname;
      var methodname = config.methodname;
      
      var usecontext = config.usecontext;
      var contextposition = config.contextposition;
      var waitForCallback = config.callback;
      if (typeof contextposition === 'string') {
        contextposition = parseInt(contextposition);
      }
      if (contextposition < 0)
        contextposition = 0;

      node.status({ fill: "blue", shape: "dot", text: "calling remote method" });
      
      if (msg && msg.executeRemoteMethod && msg.executeRemoteMethod.modelName) {
        modelName = msg.executeRemoteMethod.modelName;
      }
      if (msg && msg.executeRemoteMethod && msg.executeRemoteMethod.data) {
        data = msg.executeRemoteMethod.data;
      }
      if (msg && msg.executeRemoteMethod && msg.executeRemoteMethod.methodname) {
        methodname = msg.executeRemoteMethod.methodname;
      }
      debugger;
      var model = loopback.findModel(modelName, node.callContext);
      
      if (!model) {
        _node.status({
          "fill": "red",
          "shape": "ring",
          "text": "An error occurred - model " + modelName + " not found."
        });
        node.error(e.toString(), "Node red error " + modelName + " not found.");
        msg.payload = "Node RED ERROR - " + modelName + " not found.";
        node.send(msg);
        return;
      }
      var url;
      var opts = null;
      
      var payload;
      if (data) {
        data = JSON.parse(data);
      }
      data = (msg && msg.executeRemoteMethod && msg.executeRemoteMethod.payload) || data ;
      if (data && !Array.isArray(data)) {
        data = [data];
      }
      if (usecontext) {
        if (!data) data = [];
        if (data.length < contextposition) {
          for (var i = data.length; i <= contextposition - 1; ++i) {
            data.push(null);
          }
        }
        data.splice(contextposition, 0, _node.callContext);
      }
      if (waitForCallback) {
        data.push(function () {
          msg.payload = arguments;
          _node.send(msg);
          node.status({});
        });
      }
      
      var remoteMethod = model[methodname];
      var returnValue = remoteMethod.apply(model, data);

      if (!waitForCallback) {
        msg.payload = returnValue;
        node.status({});
        _node.send(msg);
      }
    });
    
    node.on('close', function () {
      node.status({});
      node.enabled = false;
    });
  }
  
  RED.nodes.registerType("execute-remote-method", ExecuteRemoteMethod);
}

/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');

module.exports = function(RED) {


  function DestroyDataNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    var _node = this;

    node.status({});
    var modelName = config.modelname;
    var Model = loopback.findModel(modelName, _node.callContext);
    if (!Model) {
        node.status({
            "fill": "red",
            "shape": "dot",
            "text": !modelName || (modelName && modelName.trim().length === 0) ? "ModelName not Set" : "Invalid ModelName: " + modelName
        });
        return;
    }

    this.on('input', function(msg) {
        node.status({});
        var modelName = config.modelname;
        if(!modelName || modelName.trim()==='') {
            node.status({fill:"red",shape:"dot",text:"ModelName not Set"});
            return  this.warn(RED._("destroyData.errors.modelNameNotSet")); 
        }
        var Model = loopback.findModel(modelName, node.callContext);

        if(Model)
        {
            var instance = new Model(msg.payload);
            instance.delete(msg.callContext, function(err, response) {
                if(err) { 
                    node.status({"fill": "red", "shape": "dot", "text":"An error occurred" });
                    msg.payload = err;
                    node.send([null, msg]);
		        } else {
                    node.status({"fill": "green", "shape": "dot", "text": "Deleted " + response.count + " records successfully"});
                    msg.payload = response;
                    node.send([msg, null]);
		        }


            });
        } else {
            node.status({fill:"red",shape:"dot",text:"Invalid ModelName: " + modelName});
            return this.error(RED._("destroyData.errors.modelNameInvalid"));
        }

    });

    node.on('close', function () {
        node.status({});
        var modelName = config.modelname;
        var Model = loopback.findModel(modelName, _node.callContext);
        if (!Model) {
            node.status({
                "fill": "red",
                "shape": "dot",
                "text": "Invalid ModelName: " + modelName
            });
        }
    });
  }
  RED.nodes.registerType("destroy-data", DestroyDataNode);
}


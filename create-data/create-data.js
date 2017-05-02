/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');

module.exports = function(RED) {


  function CreateDataNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('input', function(msg) {
        node.status({});
        var modelName = config.modelname;
        var dataStr = (config.data === undefined || config.data === null || config.data.trim() === "") ? msg.payload : config.data;
        var data = (typeof dataStr === "string") ? JSON.parse(dataStr) : dataStr;	
   
        console.log("INPUT", modelName, data);

        var Model = loopback.findModel(modelName);

        if(Model)
        {
            Model.upsert(data, msg.callContext, function(err, response) {
                if(err) { 
		    console.log(err);
                    node.status({"fill": "red", "shape": "dot", "text":"An error occurred" });
		} else {
                    node.status({"fill": "green", "shape": "dot", "text": "Upserted data successfully"});
		}
                msg.payload = response;
                node.send([msg, {payload: err}]);
            });
        }
	else
	{
	    node.status({"fill": "red", "shape": "dot", "text":"Model " + modelName + " not found" });
	    node.send([null, {payload: new Error("Model " + modelName + " not found")}]);
	}

    });

    node.on('close', function() {
        node.status({});
        var modelName = config.modelname;
        var Model = loopback.findModel(modelName);
        if(!Model)
	{
	    node.status({"fill": "red", "shape": "dot", "text": "ERROR: Model with name " + modelName + " does not exist"});
	}
    });
  }
  RED.nodes.registerType("create-data", CreateDataNode);
}


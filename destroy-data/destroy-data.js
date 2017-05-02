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
    var filter;
    this.on('input', function(msg) {
        node.status({});
        var modelName = config.modelname;
	if(config.filter !== undefined && typeof config.filter === 'string') filter = JSON.parse(config.filter); 
	if(config.filter !== undefined && typeof config.filter === 'object') filter = config.filter; 

        if(!filter) filter = msg.filter;
        if(!filter) {
	    node.status({"fill": "red", "shape": "dot", "text":"No filter supplied" });
            node.send([null,{payload: new Error("No filter supplied")} ]);
            return;
	}

        console.log("INPUT", modelName, filter);

        var Model = loopback.findModel(modelName);

        if(Model)
        {
            Model.destroyAll(filter, msg.callContext, function(err, response) {
                if(err) { 
		    console.log(err);
                    node.status({"fill": "red", "shape": "dot", "text":"An error occurred" });
		} else {
                    node.status({"fill": "green", "shape": "dot", "text": "Deleted " + response.count + " records successfully"});
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
  RED.nodes.registerType("destroy-data", DestroyDataNode);
}


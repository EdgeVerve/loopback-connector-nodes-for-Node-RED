/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');

module.exports = function (RED) {


	function CreateDataNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;
        var _node = this;
		this.on('input', function (msg) {
			node.status({});
			var modelName = config.modelname;
			var dataStr = (config.data === undefined || config.data === null || config.data.trim() === "") ? msg.payload : config.data;
			var data = (typeof dataStr === "string") ? JSON.parse(dataStr) : dataStr;
            var Model = loopback.findModel(modelName, node.callContext);

			if (Model) {
				Model.upsert(data, msg.callContext, function (err, response) {
					if (err) {
						node.status({
							"fill": "red",
							"shape": "dot",
							"text": "An error occurred"
						});
						msg.payload = err;
						node.send([null, msg]);
					} else {
						node.status({
							"fill": "green",
							"shape": "dot",
							"text": "Upserted data successfully"
						});
						if (response instanceof Model) {
							msg.payload = response.toObject();
						} else {
							msg.payload = response;
						}
						node.send([msg, null]);
					}
				});
			} else {
				node.status({
					"fill": "red",
					"shape": "dot",
					"text": "Model " + modelName + " not found"
				});
				msg.payload = new Error("Model " + modelName + " not found");
				node.send([null, msg]);
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
					"text": "ERROR: Model with name " + modelName + " does not exist"
				});
			}
		});
	}
	RED.nodes.registerType("create-data", CreateDataNode);
}

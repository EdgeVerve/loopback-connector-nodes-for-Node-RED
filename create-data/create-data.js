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

		this.on('input', function (msg) {
			node.status({});
			var modelName = config.modelname;
			var dataStr = config.data;
			if(!modelName || modelName.trim()==='') {
				node.status({fill:"red",shape:"dot",text:"ModelName not Set"});
				return  this.warn(RED._("createData.errors.modelNameNotSet")); 
			}
			var dataStr = (config.data === undefined || config.data === null || config.data.trim() === "") ? msg.payload : config.data;
			var data;
			try {
				data = (typeof dataStr === "string") ? JSON.parse(dataStr) : dataStr;
			} catch(e) {
				node.status({
					"fill": "red",
					"shape": "dot",
					"text": e.message ? e.message : "Error while parsing " + dataStr
				});
				return;
			}
            var Model = loopback.findModel(modelName, node.callContext);

			if (Model) {
				node.status({});
				Model.upsert(data, msg.callContext, function (err, response) {
					if (err) {
						node.status({
							"fill": "red",
							"shape": "dot",
							"text": err.name? err.name : "An error occurred while inserting. See error output"
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
				node.status({fill:"red",shape:"dot",text:"Invalid ModelName: " + modelName});
				return this.error(RED._("createData.errors.modelNameInvalid"));
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
	RED.nodes.registerType("create-data", CreateDataNode);
}

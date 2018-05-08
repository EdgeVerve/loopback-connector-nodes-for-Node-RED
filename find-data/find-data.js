/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');

module.exports = function (RED) {

	function FindDataNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;
		var _node = this;
		node.status({});
		var modelName = config.modelname;
		if(modelName && modelName.trim().length > 0) {
			var Model = loopback.findModel(modelName, _node.callContext);
			if (!Model) {
				node.status({
					"fill": "red",
					"shape": "dot",
					"text": "Invalid ModelName: " + modelName
				});
				return;
			}
		}

		this.on('input', function (msg) {
			var filter;
			node.status({});
			var modelName = config.modelname || msg.modelName;
			try {
				if (config.filter && typeof config.filter === 'string') filter = JSON.parse(config.filter);
			} catch(e) {
				node.status({
					"fill": "red",
					"shape": "dot",
					"text": e.message ? e.message : "Error while parsing " + dataStr
				});
				return;
			}
			if (config.filter && typeof config.filter === 'object') filter = config.filter;
			if (!filter) filter = msg.filter;
			if (!filter) filter = {};


			try {
				if (filter && typeof filter === 'string') filter = JSON.parse(filter);
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
				Model.find(filter, msg.callContext, function (err, response) {
					if (err) {
						console.log(err);
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
							"text": "Found " + response.length + " records"
						});
						msg.resultModelName = modelName;
						response.forEach(function (instance, index) {
							if (instance instanceof Model) {
								response[index] = response[index].toObject();
							}
						});
						msg.payload = response;
						node.send([msg, null]);
					}
				});
			} else {
				node.status({fill:"red",shape:"dot",text:"Invalid ModelName: " + modelName});
				return this.error(RED._("findData.errors.modelNameInvalid"));
			}
		});

		node.on('close', function () {
			node.status({});
		});
	}
	RED.nodes.registerType("find-data", FindDataNode);
}

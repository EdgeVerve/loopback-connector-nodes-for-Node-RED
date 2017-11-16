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
		this.on('input', function (msg) {
			var filter;
			node.status({});
			var modelName = config.modelname || msg.modelName;
			if (config.filter && typeof config.filter === 'string') filter = JSON.parse(config.filter);
			if (config.filter && typeof config.filter === 'object') filter = config.filter;
			if (!filter) filter = msg.filter;
			if (!filter) filter = {};

			var Model;

			if (modelName && modelName.trim().length > 0) {
                Model = loopback.findModel(modelName, node.callContext);
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
					var err = {
						"errorMessage": "Model " + modelName + " not found"
					};
					node.status({
						"fill": "red",
						"shape": "dot",
						"text": "Model " + modelName + " not found"
					});
					msg.payload = err;
					node.send([null, msg]);
				}
			} else {
				var err = {
					"errorMessage": "Model Name not specified in config or as 'msg.modelname'"
				};
				node.status({
					"fill": "red",
					"shape": "dot",
					"text": "Model Name not specified in config or as 'msg.modelname'"
				});
				msg.payload = err;
				node.send([null, msg]);
			}



		});

		node.on('close', function () {
			node.status({});
		});
	}
	RED.nodes.registerType("find-data", FindDataNode);
}

/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 * The EdgeVerve proprietary software program ("Program"), is protected by
 * copyrights laws, international treaties and other pending or existing
 * intellectual property rights in India, the United States and other countries.
 * The Program may contain / reference third party or open source components,
 * the rights to which continue to remain with the applicable third party
 * licensors or the open source community as the case may be and nothing here
 * transfers the rights to the third party and open source components, except as
 * expressly permitted. Any unauthorized reproduction, storage, transmission in
 * any form or by any means (including without limitation to electronic,
 * mechanical, printing, photocopying, recording or otherwise), or any
 * distribution of this Program, or any portion of it, may result in severe
 * civil and criminal penalties, and will be prosecuted to the maximum extent
 * possible under the law.
 * 
 * 
 */
var loopback = require('loopback');
var _ = require('lodash');

module.exports = function(RED) {

    function removeOldObservers(Model, id) {

	if (Model._observers === undefined)
	    return;

	var types = [ 'access', 'before save', 'after save', 'after access' ];

	for ( var i in types) {

	    var observers = Model._observers[types[i]];

	    if (observers !== undefined && observers.length !== 0) {

		for ( var j in observers) {
		    var observer = observers[j];

		    var nodeId;

		    // hack to get nodeId.
		    try {
			nodeId = observer(null, null)();
			console.log('node id received from observer = ', nodeId);
			if (nodeId === id) {
			    // Id matched. remove this observer
			    console.log('node id matched. removing this observer.');
			    observers.splice(j, 1);
			    j--;
			}
		    } catch (e) {
		    }
		}
	    }

	}

    }

    function AsyncObserverNode(config) {
	RED.nodes.createNode(this, config);
	var node = this;

	var modelName = config.modelname;
	var method = config.method;

	var Model = loopback.findModel(modelName);

	if (Model !== undefined) {
	    // console.log ('Model = ', Model._observers[method][0]);

	    // Remove existing observers if any.
	    // console.log('observers before removing = ', Model._observers);
	    removeOldObservers(Model, node.id);
	    // console.log('observers after removing = ', Model._observers);

	    Model.observe(method, new observer(node, modelName, method).observe);
	}

	node.on('close', function() {
	    // console.log('node is closing. removing observers')
	    if (Model != undefined) {
		// console.log('observers before removing = ',
		// Model._observers);
		removeOldObservers(Model, node.id);
		// console.log('observers after removing = ', Model._observers);
	    }
	});
    }
    RED.nodes.registerType("async-observer", AsyncObserverNode);
}

var observer = function(node, modelName, methodName) {
    var _node = node;
    var _modelName = modelName;
    var _methodName = methodName;

    this.observe = function(ctx, next) {

	var id = _node.id;

	// sort of an hack to return a function in case this method is called by
	// node itself.
	if (ctx === null && next == null) {
	    var getNRId = function() {
		return id;
	    };

	    return getNRId;
	}

	var msg = {};

	if (ctx.Model !== undefined) {
	    msg.payload = ctx.Model.definition.name + '.' + _methodName + ' triggered';
	} else {
	    msg.payload = _modelName + '.' + _methodName + ' triggered';
	}

	// msg.next = next;
	msg.ctx = JSON.parse(JSON.stringify(ctx));
	_node.send(msg);

	// return control to loopback application.
	next();
    }
}
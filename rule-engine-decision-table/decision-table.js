/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
module.exports = function(RED) {

    function DecisionTableNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            node.status({});
            var decisionTableName = config.decisiontablename;
            if(decisionTableName){
                var decisionTableModel = loopback.findModel('DecisionTable');
                if(decisionTableModel){
                    if(msg.payload){
                        if(typeof msg.payload === 'string') msg.payload = JSON.parse(msg.payload);
                        if(msg.payload.data){
                            if(msg.callContext){
                                decisionTableModel.exec(decisionTableName, msg.payload.data, msg.callContext, function(err, data){
                                    if(err){
                                        node.status({"fill": "red", "shape": "dot", "text": err});
                                        node.send([err, null]);
                                    }else {
                                        node.status({"fill": "green", "shape": "dot", "text": "Decision table execution successful."});
                                        msg.payload =  data;
                                        node.send([null, msg]);
                                    }
                                });
                            }else {
                                node.status({"fill": "red", "shape": "dot", "text":"msg doesn't contain callContext which need to be passed as options." });
                                node.send([new Error("msg doesn't contain callContext which need to be passed as options."),null]);
                            }
                        }else{
                            node.status({"fill": "red", "shape": "dot", "text":"msg.payload doesn't contain either 'data' required." });
                            node.send([new Error("msg.payload doesn't contain either 'data' required."),null]);
                        }
                    } else {
                        node.status({"fill": "red", "shape": "dot", "text":"Message doesn't have payload. msg.payload is not defined." });
                        node.send([new Error("Message doesn't have payload. msg.payload is not defined."),null]);
                    }
                } else {
                    node.status({"fill": "red", "shape": "dot", "text":"Model 'DecisionTable' not found." });
                    node.send([new Error("Model 'DecisionTable' not found."),null]);
                }
            } else {
                console.log("In dec table else");
                node.status({"fill": "red", "shape": "dot", "text":"Decision table name is not filled in config." });
                node.send([new Error("Decision table name is not filled in config."),null]);
            }            
        });

        node.on('close', function() {

        });
    }

    RED.nodes.registerType("decision-table", DecisionTableNode);

    // Added remote method for getting Decision Tables.
    RED.httpAdmin.get("/getDecisionTables", RED.auth.needsPermission(''), function(req,res) {
        var decisionTableModel = loopback.findModel('DecisionTable');
        if(decisionTableModel) {
            // Firing the Find query to get results from DB.
            // TODO: Query to retrieve only property 'name' from DB.
            decisionTableModel.find({}, req.callContext, function(err, data){
                var result = [];
                if(data.length > 0){
                    data.forEach(function(elem){
                        // Retrieving only 'name' from the DB result.
                        result.push({name:elem.name});
                    })
                }
                // Sending result JSON.
                res.json(result);
            });
        } else {
            console.error("Unable to find Model DecisionTable.")
            res.json([]);
        }
    });
}

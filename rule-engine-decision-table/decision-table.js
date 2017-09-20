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
            var payload = config.payload;
            if(decisionTableName){
                var decisionTableModel = loopback.findModel('DecisionTable');
                if(decisionTableModel){
                    var givenInput = getObjectWithDotChain(msg, payload);
                    if(givenInput){
                        if(msg.callContext){
                            if(typeof givenInput === 'string') givenInput = JSON.parse(givenInput);
                            decisionTableModel.exec(decisionTableName, givenInput, msg.callContext, function(err, data){
                                if(err){
                                    node.status({"fill": "red", "shape": "dot", "text": err});
                                    msg.error = err;
                                    node.send([msg, null]);
                                } else {
                                    node.status({"fill": "green", "shape": "dot", "text": "Decision table execution successful."});
                                    setObjectWithDotChain(msg, payload, data);
                                    node.send([null, msg]);
                                }
                            });
                        }else {
                            node.status({"fill": "red", "shape": "dot", "text":"msg doesn't contain callContext which need to be passed as options." });
                            node.send([new Error("msg doesn't contain callContext which need to be passed as options."),null]);
                        }
                    } else {
                        var msgText = "Message doesn't have any data on specified path -> " + payload;
                        node.status({"fill": "red", "shape": "dot", "text": msgText});
                        node.send([new Error(msgText),null]);
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
        // Function to get the object value from string dot chain path example obj = {a:1, b1: {b2: {b3:5}}}, getObjectWithDotChain(obj, 'b1.b2.b3')
        function getObjectWithDotChain(obj,str) {
            if (typeof str == 'string')
                return getObjectWithDotChain(obj,str.split('.'));
            else if (str.length==0)
                return obj;
            else
                return getObjectWithDotChain(obj[str[0]],str.slice(1));
        }
        // Function to set the object value from string dot chain path example obj = {a:1, b1: {b2: {b3:5}}}, 
        // setObjectWithDotChain(obj, 'b1.b2.b3', 10); obj.b1.b2.b3 returns 10
        function setObjectWithDotChain(obj, str, value){
            if (typeof str == 'string')
                setObjectWithDotChain(obj,str.split('.'), value);
            else if (str.length==1 && value!==undefined)
                obj[str[0]] = value;
            else
                setObjectWithDotChain(obj[str[0]],str.slice(1), value);
        }
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

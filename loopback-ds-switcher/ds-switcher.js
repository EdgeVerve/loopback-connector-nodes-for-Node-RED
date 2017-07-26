/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var loopback = require('loopback');
var _ = require('lodash');
var DataSource = require('loopback-datasource-juggler').DataSource;
var async = require("async");
var request = require('request');
var optionsDM = {
  "ctx": {
    "remoteUser": "admin",
    "tenantId": "default",
    "remote": "ex"
  }
};

var options = {
  "ctx": {
    "remoteUser": "admin",
    "tenantId": "default"
  }
};

module.exports = function(RED) {

  function addDataSourceMap(modelName, exName) {
    var Dmapping = loopback.findModel("DataSourceMapping");
    var newDM = {
      "modelName": modelName,
      "scope": {
        remote: "ex"
      },
      "dataSourceName": exName
    };

    Dmapping.findOrCreate({
        where: {
          and: [{
            dataSourceName: exName
          }, {
            modelName: modelName
          }]
        }
      }, newDM, optionsDM,
      function(err, log) {
        if (err) {
          console.log("*** DataMapping error*** " + err);
          // return control to loopback application.
          next();
        }
      });
  }

  var getQSpot = function(modelQ, direction, cb) {
    modelQ.findOne({
        order: 'spot ' + direction
      }, optionsDM,
      function(err, result) {
        if (err) {
          console.log("can't read queue getQSpot " + err);
          cb(err);
        }
        cb(null, result);
      });
  }

  function saveRec(model, rec, cb) {
    model.upsert(rec, optionsDM,
      function(err, result) {
        if (err) {
          console.log("can't read queue saveRec " + err);
        }
        if (result) {
          if (cb) {
            cb(null, result);
          }
        }
      });
  }

  function addQueRec(modelQ, rec, cb) {
    var newQ = {
      "record": rec,
      "spot": 0
    };

    var aQ = new getQSpot(modelQ, 'DESC', function(err, result) {
      if (err) {
        console.log("can't get Max addQueRec " + err);
        return;
      }
      if (result && result.spot >= 0) {
        newQ.spot = result.spot + 1;
      }
      saveRec(modelQ, newQ, cb);
    });
    aQ;
  }

  function sendRec(url, rec, modelQ, num, model, node, altds) {
    var _node = node;
    modelQ.destroyAll({
        spot: num
      }, optionsDM,
      function(err, result) {
        if (err) {
          console.log("can't read queue to remove " + err);
          return;
        }
        var jsonRec = JSON.parse(rec);
        if (result) {
          if (url.length == 0) {
            var msg = {};
            msg.node = _node;
            msg.model = model;
            msg.modelQ = modelQ;
            msg.url = url;
            msg.altds = altds;
            var hiddenId = _node.id.replace('.', '');
            jsonRec[hiddenId] = hiddenId;
            msg.payload = jsonRec;
            _node.send([null, msg]);
          } else {

            request.post(
              url, {
                json: jsonRec
              },
              function(error, response, body) {
                if (error || response.statusCode >= 400) {
                  console.log(error + " " + response.statusCode);
                  var oldQ = {
                    "record": rec,
                    "spot": num
                  };
                  saveRec(modelQ, oldQ, null);
                } else if (altds.length == 0) {
                  var msg = {};
                  msg.node = _node;
                  msg.model = model;
                  msg.modelQ = modelQ;
                  msg.url = url;
                  msg.altds = altds;
                  var hiddenId = _node.id.replace('.', '');
                  msg.payload = body;
                  msg.payload[hiddenId] = hiddenId;
                  _node.send([null, msg]);
                }
              }
            );
          }
        }
      });
  }

  function checkQueue(modelQ, url, modelName, node, altds) {
    var checkSpot = new getQSpot(modelQ, 'ASC', function(err, result) {
      if (err) {
        console.log("can't get Spot for checkQ " + err);
        return;
      }
      if (result && result.record) {
        sendRec(url, result.record, modelQ, result.spot, modelName, node, altds);
      }
    });
    checkSpot;
  }

  var outbound = function(msg) {
    var modelQ = loopback.findModel(msg.modelName + 'EXQ');
    var model = loopback.findModel(msg.modelName);

    addQueRec(modelQ, JSON.stringify(msg.payload), function() {
      checkQueue(modelQ, msg.url, model, msg.node, msg.altds);
    });
  }

  var inbound = function(msg) {
    saveRec(msg.model, msg.payload, function(err, result) {
      if (err) {
        conole.log("could not save returned rec " + err)
      }
      checkQueue(msg.modelQ, msg.url, msg.model, msg.node, msg.altds);
    });
  }

  function removeOldOBefores(Model, id) {

    var type = "**";

    //var observers = Model._observers[types[i]];
    var modelRemotes = Model.app._remotes.listenerTree.before[Model.modelName];
    var remote = modelRemotes ? (modelRemotes[type] ? modelRemotes[type]._listeners : undefined) : undefined;
    if (remote !== undefined) {
      if (Array.isArray(remote)) {
        for (var j in remote) {
          var remoteMethod = remote[j];

          var nodeId;

          // hack to get nodeId.
          try {
            remoteMethod({}, function(nId) {
              nodeId = nId

              if (nodeId === id) {
                // Id matched. remove this observer
                // console.log('node id matched. removing this
                // observer.');
                remote.splice(j, 1);
                j--;
              }
            })();

          } catch (e) {}
        }
      } else {
        // hack to get nodeId.
        try {
          remote({}, function(nId) {
            nodeId = nId;
            //console.log('node id received from observer = ', nodeId);
            if (nodeId === id) {
              // Id matched. remove this observer
              // console.log('node id matched. removing this
              // observer.');
              delete modelRemotes[type];
              //remote.splice(j, 1);
              //j--;
            }
          })();

        } catch (e) {}
      }

    }

  }

  function removeOldObservers(Model, id) {

    if (Model._observers === undefined)
      return;

    var observers = Model._observers['after save'];

    if (observers !== undefined && observers.length !== 0) {

      for (var j in observers) {
        var observer = observers[j];

        var nodeId;

        // hack to get nodeId.
        try {
          nodeId = observer(null, null)();
          // console.log('node id received from observer = ',
          // nodeId);
          if (nodeId === id) {
            // Id matched. remove this observer
            // console.log('node id matched. removing this
            // observer.');
            observers.splice(j, 1);
            j--;
          }
        } catch (e) {}
      }
    }

  }

  function AsyncObserverNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    var modelName = config.modelname;
    var legacyUrl = config.legacyurl;
    var altds = config.altds;

    var method = "after save";

    var Model = loopback.findModel(modelName, node.callContext);

    var DsDefinition = loopback.findModel("DataSourceDefinition");

    var modelNameQueue = modelName + 'EXQ';

    if (Model !== undefined) {

      Model.getApp(function(err, app) {
        if (err) {
          //throw err;
          console.log("*** can't get app error*** " + err);
          // return control to loopback application.
          next();
        }
        /*
        var ModelDef = loopback.findModel("ModelDefinition");

        var exQ = {
          "name": modelNameQueue,
          "base": "BaseEntity",
          "strict": false,
          "plural": modelNameQueue + 's',
          "idInjection": true,
          "options": {
            "validateUpsert": true
          },
          "properties": {
            "record": {
              "type": "string"
            },
            "spot": {
              "type": "number"
            }
          }
        };

        ModelDef.findOrCreate({
            where: {
              name: modelNameQueue
            }
          }, exQ, options,
          function(err, log) {
            if (err) {
              console.log("*** ModelDef error*** " + err);
              // return control to loopback application.
              next();
            }
            else {
              addDataSourceMap(modelNameQueue, exName);
              if (dsType == "internalDS") {
                addDataSourceMap(modelName, altds);
              }
              else {
                var d = app.datasources.db.settings;

                var exName = d.name + 'EX';

                var newDS = {
                  "name": exName,
                  "connector": d.connector,
                  "host": d.host,
                  "port": d.port,
                  "url": d.url + 'EX',
                  "database": d.database + 'EX',
                  "user": d.user,
                  "password": d.password,
                  "connectionTimeout": d.connectionTimeout
                };

                DsDefinition.findOrCreate({
                    where: {
                      database: d.database + 'EX'
                    }
                  }, newDS, options,
                  function(err, log) {
                    if (err) {
                      console.log("*** DataSourceDef error*** " + err);
                      // return control to loopback application.
                      next();
                    }

                    addDataSourceMap(modelName, exName);
                  });
              }
            }
          });
        });
        */

        var d = app.datasources.db.settings;

        var exName = d.name + 'EX';

        var newDS = {
          "name": exName,
          "connector": d.connector,
          "host": d.host,
          "port": d.port,
          "url": d.url + 'EX',
          "database": d.database + 'EX',
          "user": d.user,
          "password": d.password,
          "connectionTimeout": d.connectionTimeout
        };

        DsDefinition.findOrCreate({
            where: {
              database: d.database + 'EX'
            }
          }, newDS, options,
          function(err, log) {
            if (err) {
              console.log("*** DataSourceDef error*** " + err);
              // return control to loopback application.
              next();
            }

            var ModelDef = loopback.findModel("ModelDefinition");

            if (altds.length > 0) {
              ModelDef.findOne({
                  where: {
                    name: modelName
                  }
                }, options,
                function(err, result) {
                  if (err) {
                    console.log("can't read ModelDefinition " + err);
                    next();
                  }

                  var outsideName = modelName + "-" + altds;
                  result.name = outsideName;

                  var newModel = {};

                  Object.keys(result.properties).forEach(function(key) {
                    if (key != 'id' && !(key.startsWith("_"))) {
                      newModel[key] = result[key];
                    }
                  });

                  newModel.base = null;

                  ModelDef.findOrCreate({
                      where: {
                        name: outsideName
                      }
                    }, newModel, options,
                    function(err, log) {
                      if (err) {
                        console.log("*** ModelDef error*** " + err);
                        // return control to loopback application.
                        next();
                      }
                      addDataSourceMap(outsideName, altds);
                    });
                });
              //addDataSourceMap(modelName, altds);
            }
            else {
              addDataSourceMap(modelName, exName);
            }

            var exQ = {
              "name": modelNameQueue,
              "base": "BaseEntity",
              "strict": false,
              "plural": modelNameQueue + 's',
              "idInjection": true,
              "options": {
                "validateUpsert": true
              },
              "properties": {
                "record": {
                  "type": "string"
                },
                "spot": {
                  "type": "number"
                }
              }
            };

            ModelDef.findOrCreate({
                where: {
                  name: modelNameQueue
                }
              }, exQ, options,
              function(err, log) {
                if (err) {
                  console.log("*** ModelDef error*** " + err);
                  // return control to loopback application.
                  next();
                }
              });
          });

        addDataSourceMap(modelNameQueue, exName);
      });

      var globalContext = this.context().global;
      globalContext.set("sendEx", outbound); // this is now available to other nodes
      globalContext.set("sendInternal", inbound); // this is now available to other nodes

      removeOldObservers(Model, node.id);
      removeOldOBefores(Model, node.id);

      Model.observe(method, new observer(node, modelName, method, altds, legacyUrl).observe);

      Model.beforeRemote('**', function(ctx, unused, next) {

        if (ctx.methodString.includes("find") || ctx.methodString == 'exists' || ctx.methodString == "count") {
          // Change context here.
       //   if (altds.length == 0) {
            var callContext = loopback.getCurrentContext().get('callContext');
            callContext.ctx.remote = "ex";
       //   }
          //node.callContext.ctx.remote = "ex";
        } else {
          //console.log('ds-switcher Skipping Method called ', ctx.methodString);
        }

        next();
      });
    }

    node.on('close', function() {
      // console.log('node is closing. removing observers')
      if (Model != undefined) {
        // console.log('observers before removing = ',
        // Model._observers);
        removeOldOBefores(Model, node.id);
        removeOldObservers(Model, node.id);
        // console.log('observers after removing = ', Model._observers);
      }
    });
  }
  RED.nodes.registerType("ds-switcher", AsyncObserverNode);
}

var observer = function(node, modelName, methodName, altds, legUrl) {
  var _node = node;
  var _modelName = modelName;
  var _methodName = methodName;
  var _altds = altds;
  var _legUrl = legUrl;

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

    var hiddenId = id.replace('.', '');

    if (!ctx.instance.hasOwnProperty(hiddenId)) {
      msg.payload = JSON.parse(JSON.stringify(ctx.instance));
      msg.url = _legUrl;
      msg.node = _node;
      msg.modelName = modelName;
      msg.altds = _altds;
      _node.send([msg, null]);
    }
    // return control to loopback application.
    next();
  }
}

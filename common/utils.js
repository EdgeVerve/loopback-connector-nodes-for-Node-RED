/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */



// this function removes model observers by comparint with node id
function actualRemoveObservers(Model, id, observersCollection, types) {
    if (observersCollection === undefined || observersCollection.length === 0)
        return;
    for (var i in types) {
        var observers = observersCollection[types[i]];
        if (observers !== undefined && observers.length !== 0) {
            for (var j in observers) {
                var observer = observers[j];
                var nodeId;
                try {
                    nodeId = observer(null, null)();
                    if (nodeId === id) {
                        observers.splice(j, 1);
                        j--;
                    }
                } catch (e) {
                }
            }
        }
    }
}

// this function removes failsafe observers by comparing ids
function removeFsObservers(Model, id, observersCollection, types) {
    if (observersCollection === undefined)
        return;

    for (var i in types) {

        var observers = observersCollection[types[i]];
        if (observers !== undefined && observers.length !== 0) {
            var actualObservers = observers.observers;
            for (var j in actualObservers) {
                var observer = actualObservers[j];
                var nodeId;
                try {
                    nodeId = observer.getId();
                    if (nodeId === id) {
                        actualObservers.splice(j, 1);
                        j--;
                    }
                } catch (e) {
                }
            }
        }
    }
}

function removeOldObservers(Model, id) {
    var types = ['access', 'before save', 'after delete', 'after save', 'after access', 'composite loaded'];
    actualRemoveObservers(Model, id, Model._observers, types);
    var fsTypes = ['after delete', 'after save'];
    removeFsObservers(Model, id, Model._fsObservers, fsTypes);
}


// check if autoscope fields are matching for which this observer is being called.
// with new implementation, ctx.options contains callContext and settings has got autoscope fields
// below code compares call context of running and saved callContext - if it matches, it will continue with flow

function compareContext(_node, ctx) {
    if (_node.callContext && _node.callContext.ctx && ctx.Model.settings && ctx.Model.settings.autoscope && ctx.Model.settings.autoscope.length > 0) {
        for (var i = 0; i < ctx.Model.settings.autoscope.length; ++i) {
            var field = ctx.Model.settings.autoscope[i];
            if (!ctx.options || !ctx.options.ctx) {
                return false;
            }
            if (_node.callContext.ctx[field] === 'default')
                continue;
            if (ctx.options.ctx[field] !== _node.callContext.ctx[field])
                return false;
        }
    }
    return true;
}

module.exports = {
    removeOldObservers: removeOldObservers,
    compareContext: compareContext
};

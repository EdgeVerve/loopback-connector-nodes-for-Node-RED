/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

module.exports = function(RED) {
    
    function NpmLoaderNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        var moduleName = config.modulename;
        var modulePath = config.modulepath;
        var modulePathRelative = config.modulepathrelative;
        modulePathRelative = ( typeof modulePathRelative === 'string' ? modulePathRelative : '' );

        var module = require((modulePathRelative.toLowerCase() === 'yes' ? process.cwd() + '/' : '') + modulePath);
        
        //console.log("Module path : ", (modulePathRelative.toLowerCase() === 'yes' ? process.cwd() + '/' : '') + modulePath);
        node.on('input', function(msg) {

            msg[moduleName] = module;
            node.send(msg);
        });
        
        node.on('close', function() {

        });
    }
    
    RED.nodes.registerType("npm-loader", NpmLoaderNode);
}

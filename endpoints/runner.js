'use strict';

var nconf = require('nconf');
var BPromise = require("bluebird");
var vm = require("vm");
var SIS = require("../util/constants");
var clone = require("clone");

function ScriptRunner(schemaManager) {
    this.schemaManager = schemaManager;
    this.manager = require("../util/script-manager")(schemaManager);
    this.scriptCache = { };
}

ScriptRunner.prototype._getScript = function(name) {
    return this.manager.getById(name, { lean : true })
    .bind(this).then(function(scriptObj) {
        var scriptText = scriptObj.script;
        var cached = this.scriptCache[name];
        var scriptTime = scriptObj._sis._updated_at;
        var compiled = null;
        if (!cached) {
            compiled = vm.createScript(scriptText, name);
            this.scriptCache[name] = {
                script : compiled,
                time : scriptTime
            };
            return compiled;
        } else {
            if (scriptObj._sis._updated_at > cached.time) {
                compiled = vm.createScript(scriptText, name);
                cached.script = compiled;
                cached.time = scriptTime;
            }
            return cached.script;
        }
    });
};

// context apis
var ApiClient = require("./api-client");
var ApiResponse = require("./api-response");

// internal holder to ensure the script finishes before sending out
// a response
function ResponseHolder() {
    this.response = null;
}
ResponseHolder.prototype.setResponse = function(response) {
    console.log("Sending response " + response);
    this.response = response;
};

ScriptRunner.prototype._createContext = function(holder, req) {
    var ctx = {
        client : new ApiClient(this.schemaManager),
        res : new ApiResponse(holder),
        req : req,
        BPromise : BPromise,
        csv : require('csv')
    };
    return vm.createContext(clone(ctx));
};

ScriptRunner.prototype.handleRequest = function(req) {
    var endpoint = req.endpoint;
    return this._getScript(endpoint).bind(this)
    .then(function(script) {
        var holder = new ResponseHolder();
        var ctx = this._createContext(holder, req);
        script.runInNewContext(ctx);
        return holder.response;
    })
    .catch(function(err) {
        var str = err + "";
        if (err.stack) {
            str += " : " + err.stack;
        }
        return BPromise.reject({ err : str, status : 500 });
    });
};

module.exports = ScriptRunner;
// script that can add / remove users
"use strict";

var mongoose = require('mongoose');
var nconf = require('nconf');
var SIS = require('../util/constants');
var fs = require('fs');

if (process.argv.length != 4) {
    console.log("Require an action and argument.");
    process.exit(1);
}

var action = process.argv[2];

if (['update','delete'].indexOf(action) == -1) {
    console.log("action must be one of update or delete");
    process.exit(1);
}

nconf.env('__')
    .argv()
    .file("config.json.local", __dirname + "/../conf/config.json.local")
    .file("config.json", __dirname + "/../conf/config.json");

var appConfig = nconf.get('app') || {};
if (!appConfig.auth) {
    console.log("Authentication is not enabled.");
    process.exit(1);
}

// user to do operations as
var superUser = {
    name : "super",
    super_user : true
};

var options = {
    user : superUser
};

// get the info for a user.
var jsonFile = process.argv[3];
var user = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

function updateUser(userManager, user, callback) {
    userManager.getById(user.name).done(function(u) {
        // user exists
        userManager.update(u.name, user, options).nodeify(callback);
    }, function(err) {
        // user does not exist.
        userManager.add(user, options).nodeify(callback);
    });
}

function deleteUser(userManager, user, callback) {
    userManager.delete(user.name, options).nodeify(callback);
}

var opts = nconf.get('db').opts || { };

mongoose.connect(nconf.get('db').url, opts, function(err) {
    if (err) {
        throw err;
    }
    var schemaManager = require('../util/schema-manager')(mongoose, appConfig);
    schemaManager.bootstrapEntitySchemas(function(err) {
        if (err) {
            throw err;
        }
        var userManager = schemaManager.auth[SIS.SCHEMA_USERS];
        if (action === 'update') {
            updateUser(userManager, user, function(err, r) {
                if (err) {
                    console.log("Error updating user.");
                    process.exit(1);
                } else {
                    console.log("User updated.");
                    process.exit(0);
                }
            });
        } else {
            deleteUser(userManager, user, function(err, r) {
                process.exit(0);
            });
        }
    });
});

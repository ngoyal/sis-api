/***********************************************************

 The information in this document is proprietary
 to VeriSign and the VeriSign Product Development.
 It may not be used, reproduced or disclosed without
 the written approval of the General Manager of
 VeriSign Product Development.

 PRIVILEGED AND CONFIDENTIAL
 VERISIGN PROPRIETARY INFORMATION
 REGISTRY SENSITIVE INFORMATION

 Copyright (c) 2013 VeriSign, Inc.  All rights reserved.

 ***********************************************************/

describe('Init Seed Data', function() {
    "use strict";

    var replUtil = require('../fixtures/repl-util');
    var servers = replUtil.loadReplicationServers();

    it("should seed the data", function(done) {
        // only use first one
        var seedServer = servers[0];
        seedServer.becomeSuperUser(function(e, r) {
            if (e) { return done(e); }
            replUtil.seedData(seedServer, done);
        });
    });

});

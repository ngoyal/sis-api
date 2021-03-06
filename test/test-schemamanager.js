describe('SchemaManager', function() {
    "use strict";

    var SIS = require("../util/constants");
    var should = require('should');
    var TestUtil = require('./fixtures/util');
    var LocalTest = new TestUtil.LocalTest();

    var schemaManager = null;

    before(function(done) {
        LocalTest.start(function(err, mongoose) {
            schemaManager = require("../util/schema-manager")(mongoose, { auth : false});
            done(err);
        });
    });

    after(function(done) {
        LocalTest.stop(done);
    });

    describe('add-invalid-schema', function() {
        it("should error adding an empty string ", function(done) {
            var name = "name";
            var schema = "";
            schemaManager.add({"name" : name, "definition" : schema}).nodeify(function(err, entity) {
                should.exist(err);
                done();
            });
        });

        it("should error adding an empty object ", function(done) {
            var name = "name";
            var schema = { };
            schemaManager.add({"name" : name, "definition" : schema}).nodeify(function(err, entity) {
                should.exist(err);
                done();
            });
        });


        it("should error adding a schema with an unkown type ", function(done) {
            var name = "name";
            var schema = { "field1" : "Bogus", "field2" : "String" };
            schemaManager.add({"name" : name, "definition" : schema}).nodeify(function(err, entity) {
                should.exist(err);
                done();
            });
        });


        it("should error adding a schema with no name ", function(done) {
            var name = "";
            var schema = { "field1" : "String", "field2" : "String" };
            schemaManager.add({"name" : name, "definition" : schema}).nodeify(function(err, entity) {
                should.exist(err);
                done();
            });
        });
    });

    describe('add-schema', function() {
        it("should add a valid json schema object", function(done) {
            var name = "network_element";
            var schema = {
                "name" : "network_element",
                _sis : { "owner" : ["test"] },
                "definition" : {
                    ne_type: "String",
                    cid: "String",
                    ip: "String",
                    ip6: "String",
                    bgpip: "String",
                    bgpip6: "String"
                }
            };
            schemaManager.add(schema).nodeify(function(err, entity) {
                should.not.exist(err);

                entity.should.have.property('name', 'network_element');
                entity.should.have.property('definition');
                entity.definition.should.eql(schema.definition);
                done();
            });
        });

        ['sis_hiera', 'sis_schemas', 'sis_hooks'].map(function(name) {
            it("should fail to add a schema with name" + name, function(done) {
                var schema = {
                    "name" : name,
                    _sis : { "owner" : ["test"] },
                    "definition" : {
                        ne_type: "String"
                    }
                };
                schemaManager.add(schema).nodeify(function(err, entity) {
                    should.exist(err);
                    should.not.exist(entity);
                    done();
                });
            });
        });
        it("Should fail to add an empty schema", function(done) {
            var schema = {
                "name" : "name",
                _sis : { "owner" : "test" },
                "definition" : { }
            };
            schemaManager.add(schema).nodeify(function(err, entity) {
                should.exist(err);
                should.not.exist(entity);
                done();
            });
        });

        ['_id', '__v'].map(function(field) {
            it("Should fail to add a schema w/ field " + field, function(done) {
                var schema = {
                    "name" : "schema1",
                    _sis : { "owner" : ["test"] },
                    "definition" : {
                        "name" : "String"
                    }
                };
                schema.definition[field] = 'String';
                schemaManager.add(schema).nodeify(function(err, entity) {
                    should.exist(err);
                    should.not.exist(entity);
                    done();
                });
            });
        });
        it("Should fail to add a schema with a bad definition", function(done) {
            var schema = {
                "name" : "schema1",
                _sis : { "owner" : ["test"] },
                "definition" : "Bogus"
            };
            schemaManager.add(schema).nodeify(function(err, entity) {
                should.exist(err);
                should.not.exist(entity);
                done();
            });
        });
        it("Should fail to add a schema with an invalid schema def", function(done) {
            var schema = {
                "name" : "schema1",
                _sis : { "owner" : ["test"] },
                "definition" : {
                    "name" : "UnknownType"
                }
            };
            schemaManager.add(schema).nodeify(function(err, entity) {
                should.exist(err);
                should.not.exist(entity);
                done();
            });
        });
    });

    describe("getEntityModel failures", function() {
        it("Should fail to get an EntityModel for a schema with no name", function(done) {
            var model = schemaManager.getEntityModel({'definition' : {'name' : 'String'}});
            should.not.exist(model);
            done();
        });
        it("Should fail to get an EntityModel for an invalid schema def", function(done) {
            var schema = {
                name : 'invalid',
                _sis : { owner : ['invalid'] },
                defintion : { 'bogus' : 'Unknown' }
            };
            var model = schemaManager.getEntityModel(schema);
            should.not.exist(model);
            done();
        });
    });

    describe('delete-schema', function() {
        var schemaName = "schema1";
        // add a schema
        var schemaDef = {
            f1 : "String",
            f2 : "String"
        };

        var fullSchema = {
            "name" : schemaName,
            _sis : { "owner" : ["test"] },
            "definition" : schemaDef
        };
        before(function(done) {
            schemaManager.add(fullSchema).nodeify(function(err, entity) {
                if (err) {
                    done(err);
                    return;
                }
                // add some documents - get the model and save a document
                var EntityType = schemaManager.getEntityModel(entity);
                if (!EntityType) {
                    done("Entity type is null");
                    return;
                }
                var doc = new EntityType({f1 : "f1", f2 : "f2" } );
                doc.save(function(err, e) {
                    should.not.exist(err);
                    // assert there is an item
                    EntityType.count({}, function(err, result) {
                        should.not.exist(err);
                        result.should.eql(1);
                        done(err);
                    });
                });
            });
        });

        it("Should return false if schema dne ", function(done) {
            schemaManager.delete("DNE").nodeify(function(err, result) {
                should.exist(err);
                should.not.exist(result);
                done();
            });
        });

        it("Should return true if schema exists ", function(done) {
            schemaManager.delete(schemaName).nodeify(function(err, result) {
                should.not.exist(err);
                /* jshint expr: true */
                result.should.be.ok;
                done(err);
            });
        });

        it("Should no longer exist ", function(done) {
            // ensure it is null
            schemaManager.getById(schemaName)
                .done(function(result) {
                    done(result);
                }, function(err) {
                    // expect it to not exist
                    done();
                });
        });

        it("Should have no documents ", function(done) {
            schemaManager.add(fullSchema).nodeify(function(err, entity) {
                if (err) {
                    console.log(err);
                    done(err);
                    return;
                }
                var EntityType = schemaManager.getEntityModel(entity);
                EntityType.count({}, function(err, result) {
                    result.should.eql(0);
                    done(err);
                });
            });
        });
    });

    describe("update-schema", function() {
        var schema = {
            "name":"test_entity",
            _sis : { "owner" : ["test"] },
            "definition": {
                "str":   "String",
                "num":   "Number",
                "date":  "Date",
                "bool":  "Boolean",
                "arr": [],
            }
        };

        var initialEntity = {
            "str" : "foobar",
            "num" : 10,
            "date" : new Date(),
            "bool" : false,
            "arr" : "helloworld".split("")
        };

        var savedEntity = null;

        // create the schema and add an entity
        before(function(done) {
            schemaManager.delete(schema.name).nodeify(function() {
                schemaManager.add(schema).nodeify(function(err, result) {
                    if (err) return done(err);
                    var EntityType = schemaManager.getEntityModel(schema);
                    var doc = new EntityType(initialEntity);
                    doc.save(function(err, e) {
                        if (err) { return done(err); }
                        savedEntity = e;
                        done();
                    });
                });
            });
        });
        after(function(done) {
            schemaManager.delete(schema.name).nodeify(done);
        });

        it("Should update the schema", function(done) {
            // delete the num field, change bool to string, add field
            delete schema.definition.num;
            schema.definition.bool = 'String';
            schema.definition.newBool = "Boolean";
            schemaManager.update(schema.name, schema).nodeify(function(err, updated) {
                should.not.exist(err);
                updated = updated[1];
                should.exist(updated.definition);
                should.exist(updated.definition.newBool);
                should.not.exist(updated.definition.num);
                schemaManager.getById(schema.name).done(function(o) {
                    updated.toObject().should.eql(o.toObject());
                    done();
                }, function(e) { done(e); });
            });
        });

        it("Should retrieve the existing entity", function(done) {
            schemaManager.getById(schema.name).done(function(entitySchema) {
                var EntityType = schemaManager.getEntityModel(entitySchema);
                EntityType.findOne({"_id" : savedEntity._id}, function(err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    // ensure that the bool is removed
                    should.not.exist(result.num);
                    done();
                });
            }, done);
        });

        it("Should not save the initial entity num field " + JSON.stringify(initialEntity), function(done) {
            schemaManager.getById(schema.name).done(function(entitySchema) {
                var EntityType = schemaManager.getEntityModel(entitySchema);
                var doc = new EntityType(initialEntity);
                var docSchema = doc.schema;
                should.not.exist(doc.schema.num);
                doc.save(function(err, e) {
                    should.not.exist(err);
                    should.exist(e.str);
                    should.not.exist(e.num);
                    done();
                });
            }, done);
        });

        it("Should save an updated entity", function(done) {
            schemaManager.getById(schema.name).done(function(entitySchema) {
                var EntityType = schemaManager.getEntityModel(entitySchema);
                var doc = new EntityType({
                    "str" : "new",
                    "newBool" : true,
                    "date" : new Date(),
                    "arr" : [0,1,2],
                    "bool" : "became a string"
                });
                doc.save(done);
            }, done);
        });
    });

    describe("schema diff", function() {
        var s = {
            definition : {
                "str":   "String",
                "num":   "Number",
                "date":  "Date",
                "bool":  "Boolean",
                "arr": []
            }
        };

        beforeEach(function(done){
            s.definition = {
                "str":   "String",
                "num":   "Number",
                "date":  "Date",
                "bool":  "Boolean",
                "arr": []
            };
            done();
        });

        it("should match the schemas", function(done) {
            var s1 = schemaManager._getMongooseSchema(s);
            var s2 = schemaManager._getMongooseSchema(s);
            var diff = schemaManager._diffSchemas(s1, s2);
            for (var i = 0; i < diff.length; ++i) {
                diff[i].length.should.eql(0);
            }
            done();
        });

        it("should see str was removed", function(done) {
            var s1 = schemaManager._getMongooseSchema(s);
            delete s.definition.str;
            var s2 = schemaManager._getMongooseSchema(s);
            var diff = schemaManager._diffSchemas(s1, s2);
            diff[1].length.should.eql(1);
            diff[1][0][0].should.eql('str');
            done();
        });

        it("should see str was removed, q added, num updated", function(done) {
            var s1 = schemaManager._getMongooseSchema(s);
            delete s.definition.str;
            s.definition.q = "String";
            s.definition.num = "String";
            var s2 = schemaManager._getMongooseSchema(s);
            var diff = schemaManager._diffSchemas(s1, s2);
            diff[1].length.should.eql(1);
            diff[1][0][0].should.eql('str');
            diff[0].length.should.eql(1);
            diff[0][0][0].should.eql('q');
            diff[2].length.should.eql(1);
            diff[2][0][0].should.eql('num');
            done();
        });
    });

    describe("schema indexes", function() {
        var schema = {
            name : "test_schema_index_removal",
            _sis : { owner : ["test"] },
            definition : {
                str : { type : "String", unique : true },
                other : { type : "String", unique : true }
            }
        };

        var schemaDoc = null;

        // create the schema
        before(function(done) {
            schemaManager.delete(schema.name).nodeify(function() {
                schemaManager.add(schema).nodeify(function(err, result) {
                    if (err) return done(err);
                    schemaDoc = result.toObject();
                    done();
                });
            });

        });
        //
        after(function(done) {
            schemaManager.delete(schema.name).nodeify(done);
        });

        it("Should fail to add two objects w/ same str", function(done) {
            var EntityType = schemaManager.getEntityModel(schemaDoc);
            EntityType.ensureIndexes(function(err) {
                should.not.exist(err);
                var doc1 = new EntityType({ str : "foo", other : "foo" });
                var doc2 = new EntityType({ str : "foo", other : "bar" });
                doc1.save(function(err) {
                    should.not.exist(err);
                    doc2.save(function(err) {
                        should.exist(err);
                        done();
                    });
                });
            });
        });

        it("Should remove the unique index", function(done) {
            this.timeout(600000);
            delete schema.definition.str.unique;
            schemaManager.update(schema.name, schema).then(function(result) {
                schemaDoc = result[1].toObject();
                var EntityType = schemaManager.getEntityModel(schemaDoc);
                var doc2 = new EntityType({ str : "foo", other : "bar" });
                doc2.save(function(err) {
                    should.not.exist(err);
                    done();
                });
            }).catch(done);
        });

        it("Should remove the 'other' index", function(done) {
            delete schema.definition.other;
            var EntityType = schemaManager.getEntityModel(schemaDoc);
            var indeces = EntityType.schema.indexes();
            schemaManager.update(schema.name, schema).then(function(result) {
                schemaDoc = result[1].toObject();
                EntityType = schemaManager.getEntityModel(schemaDoc);
                indeces = EntityType.schema.indexes();
                indeces = indeces.filter(function(ind) {
                    var keys = Object.keys(ind[0]);
                    return keys.length != 1 || keys[0].indexOf('_sis') !== 0;
                });
                indeces.length.should.eql(0);
                done();
            }).catch(done);
        });

    });
});

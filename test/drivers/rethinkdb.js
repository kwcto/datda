require('should');
var _ = require('lodash');
var q = require('q');
var Promise = require('bluebird');
var RethinkDBDriver = require('../../lib/drivers/rethinkdb');
var r = require('rethinkdb');

var testDBName = 'motoreTest';
var defaultData = [
  { number: 1 },
  { number: 2 },
  { number: 3 }
];


var dropTestDatabase = function (done) {
  r.connect(this.connectionOpts)
    .then(function (conn) {
      r.dbDrop(testDBName).run(this.conn)
        .catch(function () { })
        .then(function () {
          return conn.close();
        })
        .then(done.bind(null, null));
    });
};

var insertTestData = function (done, data) {
  if (!data) data = defaultData;
  r.connect(this.connectionOpts)
    .then(function (conn) {
      r.dbDrop(testDBName).run(conn)
        .then(function () {
          return r.dbCreate(testDBName).run(conn);
        })
        .then(function () {
          conn.use(testDBName);
          return r.tableCreate('table1').run(conn)
            .catch(function () { });
        })
        .then(function () {
          return r.table('table1')
            .insert(data)
            .run(conn);
        })
        .then(function () {
          return r.table('table1').indexCreate('exampleIndex').run(conn)
            .catch(function () { });
        })
        .then(function () {
          return conn.close();
        })
        .nodeify(done);
    });
};

describe('RethinkDB', function () {

  var rdb;

  // Connect to Mongo
  before(function (done) {
    rdb = new RethinkDBDriver({
      host: 'localhost',
      port: 28015,
      db: 'motoreTest'
    });
    rdb.connect()
     .then(done.bind(null, null));
  });

  describe('connecting', function () {

    it('should have connected propertly', function () {
      rdb.conn.should.be.a.Object;
    });

    // TODO: Should it throw an error? It should create it by default
    xit('should throw an error if the database doesn\'t exists', function (done) {
      var conn = new RethinkDBDriver({
          host: 'localhost',
          port: 28015,
          db: 'databaseThatDoesntExist'
        });
        conn.connect()
         .catch(function (err) {
           done();
         });
    });

    it('should throw an error if it can\'t connect to the host', function (done) {
        var conn = new RethinkDBDriver({
          host: 'localhost',
          port: 9999,
          db: 'databaseThatDoesntExist'
        });
        conn.connect()
         .catch(function (err) {
           err.name.should.equal('RqlDriverError');
           err.message.indexOf('ECONNREFUSED').should.not.equal(-1);
           done();
         });
    });

  });

  describe('getTables', function () {

    var tables = ['table1', 'helloWorld' + Math.random(), ('anotherTable' + Math.random()).replace('.', '')];
    before(function (done) {
      r.connect(this.connectionOpts)
        .then(function (conn) {
          return r.dbDrop(testDBName).run(conn)
            .catch(function () { })
            .then(function () {
              return r.dbCreate(testDBName).run(conn);
            })
            .then(function () {
              return q.all(tables.map(function (table) {
                return r.tableCreate(table).run(conn)
                  .catch(function () { })
                  .then(function () {
                    return r.table(table).indexCreate('exampleIndex');
                  });
              }));
            })
            .then(function () {
              return conn.close();
            });
        })
        .nodeify(done);
    });

    it('should get all the tables in the database as an object with a name property', function (done) {
      rdb.getTables()
        .then(function (tables) {
          _.pluck(tables, 'name').sort().should.eql(tables.sort());
          done();
        });
    });

    // After
    after(dropTestDatabase);
  });

  describe('createTables', function () {

    it('should create tables passed to it as an object', function (done) {
      var tables = [
        { name: 'hello' },
        { name: ('hello' + Math.random()).replace('.', '') },
        { name: 'hello2' },
      ];
      rdb.createTables(tables)
        .then(function () {
          return rdb.getTables();
        })
        .then(function (_tables) {
          _.pluck(tables, 'name').sort().should.eql(_.pluck(tables, 'name').sort());
          done();
        })
        .catch(done);
    });
  });

  describe('getNumberOfRows', function () {

    before(insertTestData);

    it('should get the number of rows in a collection', function (done) {
      rdb.getNumberOfRows('table1')
        .then(function (numOfRows) {
          numOfRows.should.equal(3);
          done();
        })
        .catch(done);
    });

    after(dropTestDatabase);
  });

  describe('getRows', function () {

    before(insertTestData);

    it('should get the rows in a collection', function (done) {
      rdb.getRows('table1', 2, 0)
        .then(function (rows) {
          rows.should.be.an.Array;
          rows.length.should.equal(2);
          rows[0].number.should.equal(1);
          done();
        });
    });

    after(dropTestDatabase);
  });

  xdescribe('insertRows', function () {

    before(insertTestData);

    it('should insert the rows into the collection', function (done) {
      mongo.insertRows('table1', [{ hello: 1 }, { hello: 2 }])
       .then(function () {
         return mongo.getRows('table1', 10, 0);
       })
       .then(function (rows) {
         rows.length.should.equal(5);
         rows.should.containDeep([{ hello: 1 }, { hello : 2 }]);
         done();
       });
    });

    after(dropTestDatabase);
  });
});


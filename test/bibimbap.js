var assert   = require('assert');
var Bibimbap = require('../');

describe('Bibimbap', function() {

  describe('Cursor', function() {

    it('context is bound', function() {
      var state = new Bibimbap({
        test: 'original'
      });
      var actual = state.cursor().select('test').set.call(undefined, 'changed').get();
      assert.equal('changed', actual);
    });

    describe('name', function() {
      it('can have a name', function() {
        var state = new Bibimbap();
        assert.equal('name', state.cursor('name').name());
      });

      it('can create a cursor with a new name', function() {
        var state = new Bibimbap();
        assert.equal('new', state.cursor('old').name('new').name());
      });

      it('defaults to path', function() {
        var state = new Bibimbap();
        assert.equal('first.second.third', state.cursor().select('first', 'second').select('third').name());
      });
    });

    describe('select', function() {
      it('navigates down in tree', function() {
        var tree = {
          first: {
            second: {}
          }
        };
        var state  = new Bibimbap(tree);
        var first  = state.cursor().select('first');
        var second = first.select('second');
        assert.deepEqual(['first'], first.keys);
        var expected = ['first', 'second'];
        assert.deepEqual(expected, second.keys);
        assert.deepEqual(expected, state.cursor().select(['first', 'second']).keys);
        assert.deepEqual(expected, state.cursor().select('first', 'second').keys);
      });

      it('returns the same cursor when called without arguments', function() {
        var state = new Bibimbap({
          test: 'bla'
        });
        var cursor = state.cursor();
        assert(cursor === cursor.select());
      });
    });

    describe('map', function() {
      it('maps cursors to something', function() {
        var state = new Bibimbap({
          items: ['hello', 'bla']
        });
        var actual = state.cursor().map('items', function(cursor, key) {
          return key + ':' + cursor.get();
        }).join(',');
        assert.equal('0:hello,1:bla', actual);
      });

      it('works also with plain objects', function() {
        var state = new Bibimbap({
          items: {
            hello: 'bla',
            test:  'value'
          }
        });
        var actual = state.cursor().map('items', function(cursor, key) {
          return key + ':' + cursor.get();
        }).join(',');
        assert.equal('hello:bla,test:value', actual);
      });
    });

    describe('root', function() {
      var state = new Bibimbap({
        test: 'value'
      });
      var actual = state.cursor().select('bla', 'bla').root().get('test');
      assert.equal('value', actual);
    });

    describe('up', function() {
      it('navigates up in the tree', function() {
        var state = new Bibimbap({
          test: 'value'
        });
        assert.equal('value', state.cursor().select('test', 'example').up().get());
      });
    });

    describe('get', function() {
      it('returns the data', function() {
        var state = new Bibimbap({
          test: 'bla'
        });
        assert.equal('bla', state.cursor().select('test').get());
        assert.equal('bla', state.cursor().get('test'));
      });

      it('returns undefined when key does not exist (does not crash)', function() {
        var state = new Bibimbap({});
        assert.strictEqual(state.cursor().get('example', 'bla'), undefined);
      });

      it('can also get the tree root', function() {
        var tree  = {};
        var state = new Bibimbap(tree);
        assert.strictEqual(tree, state.cursor().get());
      });
    });

    describe('only', function() {
      it('omits keys', function() {
        var state = new Bibimbap({
          test: {
            a: 1,
            b: 2,
            c: 3
          }

        });
        var actual   = state.cursor().only('test', ['a', 'b']);
        var expected = {
          a: 1,
          b: 2
        };
        assert.deepEqual(expected, actual);
      });
    });

    describe('set', function() {
      it('contains the tree structure', function() {
        var tree = {
          test: 'bla'
        };
        var state = new Bibimbap(tree);
        assert.equal(tree, state.cursor().tree);
      });

      it('does autocommit', function(done) {
        var state = new Bibimbap({
          test: 'original'
        });
        state.on('commit', function(tree, prev, cursor) {
          assert.equal('hello', tree.test);
          assert.equal('hello', cursor.get());
          assert.equal('original', prev.test);
          done();
        });
        state.cursor().set('test', 'hello');
      });

      it('does not autocommit when in transaction', function(done) {
        var state = new Bibimbap({
          test: 'original'
        });
        state.on('commit', function(tree, prev, cursor) {
          assert.equal('second', tree.test);
          assert.equal('second', cursor.get());
          assert.equal('original', prev.test);
          done();
        });
        state.cursor().select('test').transaction()
          .set('first')
          .set('second')
          .commit();
      });

      it('can set data', function() {
        var state = new Bibimbap({
          test: {
            example: 'bla'
          }
        });
        var cursor = state.cursor().set(['test', 'example'], 'updated');
        assert.equal('updated', cursor.get(['test', 'example']));
      });

      it('does not mutate the tree', function() {
        var tree = {
          hello: 'original'
        };
        var state = new Bibimbap(tree);
        state.cursor().set('test', 'updated');
        assert.strictEqual(tree.hello, 'original');
      });

      it('but it will replace the tree', function() {
        var tree = {
          hello: 'original'
        };
        var state = new Bibimbap(tree);
        state.cursor().set('test', 'updated');
        assert(state.tree !== tree);
      });

      it('creates an array when the key is a number', function() {
        var state = new Bibimbap();
        assert(state.cursor().set('0', 'test').get() instanceof Array);
      });

      it('creates an array when key is a number (deep)', function() {
        var state = new Bibimbap();
        assert(state.cursor().set('0', 'test').get() instanceof Array);
        var r = state.cursor().set(['0', '0'], 'test').get();
        assert(r instanceof Array);
        assert(r[0] instanceof Array);
      });

      it('works with multiple keys (array)', function() {
        var state = new Bibimbap({
          test: 'hello'
        });
        var expected = {
          test: {
            example: 'updated'
          }
        };
        var actual = state.cursor().set(['test', 'example'], 'updated').get();
        assert.deepEqual(expected, actual);
      });

      it('works with multiple keys (additional arguments)', function() {
        var state = new Bibimbap({
          test: 'hello'
        });
        var expected = {
          test: {
            example: 'updated'
          }
        };
        assert.deepEqual(expected, state.cursor().set('test', 'example', 'updated').get());
      });

      it('can set on undefined keys', function() {
        var state  = new Bibimbap({});
        var cursor = state.cursor().set(['hello', 'bla'], 'value');
        assert.equal('value', cursor.get(['hello', 'bla']));
      });

      it('has no effect on navigation', function() {
        var state  = new Bibimbap({});
        var cursor = state.cursor().set('test', 'updated');
        assert.equal(0, cursor.keys.length);
      });
    });

    describe('setter', function() {
      it('returns a function that will set the value', function() {
        var state  = new Bibimbap();
        var setter = state.cursor().setter('test', 'value');
        assert.equal('value', setter().get('test'));
      });
    });

    describe('push', function() {
      it('adds a item at the end', function() {
        var state  = new Bibimbap();
        var actual = state.cursor().push(1).push(2).get();
        assert.deepEqual([1, 2], actual);
      });
    });

    describe('unshift', function() {
      it('adds a item at the beginning', function() {
        var state  = new Bibimbap();
        var actual = state.cursor().unshift(1).unshift(2).get();
        assert.deepEqual([2, 1], actual);
      });
    });

    describe('process', function() {
      it('applies a function to state', function() {
        var state  = new Bibimbap(0);
        var cursor = state.cursor();
        var inc    = function(n) {
          return n + 1;
        };
        cursor.process(inc);
        assert.equal(2, cursor.process(inc).get());
      });
    });

    describe('exists', function() {
      it('checks there is data', function() {
        var state = new Bibimbap({
          test: 'bla'
        });
        var cursor = state.cursor();
        assert(cursor.exists());
        assert(cursor.exists('test'));
        assert(cursor.select('test').exists());
        assert(cursor.exists('does-not-exist') === false);
        assert(cursor.select('does-not-exist').exists() === false);
      });

      it('has alias "has"', function() {
        var state = new Bibimbap({
          test: 'bla'
        });
        var cursor = state.cursor();
        assert(cursor.has);
      });
    });

    describe('remove', function() {
      it('object key', function() {
        var state = new Bibimbap({
          bla:  'test',
          test: 'here'
        });
        var expected = {
          bla: 'test'
        };
        assert.deepEqual(expected, state.cursor().remove('test').get());
      });

      it('array index', function() {
        var state  = new Bibimbap([1, 2]);
        var actual = state.cursor().remove(1).get();
        assert.deepEqual([1], actual);
        assert.equal(1, actual.length);
      });

      it('root', function() {
        var state  = new Bibimbap([1, 2]);
        var actual = state.cursor().remove().get();
        assert.deepEqual('undefined', typeof actual);
      });

      it('not existing', function() {
        var state  = new Bibimbap();
        var actual = state.cursor().remove('bla', 'bla').get();
        assert.deepEqual('undefined', typeof actual);
      });
    });

    describe('assign', function() {
      it('works like assign, but is immutable', function() {
        var state = new Bibimbap({
          test: {
            key: 'value'
          }
        });
        var actual = state.cursor()
          .assign('test', {
            key2: 'value2'
          })
          .get();
        var expected = {
          test: {
            key:  'value',
            key2: 'value2'
          }
        };
        assert.deepEqual(expected, actual);
      });
    });

    describe('transaction', function() {
      it('always applies changes to the latest state', function() {
        var state = new Bibimbap({});
        state.cursor().set('test1', 'value1');
        var cursor = state.cursor().set('test2', 'value2');
        assert.equal('value1', cursor.get('test1'));
        assert.equal('value2', cursor.get('test2'));
      });
    });
  });
});

var emitter       = require('component-emitter');
var assign        = require('object-assign');
var flatten       = require('array-flatten');
var isPlainObject = require('is-plain-object');

module.exports = Bibimbap;

/**
 * Bibimbap tree structure
 */
function Bibimbap(tree) {
  if (!(this instanceof Bibimbap)) return new Bibimbap(tree);
  emitter(this);
  this.tree = tree;
}

/**
 * Commit a cursor
 */
Bibimbap.prototype.commit = function(cursor) {
  var operations = cursor.operations;
  var prev       = this.tree;

  // create a new tree with the operations applied
  this.tree = runOperations(this.tree, cursor.operations);

  // reset the cursors operations, as they are already
  // applied to the tree
  cursor.operations = [];

  this.emit('commit', this.tree, prev, cursor);
};

function runOperations(tree, operations) {
  return operations.reduce(operationReducer, tree);
}

/**
 * Retures new tree with the operation applied
 */
function operationReducer(tree, op) {
  return attach(
    tree,
    op.keys,
    op.fn(get(tree, op.keys), op.keys)
  );
}

/**
 * Get a root cursor
 */
Bibimbap.prototype.cursor = function(name) {
  return new Cursor(this, name, [], [], true);
};

/**
 * Cursor allows to navigation on the tree and update data
 */
function Cursor(bibimbap, name, keys, operations, autocommit) {
  this.bibimbap   = bibimbap;
  this.cursorName = name;
  this.keys       = keys instanceof Array ? keys : [keys];
  this.operations = operations || [];
  this.autocommit = autocommit;
  bindAll(this);
}

/**
 * Extend the cursor
 */
function NextCursor(old, next) {
  var cursor = new Cursor(
    old.bibimbap,
    old.cursorName,
    old.keys,
    old.operations,
    old.autocommit
  );
  assign(cursor, next);
  return cursor;
}

var proto = Cursor.prototype;

/**
 * Set the name of a cursor
 */
proto.name = function(name) {
  if (name) {
    return NextCursor(this, {
      cursorName: name
    });
  }
  return this.cursorName || path(this.keys);
};

/**
 * Navigate down in the tree
 */
proto.select = function(keys) {
  if (keys === undefined) return this;
  var newKeys = flatten.from(arguments).map(toKey);
  return NextCursor(this, {
    keys: this.keys.concat(newKeys)
  });
};

/**
 * Navigate up to the root node
 */
proto.root = function() {
  return NextCursor(this, {
    keys: []
  });
};

/**
 * Navigate one level up
 */
proto.up = function() {
  return NextCursor(this, {
    keys: this.keys.slice(0, this.keys.length - 1)
  });
};

/**
 * Get the data stored in the tree
 */
proto.get = selectKeys(false, function() {
  var tree    = this.bibimbap.tree;
  var current = runOperations(tree, this.operations);
  return get(current, this.keys);
});

function get(tree, keys) {
  return keys.reduce(function(tree, key) {
    return (tree || {})[key];
  }, tree);
}

/**
 * Get get only some attributes
 */
proto.only = selectKeys(false, function(attributes) {
  var attrs = flatten.from(attributes);
  var data  = this.get();
  return attrs.reduce(function(acc, attr) {
    acc[attr] = data[attr];
    return acc;
  }, {});
});

/**
 * Map all items of the cursor
 * callback: (cursor, key) =>
 */
proto.map = selectKeys(false, function(callback) {
  var keys = Object.keys(this.get());
  return keys.map(function(key) {
    return callback(this.select(key), key);
  }.bind(this));
});

/**
 * Test if data for the cursor exists
 */
proto.exists = proto.has = function() {
  return this.get.apply(this, arguments) !== undefined;
};

/**
 * Update the data
 */
proto.set = operator(function(value, tree) {
  return value;
});

/**
 * Helper method to bind set
 * Usage:
 * <div onClick={ cursor.setter('clicked', 'yes') } >
 *   clicked: { cursor.get('clicked') }
 * </div>
 */
proto.setter = function() {
  var args = arguments;
  return function() {
    return this.set.apply(this, args);
  }.bind(this);
};

/**
 * Extend with additional keys
 */
proto.assign = operator(function(obj, tree) {
  return assign({}, tree, obj);
});

/**
 * Add an item to an array
 */
proto.push = operator(function(item, array) {
  var next = (array || []).slice(0);
  next.push(item);
  return next;
});

/**
 * Add an item to an array
 */
proto.unshift = operator(function(item, array) {
  var next = (array || []).slice(0);
  next.unshift(item);
  return next;
});

/**
 * Remove data
 */
proto.remove = operator(function(key, tree, keys) {
  key = toKey(key);
  if (tree === undefined) {
    throw new Error('Can not remove not existing node: ' + path(keys.concat(key)))
  }
  if (typeof key === 'number') {
    return tree.slice(0, key).concat(tree.slice(key + 1));
  }
  var next = clone(tree);
  delete next[key];
  return next;
});

/**
 * Convenience method to remove an item
 * usefull for attaching it to an event handler
 * where it would receive an additional dom event
 */
proto.remover = function() {
  this.up().remove(this.keys[this.keys.length - 1]);
};

/**
 * Process a value
 * usage:
 *  cursor.process(function inc(n) {
 *    return n + 1
 *  });
 */
proto.process = operator(function(fn, tree) {
  return fn(tree);
});

/**
 * Start a transaction
 */
proto.transaction = function() {
  return NextCursor(this, {
    autocommit: false
  });
};

/**
 * Commit the transactions in a cursor
 */
proto.commit = function() {
  this.bibimbap.commit(this);
};

/**
 * Internal helper method to create operators
 */
function operator(operator) {
  return selectKeys(true, function(value) {
    var next = NextCursor(this, {
      operations: this.operations
        .concat({
          keys: this.keys,
          fn:   operator.bind(null, value)
        })
    });
    if (next.autocommit) {
      next.commit();
    }

    return next;
  });
}

/**
 * Internal helper method to create function that
 * use additional arguments to select down in three
 * For example
 *  cursor.set('key', 'value')
 */
function selectKeys(reset, nArgs, fn) {
  if (typeof nArgs === 'function') {
    fn    = nArgs;
    nArgs = fn.length;
  }
  return function() {
    var cursor = this;
    var nKeys  = arguments.length - nArgs;
    var args   = [].slice.call(arguments, nKeys);
    var keys   = [].slice.call(arguments, 0, nKeys);
    var cursor = this.select.apply(this, keys);
    var result = fn.apply(cursor, args);
    return !reset ? result : NextCursor(result, {
      keys: this.keys
    });
  };
}

/**
 * Immutable update in tree
 */
function attach(tree, keys, value) {
  if (keys.length === 0) return value;
  var key = toKey(keys[0]);
  var next;
  if (isPlainObject(tree) || tree instanceof Array) {
    next = clone(tree);
  } else {
    next = typeof key === 'number' ? [] : {};
  }
  next[key] = attach((tree || {})[key], keys.slice(1), value);
  if (next[key] === undefined) {
    delete next[key];
  }
  return next;
}

/**
 * Clone plain object or array
 */
function clone(obj) {
  if (obj instanceof Array) {
    return obj.slice(0);
  }
  if (isPlainObject(obj)) {
    return assign({}, obj);
  }
  return obj;
}

/**
 * Bind the context of each method to the object
 */
function bindAll(obj) {
  for (var k in obj) {
    var fn = obj[k];
    if (typeof obj[k] === 'function') {
      obj[k] = bindAll.bind.call(fn, obj);
    }
  }
}

/**
 * Valid keys are strings and numbers
 * converts '3' to 3
 */
function toKey(key) {
  if (typeof key !== 'string' && typeof key !== 'number') {
    throw new Error('Invalid key: ' + key)
  }
  if (typeof key == 'string' && key.match(/^\d+$/)) {
    return parseInt(key, 10);
  }
  return key;
}

/**
 * Joins the keys to a human readable path
 */
function path(keys) {
  return keys.join('.');
}

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
  var prev = this.tree;
  this.tree = cursor.tree;
  this.emit('commit', this.tree, prev, cursor);
};

/**
 * Get a root cursor
 */
Bibimbap.prototype.cursor = function() {
  return new Cursor(this, this.tree, [], true);
};

/**
 * Cursor allows to navigation on the tree and update data
 */
function Cursor(bibimbap, tree, keys, autocommit) {
  this.bibimbap   = bibimbap;
  this.tree       = tree;
  this.keys       = keys instanceof Array ? keys : [keys];
  this.autocommit = autocommit;
  bindAll(this);
}

/**
 * Extend the cursor
 */
function NextCursor(old, next) {
  var cursor = new Cursor(old.bibimbap, old.tree, old.keys, old.autocommit);
  assign(cursor, next);
  return cursor;
}

var proto = Cursor.prototype;

/**
 * Navigate down in the tree
 */
proto.select = function(keys) {
  if (typeof keys == 'undefined') return this;
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
  return this.keys.reduce(function(tree, key) {
    return (tree || {})[key];
  }, this.tree);
});

/**
 * Get get only some attributes
 */
proto.only = function(attributes) {
  var attrs = flatten.from(arguments);
  var data  = this.get();
  return attrs.reduce(function(acc, attr) {
    acc[attr] = data[attr];
    return acc;
  }, {});
};

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
 * Update the data
 * - does not mutate the tree
 * - commits data to Bibimbap (unless in transaction)
 */
proto.set = selectKeys(true, function(value) {
  var cursor = NextCursor(this, {
    tree: attach(this.tree, this.keys, value)
  });
  if (cursor.autocommit) {
    cursor.commit();
  }
  return cursor;
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
 * Add an item to an array
 */
proto.push = selectKeys(true, function(item) {
  var next = (this.get() || []).slice(0);
  next.push(item);
  return this.set(next);
});

/**
 * Add an item to an array
 */
proto.unshift = selectKeys(true, function(item) {
  var next = (this.get() || []).slice(0);
  next.unshift(item);
  return this.set(next);
});

/**
 * Remove data
 */
proto.remover = function() {
  var obj = this.up().get();
  var key = this.keys[this.keys.length - 1];

  if (typeof this.get() === 'undefined') {
    return this;
  }
  if (this.keys.length === 0) {
    return this.set(undefined);
  }
  if (obj instanceof Array) {
    return this.up().set(obj.slice(0, key).concat(obj.slice(key + 1)));
  }
  obj = clone(obj);
  delete obj[key];
  return this.up().set(obj);
};

proto.remove = selectKeys(true, proto.remover);

/**
 * Test if data for the cursor exists
 */
proto.exists = proto.has = function() {
  return typeof this.get.apply(this, arguments) !== 'undefined';
};

/**
 * Extend with additional keys
 */
proto.assign = selectKeys(true, function(obj) {
  return this.set(assign({}, this.get(), obj));
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
 * Commit the transaction
 */
proto.commit = function() {
  this.bibimbap.commit(this);
};

/**
 * Process a value (fast forward to latest state)
 * usage:
 *  cursor.process(function inc(n) {
 *    return n + 1
 *  });
 */
proto.process = selectKeys(true, function(processor) {
  return this.set(processor(this.latest().get()));
});

/**
 * Fast forward the cursor to the latest state
 * - use carefully
 * - when possible use process instead
 */
proto.latest = function() {
  return this.bibimbap.cursor().select(this.keys);
};

/**
 * Internal helper method to create function that
 * use additional arguments to select down in three
 * For example
 *  cursor.set('key', 'value')
 */
function selectKeys(reset, fn) {
  return function() {
    var cursor = this;
    var nKeys  = arguments.length - fn.length;
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
 * Capitalize a string
 */
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
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

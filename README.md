# Bibimbap

Bibimbap is a simple JavaScript immutable tree data structure supporting cursors.
It is inspired by [Baobab](https://github.com/Yomguithereal/baobab) but implements
only a small subset of its features and is much lighter.

It is intended to be used as a central data structure containing application state
when using a library like [Deku](https://github.com/dekujs/deku) or react.

And a Bibimbap is also a light Korean dish :)

![Bibimbap](http://meljoulwan.com/wp-content/uploads/2014/04/bibimbap1.jpg)

# Cursors

Cursors help you to write self-contained ui component that receive only their
part of the global state.

- Cursors are used to navigation through the tree. 
- They are immutable, every operation returns a new cursor.
- Cursors represent not only the location in a tree but also the state in time. 
- Commiting a previous cursor will revert the state.

Unlike in Baobap cursors don't emit update events. The idea is to re-render the application and work with new cursors instead.

# Example

A [todo](https://github.com/manuelstofer/bibimbap/tree/master/example) component implemented with Deku

```js
import {element} from 'deku'
import Input from './input.jsx'
import './todo.css'

export default {
  render: ({ props }) => {

    let {cursor} = props;
    let canAdd   = cursor.get('did-change');

    let items = cursor.map('items', (cursor) => {
      return (
        <li>
          { cursor.get() } <span onClick={ cursor.remover } >✖</span>
        </li>
      );
    });

    return (
      <div class="todo">
        <form onSubmit={ addItem } >
          <ul>{ items }</ul>
          <Input cursor={ cursor } name="new-item" type="text" />
          <button type="submit" disabled={ !canAdd }>
            Add
          </button>
        </form>
      </div>
    );

    function addItem(ev) {
      ev.preventDefault();
      cursor
        .push('items',cursor.get('new-item'))
        .set('did-change', false)
        .set('new-item', '')
    }
  }
}
```

# State

Create new application state

```js
var state = new Bibimbap({ some: 'data' });
```

#### state.cursor()

Create a cursor

#### state.commit(cursor)

Commit the state of a cursor back to the application state. By default cursors autocommit.


# Navigation

#### cursor.select(key)

Navigate down in tree

```js
cursor.select('key');
cursor.select('first', 'second');
cursor.select(['first', 'second']);
cursor.select('first').select('second');
```

#### cursor.up()

Navigate one level up in tree

#### cursor.root()

Navigate up to the root node


#### optional keys

Almost all of the following methods accept optional key arguments. But they have no effect on the returned
cursor, just on the current operation.

```js

var nextCursor = cursor.set('first', 'second', 'value); // nextCursor has still the same location
cursor.set(['first', 'second'], 'value);                // keys can also be in an array

```
# Get data

#### cursor.get()

Get data from the tree

```js
cursor.get('key');
cursor.get('first', 'second');
cursor.get(['first', 'second']);
```

#### cursor.only(attributes)

Get only certain attributes, like lodash.omit


```js
var state = new Bibimbap({ test: { a: 1, b:2 } });
state.cursor().only('test', ['a']); // { a: 1 }
```

#### cursor.map((cursor, key) => value)

Map over the children

```js
cursor.map(function (cursor, key) {
  return 'hello' + cursor.get()
});
```

#### cursor.exists()

Tests if data at the cursors location exists

# Set data

#### cursor.set(value)

Set a value. Autocommited unless in a .transaction

```js
cursor.set(1);                                           // 1
cursor.set('test', 'hello');                             // { test: 'hello' }
cursor.set('first', 'second', 'hello');                  // { first: { second: 'hello} }
cursor.set(['test'], 'hello');                           // { test: 'hello' }
cursor.set('test', 'hello').set('test2', 'bla').get();   // { test: 'hello', test2: 'bla' }
```


#### cursor.setter(value)

Like set but returns a function that will set when called

```js
<div onClick={ cursor.setter('clicked', 'yes') } >
  clicked: { cursor.get('clicked') }
</div>
```

#### cursor.push(value)

Add a new element to the end of an array

#### cursor.unshift(value)

Add a new element to the start of an array

#### cursor.remove()

Remove the data at the cursors location

#### cursor.remover()

Same as .remove but returns a function

#### cursor.assign()

Like Object.assign

#### cursor.process(callback(data) => newValue)

Process the state with a function. Process will always use the
current data in the tree, even when called on an older cursor.

```js
cursor.process(function inc(n) {
  return n + 1;
});
```

# Transaction

Transactions allow to perform multiple actions before commiting back to the state

#### cursor.transaction()

Start a transaction

```js
cursor.transaction()
  .select('example')
  .set('bla')
  .up()
  .set('test', 5)
  .commit()
```

#### cursor.commit()

Commit the cursor back to the state. This will exchange the state tree
regardless if the cursor is in an transaction or not.

Can be used to roll back to an old state.

```js
var Bibimbap = require('bibimbap');
var state = new Bibimbap({ test: 'original' });
var cursor = state.cursor();
cursor.select('test')
  .set('updated 1');    // cursors autocommit unless you start a .transaction()
  .set('updated 2');

state.commit(cursor);   // will revert the state to the original cursor

// only the central state emits events
state.on('commit', function (tree, ) {
  console.log(tree)
});
```

Output: 
```
{ test: 'update 1' }
{ test: 'update 2' }
{ test: 'original' }
```





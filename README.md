# Bibimbap

Bibimbap is a simple JavaScript immutable tree data structure supporting cursors.
It is inspired by [Baobab](https://github.com/Yomguithereal/baobab) but implements
only a small subset of it's features. It's much lighter and also conceptually a bit different.

It is intended to be used as a central data structure containing application state
when using a library like [Deku](https://github.com/dekujs/deku) or react.

And a Bibimbap is also a light Korean dish :)

![Bibimbap](http://meljoulwan.com/wp-content/uploads/2014/04/bibimbap1.jpg)

# Cursors

Cursors help you to write self-contained ui component that receive only their
part of the global state.

- Cursors are used to navigate through the tree.
- They are also immutable, every operation returns a new cursor.

Unlike in Baobap cursors don't emit update events. The idea is to re-render everything with the next version of the state.

# Example

A [todo](https://github.com/manuelstofer/todo-bibimbap-deku) component implemented with Deku

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

# Run Examples

Install `example` specific dependencies, then run the build `npm` script.
```bash
$ cd example && npm i && npm start
```

# State

Create new application state

```js
var state = new Bibimbap({ some: 'data' });
```

# Cursors


#### state.cursor(name)

Create a cursor. Cursors can have an optional name.

#### cursor.name(name)

When the name is given it returns a new cursor with that name.
Otherwise it will return name name of the cursor

```
cursor.name('hello').name(); // hello
```

The default name of a cursor is its keys.

```
state.cursor().select('first', 'second').name(); // "first.second"
```

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

var nextCursor = cursor.set('first', 'second', 'value'); // nextCursor has still the same location
cursor.set(['first', 'second'], 'value');                // keys can also be in an array

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

Get only certain attributes, like _.pick({a: 1, b: 2, c:3}, ['a','b'])

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



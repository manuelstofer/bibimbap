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

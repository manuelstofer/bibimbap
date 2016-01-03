/** @jsx element */
import {element} from 'deku'

export default {
  render: ({ props }) => {

    let { type, name, cursor } = props;

    return (
      <input
        class="ui-input"
        type={ type }
        placeholder={ props.placeholder }
        value={ cursor.get(name) }
        onInput={ onInput } />
    )

    function onInput(ev) {
      var value = ev.srcElement.value;
      return cursor.transaction()
        .set(name, value)
        .set('did-change', true)
        .commit();
    }
  }
}

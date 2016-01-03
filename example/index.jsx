/** @jsx element */
import {element, dom} from 'deku'
import Bibimbab from '../bibimbap.js'
import Todo from './todo.jsx'

let state = new Bibimbab({ items: ['some', 'items'] });
state.on('commit', rerender)

let render = dom.createRenderer(document.body, function () {})
rerender();

function rerender() {
  render(<Todo cursor={ state.cursor() }/>)
}

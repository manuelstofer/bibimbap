let {element, dom} = require('deku');
let Bibimbab       = require('../bibimbap.js');
let Todo           = require('./todo.jsx').default;

let state = new Bibimbab({ items: ['some', 'items'] });
state.on('commit', rerender)

let render = dom.createRenderer(document.body, function () {})
rerender();

function rerender() {
  render(<Todo cursor={ state.cursor() }/>)
}

if (module.hot) {
  module.hot.accept('./todo.jsx', function() {
    Todo = require('./todo.jsx').default
    rerender()
  });
}

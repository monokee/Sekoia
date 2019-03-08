Cue.State('Row-Data', {

  data: {
    selected: false,
    label: ''
  },

  initialize({selected = this.selected, label = this.label}) {
    this.selected = selected;
    this.label = label;
  }

});

Cue.UI('Table-Row', {

  element: (`
    <template>
      <tr $row class="table-row">
        <td $label data-action="select"></td>
        <td data-action="delete">✕</td>
      </tr>
    </template>
  `),

  render: {
    $row: {
      selected(el, data) {
        el.useClass('selected', data);
      }
    },
    $label: {
      label(el, data) {
        el.setText(data);
      }
    }
  }

});
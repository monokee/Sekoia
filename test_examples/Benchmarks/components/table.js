Cue.State('Table-Data', Component => ({

  data: {
    rows: [],
    result: '- - -'
  },

  imports: {
    Row: Component.import('Row-Data')
  },

  buildRows(count) {
    const rows = [];
    for (let i = 0; i < count; i++) rows.push(this.Row({selected: false, label: createRandomLabel()}));
    return rows;
  },

  updateEveryNthRow(n = 10) {
    for (let i = 0; i < this.rows.length; i += n) {
      this.rows[i].selected = !this.rows[i].selected;
    }
  },

  populate(numRows = 1000) {
    this.rows = this.buildRows(numRows);
  },

  appendRows(numRows = 1000) {
    this.rows.push(...this.buildRows(numRows));
  },

  swapRows() {
    this.rows.reverse();
  },

  sortRows() {
    let lA, lB;
    this.rows.sort((a, b) =>  {
      lA = a.label.toLowerCase();
      lB = b.label.toLowerCase();
      return lA < lB ? -1 : lA > lB ? 1 : 0;
    });
  },

  delete(index) {
    this.rows.splice(index, 1);
  },

  select(index) {
    this.rows[index].selected = !this.rows[index].selected;
  },

  clearAllRows() {
    this.rows = [];
  }

}));

Cue.UI('Table-UI', Component => ({

  element: (`
    <div class="container">
      <h1>Cue Benchmark</h1>
      <div class="header">
        <div class="buttonGroup">
          <button $run type="button" id="run">Create 1k rows</button>
          <button $clear type="button" class="outline" id="clear">Clear</button>
          <button $add type="button" id="add" class="clear">+ 1k</button>
          <button $update type="button" class="clear" id="update">Toggle every 10th</button>
          <button $swaprows type="button" class="clear" id="swap">Reverse</button>
          <button $sortrows type="button" class="clear" id="sort">Sort</button>
        </div>
        <div $result class="result">- - -</div>
      </div>
      <table class="table">
          <tbody $tbody></tbody>
      </table>
    </div>
  `),

  imports: {
    Row: Component.import('Table-Row')
  },

  initialize(state) {
    this.state = state;
  },

  events: {
    click: {
      table(e) {
        const action = e.target.dataset.action;
        if (action) {
          this.state[action](this.getIndex(e.target.closest('.table-row')));
        }
      },
      '#run'() {
        const start = performance.now();
        this.state.populate();
        const time = (performance.now() - start).toFixed(4);
        this.state.result = `Created 1.000 rows in ${time}ms`;
      },
      '#add'() {
        const start = performance.now();
        this.state.appendRows();
        const time = (performance.now() - start).toFixed(4);
        this.state.result = `Appended 1.000 rows in ${time}ms`;
      },
      '#update'() {
        const start = performance.now();
        this.state.updateEveryNthRow();
        const time = (performance.now() - start).toFixed(4);
        this.state.result = `Updated every 10th row in ${time}ms`;
      },
      '#clear'() {
        const start = performance.now();
        this.state.clearAllRows();
        const time = (performance.now() - start).toFixed(4);
        this.state.result = `Cleared all rows in ${time}ms`;
      },
      '#swap'() {
        const start = performance.now();
        this.state.swapRows();
        const time = (performance.now() - start).toFixed(4);
        this.state.result = `Reversed all rows in ${time}ms`;
      },
      '#sort'() {
        const start = performance.now();
        this.state.sortRows();
        const time = (performance.now() - start).toFixed(4);
        this.state.result = `Sorted all rows in ${time}ms`;
      }
    }
  },

  render: {
    $tbody: {
      rows(el, data) {
        el.setChildren(data, this.Row);
      }
    },
    $result: {
      result(el, data) {
        el.setText(data);
      }
    }
  }

}));
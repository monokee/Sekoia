# Cue - Build atomically reactive web apps in pure Javascript.

Build blazingly fast, reactive web applications from reusable components that are fully driven by declarative
domain data. Cue lets you write pure javascript, does not require any build process and works in all modern browsers.
It combines a lot of modern architectural and philosophical approaches to scalable, domain-driven application development
in a single framework. The following ideas are at the heart of Cue:
- Everything is driven by data and derivations of data that live in a single, composable state tree
- The state tree can be declared as a single object or broken down into logical state modules
- These sub-states are created from State Factories which stamp out instances of the state modules


<br>
<img align="left" src="https://github.com/monokee/Cue/raw/master/CueLogo.png" alt="Cue Logo" width="270"/>

### Reactive module-driven state
```javascript
Cue.State('AppData', Module => ({
  data: {
    title: 'My App',
    contentColor: '#fff',
    isContentColorWhite({contentColor}) {
      return contentColor === '#fff'
    }
  }
}));
```
### Declarative data-driven views
```javascript
Cue.UI('MainView', Component => ({

  element: (`
    <div $container class="main">
      <h1 $title></h1>
      <p $content class="paragraph" tabindex="0"></p>
    </div>
  `),
  
  styles: {
    main: {
      width: '100vw',
      background: 'rgb(22,25,28)',
      color: 'rgb(232,235,238)'
    }
  },
  
  events: {
    click: {
      h1(e) {
        this.state.title += '!!!';
      }
    },
    focusout: {
      paragraph(e) {
        this.state.contentColor = 'rgb(0,115,255)';
      }
    }
  },
  
  render: {
    $title: {
      title(el, val) {
        el.setText(val);
      }
    },
    $content: {
      contentColor(el, val) {
        el.element.style.color = val;
      }
    }
  }
  
}));
```
### Composable application fragments
```javascript
const MyCue = Cue({
  state: 'AppData',
  ui: 'MainView'
});

MyCue.mount(document.body, {
  title: 'Cue.js Demo',
  contentColor: 'hot-pink'
});
```
<br>

## Features
...tbd

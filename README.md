# Cue - Atomically reactive web apps in pure Javascript.

Build blazingly fast, reactive web applications from reusable components that are fully driven by declarative
domain data. Cue lets you write pure javascript, does not require any build process and works in all modern browsers.
It combines a lot of modern architectural approaches to scalable, domain-driven application development
in a single framework.

<img align="left" src="https://github.com/monokee/Cue/raw/master/CueLogo.png" alt="Cue Logo" width="100" height="100"/>
<p>Cue is still under development and not quite ready for production.</p>
<pre><code>Version: Beta 1.0</code></pre>

***

### Install Cue

Getting started couldn't be easier. Just include the minified build:

```html
<script src=".../build/cue.min.js"</script>
```
***

<br>

## Creating Composites
A proven approach to creating scalable, easy-to-maintain applications is to break down complex domains into multiple components which are closely modeled after their high-level use case. Cue fascilitates this approach via Composites. Composites are composable components which are made up of 2 distinct pieces of code internally: `State Modules` and `UI Components`.

`State Modules` is where we define our data model. A model is the bare-bones, data-only declaration of what our app is about.
`UI Components` take these models and format the plain data into a renderable user interface which automatically updates whenever the data changes.

This separation of domain data and logic from ui-related code is more than just clean semantics: It ensures that the UI updates whenever the underlying data model changes - no matter who or what is responsible for the update. It could be the server, the user or the system. Any change to the data model is agnostically rendered by the UI Component.

<b>A Composite is the building block which encapsulates these 2 pieces of code. </b>
```javascript
const MyComposite = Cue({
  state: 'AppData',
  ui: 'MainView'
});

MyCue.mount(document.body, {
  title: 'Cue.js Demo',
  author: 'monokee',
  version: 1.00420
});
```
<b>A State Module declares domain data and logic.</b>
```javascript
Cue.State('AppData', Module => ({
  data: {
    title: 'My App',
    author: 'unknown',
    version: 0,
    isAuthorKnown({author}) {
      return author && author !== 'unknown';
    }    
  }
}));
```
<b>A UI Component formats the data from a State Module into a renderable user interface.</b>
```javascript
Cue.UI('MainView', Component => ({

  element: (`
    <div $container class="main">
      <h1 $title></h1>
      <p $content class="paragraph" tabindex="0"></p>
    </div>
  `),
  
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

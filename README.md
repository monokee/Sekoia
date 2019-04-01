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

<b>A Composite is the building block which encapsulates these 2 pieces of code:</b>
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
<b>A State Module declares domain data and logic:</b>
```javascript
Cue.State('AppData', Module => ({
  data: {
    title: 'My App',
    author: 'unknown',
    version: 0,
    fullContent({title, author, version}) {
      return `${title} written by ${author}. v${version}`;
    }
  }
}));
```
<b>A UI Component formats the data from a State Module into a renderable user interface:</b>
```javascript
Cue.UI('MainView', Component => ({

  element: (`
    <div $container class="main">
      <h1 $title></h1>
      <p $content></p>
    </div>
  `),
  
  render: {
    // granular, reactive render functions which run whenever the connected state changes.
    $title: { // the the anchor element defined in the markup above.
      title(element, value) { // "title" is the name of the data property that the $title anchor element reacts to.
        element.setText(value); // "element" is a wrapper around a real dom node with helper methods to simplify DOM ops.
      }
    },
    $content: {
      fullContent(element, value) {
        element.setText(value);
      }
    }
  }
  
}));
```
Obviously this composite is contrived and far from a complete building block required in any real application so be sure to check out the examples and read through the official docs to explore more advanced concepts like built-in CSS-in-JS, Synthetic Events, Lifecycle hooks and more.

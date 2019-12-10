# Cue.js - Data driven Web Components
<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/main-desktop-browser-logos.png" width="200" alt="All major browsers">

<i>"Build blazingly fast, reactive web applications from reusable components that are fully driven by declarative
domain data. Cue extends <b>native WebComponents</b> with flux-like data binding and reactivity.
Cue lets you write vanilla javascript, does not require any build process and works in all modern browsers."</i>

<br>

<img align="left" src="https://github.com/monokee/Cue/raw/master/logo.png" alt="Cue Logo" width="100" height="100"/>
<br>
<pre><code>Cue Nightly 1.0 // ES6 - All major browsers</code></pre>

#### A modern UI Library for the web of tomorrow.
Cue offers structure and high-performance reactivity while providing clean low-level access to the DOM.
It combines a lot of modern architectural approaches to scalable, domain-driven application development
in a single lightweight library for creating complex user interfaces. (only 16kb minified). 
<ul>
  <li>🚀 Works with the real DOM</li>
  <li>🤯 No extra template language</li>
  <li>💩 No procedural logic in markup ever (c-for, c-if directives etc)</li>
  <li>😍 Comprehensible structure by facilitating one-way data flow</li>
  <li>🛰 Fully observable data models with computations and side-effects</li>
</ul>

Cue creates native custom elements under the hood. Custom elements usually require the use of the class syntax and
provide no native data binding or reactivity. Cue extends custom elements with first class low-level reactivity, computed properties, one-way-data-flow,
blazingly fast list rendering (faster than any Virtual DOM alternatives), a familiar configuration object syntax and better lifecycle methods.
***
### Getting Started
<p style="font-weight:bold;">Let's take a look at a really simple Component written with Cue:</p>

```javascript
import {Component, Store} from './build/cue.min.js';

Component.define('my-component', {

  element: (`
    <h1 ref="title"></h1>
    <ul ref="userList"></ul>
    <button ref="deleteButton">Delete All Users</button>
  `),

  styles: (`
    self {
      position: absolute;
    }
    self:hover {
      opacity: 0.75;
    }
    title {
      text-transform: uppercase;
    }
  `),

  data: {
    users: { // reads/writes from a global, persistent store. provides empty array as default value (if store has no value)
      value: Store.bind('users', []),
      reaction: 'renderUsers'
    },
    title: { // computed property which dynamically reevaluates whenever "users" changes.
      value: ({users}) => users.length ? 'Our Users' : 'We have no users...',
      reaction: 'renderTitle'
    } 
  },

  reactions: {
    renderUsers({userList}, users) {
      userList.renderEach(users, user => Component.create(`
        <li>${user.firstName} ${user.lastName}</li>
      `))
    },
    renderTitle({title}, value) {
      title.textContent = value;
    } 
  },

  initialize({deleteButton}) {
    deleteButton.addEventListener('click', () => {
      this.set('users', []);
    });
  }  

});
```

Let's break down the Component piece by piece:

### Component.element
Plain old static HTML - your components skeleton. 
Your markup should be truly static. Don't include anything that should dynamically change here. We'll take care of dynamic parts later.
```javascript
{
  element: `
    <h1 ref="title"></h1>
    <ul ref="userList"></ul>
    <button ref="deleteButton">Delete All Users</button>
  `
}
```

<b>Note</b> the special "ref" attribute. Cue automatically parses your component and passes these "refs" to all reactions and lifecycle methods
for programmatic access.
***
### Component.styles
Plain old CSS - with a twist.
The CSS written here will be "softly" scoped to your component. Soft scoping means that outside, global CSS can still reach into the
component for global theming etc via classes. Cue simply prepends all selectors (except component-name and "self") with the name of the component. 
Refs can be used as style selectors as is.

With that in mind Cue will internally convert:
```css
  self {
    position: absolute;
  }
  self:hover {
    opacity: 0.75;
  }
  title {
    text-transform: uppercase;
  }
``` 
into:

```css
  my-component {
    position: absolute;
  }
  my-component:hover {
    opacity: 0.75;
  }
  my-component [ref="title"] {
    text-transform: uppercase;
  }
``` 
and append these rules to a global stylesheet.

<b>Note</b> that you can enable true style encapsulation by passing "encapsulated: true" to the configuration object. 
This will append all styles and element content to the components shadow dom (see official shadow dom specs for details).
***

### Component.data

Think of a data model as a simple, high-level description of the moving parts of your component. 
This is the data that the component needs to somehow display to the user. This is how a basic data model is created in Cue:

#### Simple Properties
```javascript
data: {
  simple: {
    value: 'Hey this is a String!',
    reaction: 'renderString'
  }
}
``` 
Data properties are objects containing a ```value``` and optionally a ```reaction``` property. 
```reaction``` specifies a function either directly or
by referencing a function in the "reactions" object by name. More on reactions later.

You can read and write the value of a data property inside of lifecycle and custom top-level methods via:

```this.get('property') | this.set('property', value)```

Whenever the value of a data property changes, its corresponding reaction callback is added to Cue's render queue.
Cue automatically determines if the value has actually changed (deep comparison for objects and arrays) and only then
queues up the reaction. And if for whatever reason the value changes one million times before the next frame is rendered,
the reaction will still only be fired once with the most recent value - thanks to Cue's powerful auto-buffering renderer.

#### Computed Properties
You can specify <b>computed properties</b> simply by adding a function as the value:
```javascript
data: {
  computed: {
    value: ({dep1, dep2}) => `${dep1} ${dep2}`,
    reaction: 'renderComputed'
  }
}
``` 
Computed property functions receive an object containing all other properties (including other computed properties) as the
first and only argument. As a best practice you should <b>always destructure the properties your computation depends on
directly in the parameter.</b> This ensures that all dependencies can be resolved during a first run even if the computation contains 
complex conditional logic.
The computation should return its result.
Computed properties can be derived from other computed properties, a mix of computed and non-computed properties etc. 
Circular dependencies are not supported and Cue will throw as soon as circularity is detected.

#### Store Bindings
You can directly bind any property in your components data model to the global ```Store```.
This allows different components to share and access the exact same data. When the data in the store changes, 
all Components which bind to the changed property in the store are automatically updated. 
It doesn't matter how the store changes. 
It can be changed externally via ```Store.set('property', value)``` or via any component
that binds to the store via ```Component.set('propertyBoundToStore', value)```
When a component binds to the store, it can optionally provide a default value, which will be written into the store
in case the store doesn't have a value yet.
```javascript
data: {
  storeBound: {
    value: Store.bind('thePropertyInTheStore', 123), //123 is the defaultValue
    reaction: 'renderStoreBoundProperty'
  }
}
``` 
<b>Note</b> that any computations and reactions will be fired when the data in the store changes. The data can change 
by directly calling ```Store.set('thePropertyInTheStore', value)``` or via any Component which is bound to the Store via
```Component.set('storeBound', value)```
***
### Component.reactions

Reactions are callbacks that are fired in response to data changes and update fragments of DOM.
```javascript
reactions: {
  renderUsers({userList}, users) {
    userList.renderEach(users, user => Component.create(`
      <li>${user.firstName} ${user.lastName}</li>
    `))
  },
  renderTitle({title}, value) {
    title.textContent = value;
  } 
}
```
Reactions receive an object of all "ref" elements as their first argument. As a best practice, always destructure the elements
you need to manipulate directly in the parameter.
The second parameter is the value of the data property that has changed in the data model and triggered the reaction.

The single responsibility of reactions is to update the DOM. You can not access "this" inside of reactions for this reason.
All you should need is the ref elements you want to update with the value of the data property that has changed.

When you work with refs you directly target <b>real DOM nodes</b> - there is no abstraction layer and reactions thus offer incredible performance.
And because these reactions are only running in response to changes of the data model, even complex Cue Components never become 
hard to predict or maintain. Another benefit of working with the real DOM is that you can use pretty much all libraries anywhere. Just like that.

#### List rendering and reconciliation
Cue enhances all components and ref elements with a special ```renderEach``` method. This method accepts a data array and a 
"createElement" function which turns each entry in the data array into a DOM Node. 
Node.renderEach uses an optimized, ultra-fast reconciliation algorithm under the hood to update only the parts of the DOM that
are affected by the changes in data. You can optionally speed up the reconciliation even further by passing an "updateElement" function 
as a third parameter to renderEach which will attempt to update the element instead of replacing it. This is normally not needed.
***

### Component Lifecycle
The Lifecycle methods of Cue Components are largely equivalent to those of CustomElements.
<ol>
  <li>initialize - called only once per component instance, after the component has been inserted into the DOM but before "connected" fires.
  Receives "refs" as first and only argument. Typically this is where you would bind input events, retrieve server data etc.
  </li>
  <li>connected - equivalent to "connectedCallback" from CustomElements. Called every time component is inserted or re-inserted ino the DOM.</li>
  <li>disconnected - equivalent to "disconnectedCallback" from CustomElements. Called every time component is removed from the DOM.</li> 
  <li>adopted - equivalent to "adoptedCallback" from CustomElements.</li>
</ol>

***
<i>Cue.js - created by Jonathan Ochmann // Released under MIT License</i>


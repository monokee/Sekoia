# Cue.js - Data driven Web Components
<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/main-desktop-browser-logos.png" width="200" alt="All major browsers">

<i>"Build blazingly fast, reactive web applications from reusable components that are fully driven by declarative
domain data. Cue extends <b>native WebComponents</b> with flux-like data binding and reactivity.
It lets you write vanilla javascript, does not require any build process and works in all modern browsers."</i>

<br>

<img align="left" src="https://github.com/monokee/Cue/raw/master/logo.png" alt="Cue Logo" width="100" height="100"/>
<br>
<pre><code>Cue // Vanilla ES6 - All major browsers</code></pre>
<br>

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
      this.logMyCustomMessage('Delete Button was clicked 😱😱😱');
    });
  },

  logMyCustomMessage(message) {
    console.log('I am a custom method and this is my message:', message);
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

Oh and btw: You never need to manually unsubscribe from your Store bindings in lifecycle methods - Cue automatically protects you
from manual work and potential memory leaks. You're welcome.
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
All lifecycle methods have access to the underlying CustomElement via "this" and receive "refs" 
object as the first and only argument.
<ol>
  <li>initialize - called only once per component instance, after the component has been inserted into the DOM but before "connected" fires.
  Typically this is where you would bind input events, retrieve server data etc.
  </li>
  <li>connected - equivalent to "connectedCallback" from CustomElements. Called every time component is inserted or re-inserted into the DOM.</li>
  <li>disconnected - equivalent to "disconnectedCallback" from CustomElements. Called every time component is removed from the DOM.</li> 
  <li>adopted - equivalent to "adoptedCallback" from CustomElements.</li>
</ol>
<b>Note</b> that "connected" and "disconnected" are firing each time a component is added/removed from the DOM as per the CustomElements specification.
For example: Moving an element from the first position to the last by doing something like:

```javascript
parent.appendChild(parent.firstChild);
```
will trigger "disconnected" then "connected" - each time the element is moved. Cue therefore provides the
"initialize" method which is only called the first time an element is added to the DOM.
***

### Custom Methods
Any top-level methods added to the Component configuration object are available
directly via "this". If you're already used to creating custom elements with the default class syntax you're in luck - 
Cue behaves pretty much how you would expect. You can simply call a custom method via "this.myCustomMethod", pass any
arguments to it and call it a day. 🍩

***

## The Store
We already covered the Store briefly in our introduction to components. We learned that the global store can be used
to provide reactive data to multiple independent components. But why is this useful or even required?

#### When do I need to use the Store?
It all comes down to complexity. For a really simple application it's probably fine to have all state localized to the
components' data models. But what if multiple components need to access the same data? What if this data has to be fetched
from the Server and update multiple components when it becomes available? 
This is where the Store comes in. The Store unifies multiple concepts from classical software architecture:
<ul>
  <li>A global data container. A single source of truth.</li>
  <li>Some kind of Event Bus. But without events. Components simply bind to Store properties and react when the properties' values change. Automagically.</li>
  <li>Some kind of mediator. When Component "A" wants to change sibling Component "B", "A" changes a property in the Store which "B" is bound to. "B" reacts.</li>  
</ul>
Unlike most other state management libraries, the Store is deeply integrated into Cue and doesn't involve a lot of extra
concepts and pretty much no boilerplate. 
You can start out with local component state and simply refactor to use the Store with a single line of code later:

```javascript
data: {
  localProp: {
    //value: 'I am a piece of state localized to the Component...'
    value: Store.bind('aPropertyInTheStoreInstead', 'a default value')
  }     
}
```
Now when your component calls ```this.set('localProp', 'Hello there!')```
any other component(s) which have a property bound via ```Store.bind('aPropertyInTheStoreInstead')``` will be updated 
with the value "Hello there!". Pretty cool, aye? 👽

#### Scoping the Store
The Store is implemented to work with a familiar path syntax to access sub-properties of objects and arrays. For example:

```javascript
Store.set('orders', {
  completed: [
    {id: 'oiasdfa8fkjasfi88f8asf', isn: 'WX9B4'},
    {id: 'aifw9sf29fasfdjf92f9fj', isn: 'VWP73'},
    {id: 'asjdf8fjkaef383f3jfi3f', isn: 'JJ9B0'}
  ]
});
```

Let's say we want to retrieve the first completed order from the Store. We'd simply use a path syntax to reach
into the object tree like so:

```javascript
const firstOrder = Store.get('orders/completed/0');
```

Setting and binding the Store also work with paths. Simply "slash" into the object tree to get/set the exact data
points your components require.

You can wipe the Store clean by calling ```Store.clear(silent = false)```
If you want to clear the Store silently i.e without firing reaction callbacks with lots of undefined values, 
simply pass "true" as the first and only argument.

Individual items are removed by calling ```Store.remove('prop')```

If you want to check whether the Store has a specific property call ```Store.has('prop')```

#### Manually subscribing to the Store
You will come a long way only by using the built-in "Store.bind()" functionality to bind local component data to 
the global Store singleton. But for complex applications and architectures, or when integrating with other technologies,
manual store subscriptions can become incredibly useful. 

```javascript
const subscription = Store.subscribe('orders/completed/0', value => {
  console.log(value);
}, {bubbles: true, once: false});
```

Store.subscribe() returns a "subscription" object. You can unsubscribe simply by calling ```subscription.unsubscribe();```
You can optionally pass an "options" object as the third parameter to Store.subscribe. It accepts the following properties:
<ul>
  <li>bubbles: [default: false] - whether or not the change event should bubble up the path. In the above example with 
  "bubbles" set to "true", the Store will fire all reactions registered for 'orders/completed/0', 'orders/completed' and 'orders'.
  The reactions will receive the respective node graph value after the change. This feature is useful to listen to "deep" changes within objects.
  For performance reasons it is disabled by default. Reactions registered via Store.bind() NEVER bubble.
  </li>
  <li>once: [default: false] - whether the change event should only be executed once and then be unsubscribed automatically.</li>
</ul>

#### Persisting the Store
This is simple. Because the Store is implemented as a wrapper over localStorage, anything you add to the 
Store is <b>automatically persisted on the client</b>. No extra work necessary.

The Store automatically stringifies objects and arrays and parses them when it returns them to you. When you save JSON data
in the Store it will return the unparsed JSON data. Just how you would expect.
Entries to localStorage are internally namespaced so you don't have to worry about prop-clashing.

***
### License
```
The MIT License

Copyright (c) 2014-2049 Jonathan M. Ochmann / Patchflyer GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
***
### Author
Jonathan Ochmann (@monokee)
<ul>
  <li><a href="https://github.com/monokee">Github</a></li>
  <li><a href="https://instagram.com/monokee">Instagram</a></li>
  <li><a href="https://vision-color.com">VisionColor</a></li>
</ul>

***
Made with ♥️ in CGN | (C) Patchflyer GmbH 2014-2049


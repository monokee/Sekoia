# Sekoia.js

<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/main-desktop-browser-logos.png" width="200" alt="All major browsers">
<pre><code>Sekoia.js // Vanilla ES6 - All major browsers</code></pre>

##### 🧬 Micro-optimized reactivity engine
Sekoia is powered by an advanced reactivity engine that enhances serializable data with first-class observability, time travel, shape and type consistency and insanely optimized state diffing.

##### ⚡️ Data driven custom elements
Sekoia gives your UI code structure by making native customElements reactive and composable while facilitating architecturally clean access to the DOM. 

##### 🚀 Performance meets Design
Micro-optimized rendering, reconciliation, state tracking and memory consumption so application code can focus on clean design and business logic.
Built on living web standards by combining many modern approaches and best practices to scalable application development for the web of tomorrow.

***
### Getting Started
<p style="font-weight:bold;">Let's take a look at a really simple Component written with Sekoia:</p>

```javascript
import { defineComponent, createElement } from './build/sekoia.module.js';

export const MyComponent = defineComponent('my-component', {

  element: (`
    <h1 $="title"></h1>
    <ul $="userList"></ul>
    <button $="deleteButton">Delete All Users</button>
  `),

  style: (`
    $self {
      position: absolute;
    }
    $self:hover {
      opacity: 0.75;
    }
    $title {
      text-transform: uppercase;
    }
  `),

  state: {
    users: {
      value: new ReactiveArray([
        {firstName: 'John', lastName: 'Williams'}, 
        {firstName: 'Hans', lastName: 'Zimmer'}
      ]),
      render: {
        parentElement: '$userList',
        createChild: user => createElement(`<li>${user.firstName} ${user.lastName}</li>`)
      }
    },
    title: {
      value: ({users}) => users.length ? 'Our Users' : 'We have no users...',
      render({$title}, value) {
        $title.textContent = value;
      }   
    } 
  },

  initialize({$deleteButton}) {
    $deleteButton.addEventListener('click', () => {
      this.state.get('users').clear();
    });
  }  

});
```

Let's break down the Component piece by piece:

### Component.element
Plain old static HTML - your components' skeleton. 
Your markup should be truly static. Don't include anything that should dynamically change here. We'll take care of dynamic parts later.
```javascript
{
  element: `
    <h1 $="title"></h1>
    <ul $="userList"></ul>
    <button $="deleteButton">Delete All Users</button>
  `
}
```

<b>Note</b> the special "$" attribute. Sekoia automatically parses your component and passes these "refs" to all render and lifecycle callbacks
for pre-cached programmatic access. <i>(Yes, inspired by jQuery, and I'm not ashamed to admit it).</i>
***
### Component.style
Plain old CSS - with a twist.
The CSS written here will be semi-scoped to your component. Semi-scoping means that outside, global CSS can still reach into the
component for global theming etc via classes. Sekoia simply prepends all selectors with the tag name of the component. 
Refs like "$title" can be used as style selectors as is.

With that in mind Sekoia will internally convert:
```css
  $self {
    position: absolute;
  }
  $self:hover {
    opacity: 0.75;
  }
  $title {
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
  my-component .title0 { 
    text-transform: uppercase;
  }
``` 
...and append these rules to a global stylesheet. Note that $title
has been re-written to a runtime globally unique classname.

***

### Component.state

Think of state as a simple, high-level description of the moving parts of your component. 
This is the data that the component needs to somehow display to the user. This is how a basic state model is created in Sekoia:

#### Simple Properties
```javascript
state: {
  simple: {
    value: 'Hey this is a String!',
    render({$self, $title, $deleteButton}, value) {
      if (value === 'Hey this is a String') {
        $title.textContent = value; 
      }
    } 
  }
}
``` 
Data properties are objects containing a ```value``` and optionally a ```render``` property. 
```render``` specifies a function that is called whenever its corresponding value changes. Internally, components
delegate this reactivity to ```ReactiveObject.observe()```

You can read and write the value of a data property inside of lifecycle and custom top-level methods via:

```MyComponent.state.get('property') | MyComponent.state.set('property', value) | MyComponent.state.set({prop: value, prop: value})```

Whenever the value of a state property changes, its corresponding render callback is added to Sekoia's render queue.
Sekoia automatically determines if the value has actually changed and only then queues up the reaction. 
And if for whatever reason the value changes one million times before the next frame is rendered,
the reaction will still only be fired once with the most recent value - thanks to Sekoia's powerful auto-buffering renderer.

#### Computed Properties
You can specify <b>computed properties</b> simply by adding a function as the value:
```javascript
data: {
  computed: {
    value: ({dep1, dep2}) => `${dep1} ${dep2}`,
    render({$ref1, $ref2}, computationResult) {
      // do something
    }
  }
}
``` 
Computed property functions receive an object containing all other properties (including other computed properties) as the
first and only argument. As a best practice you should <b>always destructure the properties your computation depends on
directly in the parameter.</b> This ensures that all dependencies can be resolved during a first run even if the computation contains 
complex conditional logic.
The computation should return its result.
Computed properties can be derived from other computed properties, a mix of computed and non-computed properties etc. Evaluation
of computed properties is optimized so that they are only re-evaluated when any of their dependencies have definitely changed.
Nothing in Sekoia is ever re-computed or rendered when it's not necessary.

#### Store Bindings
You can directly bind any property in your components state model to other objects created via ```new ReactiveObject()```.
This allows different components to share and access the exact same data. When the data in a store changes, 
all Components which bind to the changed property in the store are automatically updated. 
It doesn't matter how the store changes. 
It can be changed externally via ```ExternalStore.set({prop: value})``` or via any component
that binds to the store via ```Component.state.set('propertyBoundToStore', value)```

```javascript
const MyStore = new ReactiveObject({
  thePropertyInTheStore: 123
});

// In component config:
data: {
  storeBound: {
    value: MyStore.bind('thePropertyInTheStore'),
    render(refs, value) {
      // fired whenever value changes here or in the store.
    }   
  }
}
``` 
<b>Note</b> that any computations and reactions will be fired when the data in the store changes. The data can change 
by directly calling ```ExternalStore.set('thePropertyInTheStore', value)``` or via any Component which is bound to the Store via
```Component.state.set('storeBound', value)```
It is not possible to bind _private properties. It is only possible to bind to private properties if the bound
property is a readonly computed property.

***

### Component.render

<i>A built-in shortcut for state.observe(property)</i><br><br>
Render callbacks are reactions that are fired in response to data changes and update fragments of DOM.
```javascript
data: {
  users: { 
    value: [
      {firstName: 'John', lastName: 'Williams'}, 
      {firstName: 'Hans', lastName: 'Zimmer'}
    ],
    render({$userList}, user) {
      // don't actually do this - see better list rendering example below
      $userList.innerHTML = value.map(user => (`<li>${user.firstName}</li>`));
    } 
  },
  title: { 
    value: ({users}) => users.length ? 'Our Users' : 'We have no users...',
    render({$title}, value) {
      $title.textContent = value;
    }   
  } 
},
```
Render callbacks receive an object of all "ref" elements as their first argument. As a best practice, always destructure the elements
you need to manipulate directly in the parameter.
The second parameter is the value of the data property that has changed in the data model and triggered the reaction.

The single responsibility of reactions is to update the DOM. You can not access "this" inside of reactions for this reason.
All you should need is the ref elements you want to update with the value of the data property that has changed.

When you work with refs you directly target <b>real DOM nodes</b> - there is no abstraction layer and reactions thus offer incredible performance.
And because these reactions are only running in response to changes of the data model, even complex Sekoia Components never become 
hard to predict or maintain. Another benefit of working with the real DOM is that you can use pretty much all libraries anywhere.

#### List rendering and reconciliation
For high-performance list rendering the ```render``` property should be a configuration object
that Sekoia internally passes to the high performance DOM reconciler. 
````javascript
users: {
  value: new ReactiveArray([
    {firstName: 'John', lastName: 'Williams'}, 
    {firstName: 'Hans', lastName: 'Zimmer'}
  ]),
  render: {
    parentElement: '$userList', // ref name
    createChild: user => {
      // requried: receives data entry from array and returns a DOM node
      return createElement(`<li>${user.firstName} ${user.lastName}</li>`)
    },
    updateChild: ($child, user) => {
      // optional: update child node in-place with new data
    }
  }
}
````
The reconciliation config requires a ```createChild``` method which turns each entry in the data array into a DOM Node. 
Sekoia is powered by an ultra-fast reconciliation algorithm under the hood that updates only those parts of the DOM that
were affected by changes in data. It works for mutable and immutable data and will be fast whether you push() into an
array or whether you prefer immutable data and replace the entire array. You can optionally speed up the reconciliation 
even further by providing an "updateElement" function which updates elements in-place instead of replacing them.
***

### Component.initialize
The only Lifecycle method Sekoia Components need is called only once per component instance, after the component has been 
inserted into the DOM. Receives "refs" as first and only argument. Typically, this is where you would bind input events, retrieve server data etc.

### Standalone Stores
Reactive, observable state is not just useful for component rendering. 
Sekoia exports ```ReactiveObject``` and ```ReactiveArray``` as standalone classes that
can be used for any kind of reactive and observable data. Let's dig a little deeper
into the specification of these data structures by example:
```javascript
import { ReactiveObject, ReactiveArray } from './store';

const State = new ReactiveObject({
  _firstName: 'Jonathan', // private property is prefixed with underscore
  _lastName: 'Ochmann',
  _nickName: 'Jon',
  _fullName: ({_firstName, _lastName}) => `${_firstName} ${_lastName}`,
  greeting: ({_fullName, _nickName}) => `Hey, I'm ${_fullName} but my friends call me ${_nickName}!`,
  friends: new ReactiveArray([], { // nested reactive array
    model: data => person.clone(data) // plain data added to the array will be converted to the person model
  })
});
```
#### Methods

##### get([key])
returns data of key or entire object if key is undefined

##### default([key])
Returns a deep clone the initial data value that was passed when the model was defined on the first object instantiation.
Returns entire object when no key is provided.

##### snapshot([key])
Returns a deep clone of writable (serializable) properties. Useful for persistence and immutable state updates.
```javascript
State.snapshot();
/*
{
  _firstName: 'Jonathan',
  _lastName: 'Ochmann', 
  _nickname: 'Jon', 
  friends: []
}
*/
```

##### set([key], value)
Assigns target data to object if target matches the type (in case of primitives) or shape (in case of objects) of the state model.
The algorithm works with arbitrarily nested data structures consisting of { plain: objects } and [ plain, arrays ].
<br><br>
<i>Equality rules for setting data:<br>
When source and target are both primitives, their type must match, but their value must be different in order to be assigned.
When source and target are objects, the algorithm recursively applies the target object's properties to the source object's properties.
The target object must deeply match the source object's shape. This means that the property keys must match and the property values
must match type. In other words, target objects are not allowed to add or remove properties from source object (when both are plain objects)
and the property values of target must recursively match the shape or type of the source object's property values.
Any target property value that does not match it's corresponding source property value does not get assigned.
Mismatches do not throw errors - the algorithm will default to the source property value and continue to attempt to
assign any remaining target property values that match. When an actual assignment happens, and dependent observers are queued.
Arrays are treated similar to plain objects with an important distinction:
Arrays are allowed to change length. When source is an empty array, we push any items from the target array
into source because we have no way to compare existing items. When source is an array that has items and target is an array
that has more items than source, any added items must match the shape or type of the last item in the source array.
When the target array is shorter than or equal in length to the source array, we patch each item recursively.
</i>

##### reset([key])
Resets a state object to the data passed with the initial model definition (i.e the first object creation)

##### clone([data])
Creates a new instance of the object model and immediately assigns the passed data.

```javascript
// use "State" as a model to instantiate 
// a new person by passing in new props. note
// that we're not providing computed properties or
// nested reactive objects - only plain serializable snapshots
const User = State.clone({
  _firstName: 'Paul',
  _lastName: 'Anderson',
  _nickName: 'PTA',
  friends: [
    State.snapshot(), // create a snapshot of the first person
    {_firstName: 'Snoop', _lastName: 'Dog', _nickName: 'Lion'}
  ]
});
```

##### observe(key, callback, [options = {cancelable: false, throttle: 0 / defer: 0}])
Registers a callback function that is fired when the observed keys' value changed.
The callback receives the current value as the only argument.
Observers fire once immediately after registration.
When throttle or defer > 0 the observer is throttled or deferred to the provided interval in milliseconds.
Returns unobserve function when options.cancelable === true, or nothing otherwise.
```javascript
State.observe('greeting', value => {
  // fires whenever greeting computes a new value.
});

State.observe('*', value => {
  // wildcard listener will fire when any 
  // public property (see Private Properties below)
  // in the object has changed, including propagated
  // changes from nested reactive objects.
});
```

##### bind(key)
Returns a binding which can be implemented as a property value on other objects. key must
be public.
```javascript
// The "source of truth" object
const StateA = new ReactiveObject({
  foo: 123,
  _baz: 456,
  uff: ({foo, _baz}) => foo + baz
});

// The object bound to source object
const StateB = new ReactiveObject({
  bar: StateA.bind('foo'),
  boo: StateA.bind('_baz'), // -> THROWS. Do not bind private properties. See "Private Properties" below
  _baz: StateA.bind('foo'), // -> THROWS. Do not bind private properties to writable properties.
  _ok: StateA.bind('uff')   // -> Works because "uff" is readonly (and public)
});

```

##### track(key, [options = {maxEntries: 100, onTrack: fn, throttle: 0 / defer: 0}])
Record all state changes for time-travel. Records entire object when
key is wildcard '*'. options.maxEntries determines how many state changes
are recorded before old state changes get removed from the beginning of the
internal history stack. options.onTrack is a callback function that is invoked
whenever you time-travel to a tracked state. Note: Recorded states are guaranteed
to be unique - even when asynchronously throttled or deferred.
```javascript
State.track('prop', {
  maxEntries: 500,
  throttle: 250, // EITHER: track no more than once every 250ms
  defer: 250, // OR: track 250ms after the last state change has occured
  onTrack: (state, trackPosition, trackLength) => {
    // update the ui or something
  }
})
```

##### undo(key)
Time travel to the last tracked state change. Requires that object or key is being tracked.

##### redo(key) 
Time travel to next tracked state change. Requires that object or key is being tracked.

##### restore(key, trackPosition)
Time travel to specified trackPosition. trackPosition is an index in the internal state
history array.

#### Array Methods
ReactiveArray implements all methods from Array.prototype:<br>
##### Accessors and Iterators
<ul>
  <li>every</li>
  <li>some</li>
  <li>findIndex</li>
  <li>findLastIndex</li>
  <li>includes</li>
  <li>indexOf</li>
  <li>lastIndexOf</li>
  <li>find</li>
  <li>slice</li>
  <li>forEach</li>
  <li>map</li>
  <li>filter</li>
  <li>reduce</li>
</ul>

##### Mutators
<ul>
  <li>pop</li>
  <li>push</li>
  <li>shift</li>
  <li>unshift</li>
  <li>splice</li>
  <li>reverse</li>
  <li>sort</li>
  <li>filterInPlace (just like filter() but mutating)</li>
  <li>clear (removes all items from array)</li>
</ul>

***

#### Private Object Properties
Prefixing keys with an underscore marks properties in ReactiveObjects as private.
Private properties:
<ul>
  <li>Do not trigger wildcard ('*') observers.</li>
  <li>Do not propagate changes to parent ReactiveObject or ReactiveArray</li>
  <li>Can not be bound to other objects</li>
  <li>Can bind to non-private computed properties on other ReactiveObjects</li>
  <li>Are accessible like any other properties via get('_property')</li>
</ul>

#### Persistence
Sekoia provides a simple Promise-based IndexedDB abstraction for client-side data persistence.

```javascript
const storage = new PeristentStorage({
  name: 'userData',
  onUnavailable: error => {
    // will fall-back to in-memory storage. 
    alert('Failed to save data to disk. Your data will be gone when you reload the page.')
  }
});

storage.set('key', anything).then(() => {
  console.log('stored successfully');
});

storage.has('key').then(exists => {
  console.log('key exist ===', exists);
});

storage.get('key').then(value);

storage.delete('key').then(itsDeleted);
storage.clear().then(itsEmpty);
storage.destroy().then(itsGone);
```

***

### Router
Pretty advanced hash-based router for SPAs with reactive route actions and
route filtering for conditional re-routes. I don't have time to document it.

### Server
Simple REST API helper with request buffering and indexedDB caching plus cache expiration.
Nothing too fancy.

### Utils
Common functions that are shared by internal modules and are also useful for implementation
code of high-performance web apps.

### License
```
Sekoia.js 
Copyright (C) 2022  Jonathan M. Ochmann 

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see https://www.gnu.org/licenses.
```
***
### Author
Jonathan M. Ochmann (@monokee)
<ul>
  <li><a href="https://github.com/monokee">Github</a></li>
  <li><a href="https://instagram.com/monokee">Instagram</a></li>
  <li><a href="https://www.color.io">Color.io</a></li>
  <li><a href="https://vision-color.com">VisionColor</a></li>
</ul>

***
Made with ♥️ in CGN | (C) Patchflyer GmbH 2014-2049
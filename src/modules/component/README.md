# Sekoia Components

##### Data driven custom elements that don't suck.

> Sekoia Components give your UI code structure by making native customElements reactive and composable while enforcing one-way data flow and facilitating 
architecturally clean access to the DOM.
Built on living web standards, micro-optimized for performance while providing clean and scalable application design conventions.

- Composable, data-driven customElements
- Zero use of shadow DOM, soft-scoped CSS
- Zero use of <i>{{ templating }}</i> and zero logic in markup
- Architecturally clean, programmatic DOM access
- Micro-optimized, async rendering and pooled models

***
### 👨‍💻 Getting Started
Let's take a look at a really simple Component written with Sekoia:

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

### 🖼 Component.element
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

> Note the special "$" attribute. Sekoia automatically parses your component and passes these "$refs" to all render and lifecycle callbacks
for pre-cached programmatic access. <i>(Yes, inspired by jQuery, and I'm not ashamed to admit it).</i>
***
### 🎨 Component.style
Plain old CSS - with a twist.
The CSS written here will be softly scoped to your component. Soft scoping means that outside, global CSS can still reach into the
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
...and append these rules to a global stylesheet that is used by all instances of the component. 
Note that $title has been re-written to a runtime globally unique classname.

##### Escaping scope
You may want to style your components based on global classes attached to an ancestor element like
```body``` while keeping all of your style definitions inside of the component. That's easy:
```css
  /* Escape component scope via :root */
  :root body.isLandscape $self {
    position: absolute;
  }
  /* Becomes -> */
  body.isLandscape my-component {
    position: absolute;
  }
``` 

***

### 🧬 Component.state

Think of state as a simple, high-level description of the moving parts of your component. 
This is the data that components need to somehow display to the user. 

> Internally components consume Sekoia's observable reactive state modules. For an in-depth
understanding of state modeling and reactivity concepts see:
[Reactive State Documentation](../state)

### 🎞 Rendering

*A built-in shortcut for state.observe(property)*<br>

Render callbacks are reactions that fire in response to data changes and update fragments of DOM.
```javascript
state: {

  title: { 
    value: ({users}) => users.length ? 'Our Users' : 'We have no users...',
    render({$title}, value) {
      $title.textContent = value;
    }   
  },

  users: { 
    value: [
      {firstName: 'John', lastName: 'Williams'}, 
      {firstName: 'Hans', lastName: 'Zimmer'}
    ],
    render({$userList}, user) {
      $userList.innerHTML = value.map(user => (`<li>${user.firstName}</li>`));
    } 
  }

}
```
Render callbacks receive an object of all "$ref" elements as their first argument. For convenience, you can destructure the elements
you need to manipulate directly in the parameter.
The second parameter is the value of the data property that has changed in the state and subsequently triggered the reaction.

The single responsibility of reactions is to update the DOM. You cannot access "this" inside of reactions for "this" reason.
All you should need is the $ref elements you want to update with the value of the data property that has changed.

> When you work with $refs, you directly target <b>real DOM nodes</b> - there is no abstraction layer - render callbacks thus offer
incredible performance.
And because these callbacks are only running in response to actual changes of the data model, even complex Sekoia Components never become 
slow, hard to predict or maintain.

#### List rendering and reconciliation
For high-performance list rendering the ```render``` property should be a configuration object
that Sekoia internally passes to the high performance DOM reconciler.
<br>
- See the [TodoMVC Example](../../../examples/TODO%20MVC) for an implementation
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
The ```value``` property should be an instance of ```ReactiveArray```. When the child elements are Sekoia
Components with their own internal state, pass the state factory to ```ReactiveArray``` as an instantiation model.

The render configuration object requires a ```createChild``` method which turns each entry in the data array into a DOM Node. 
Sekoia is powered by an ultra-fast reconciliation algorithm under the hood that updates only those parts of the DOM that
were affected by changes in data. It works for mutable and immutable data and will be fast whether you push() into an
array or whether you prefer immutable data and replace the entire array. You can optionally speed up the reconciliation 
even further by providing an ```"updateElement"``` function which updates elements in-place instead of replacing them.
***

### ⚙️ Setting and getting state
You can read and write state data inside of lifecycle and custom top-level methods via ```this.state```.

```MyComponent.state.get('property') | MyComponent.state.set('property', value) | MyComponent.state.set({prop: value, prop: value})```

Whenever the value of a state property changes, its corresponding render callback is added to Sekoia's asynchronous render queue.
Sekoia automatically determines if the value has actually changed and only then queues up the reaction. 
And if for whatever reason the value changes one million times before the next frame is rendered,
the reaction will still only be fired once with the most recent value - thanks to Sekoia's powerful auto-buffering renderer.

> Note: State only accepts data that matches the shape and type of the state model's default data.
See [Reactive State Documentation](../state) for details

***

### 👋 Component.initialize
The only Lifecycle method Sekoia Components need is called once per component instance, after the component has been 
inserted into the DOM. Receives "$refs" as first and only argument. Typically, this is where you would bind input events, 
retrieve server data etc.

```javascript
initialize({$self, $toggle, $list}) {
  
  // bind events to $refs...
  $toggle.addEventListener('click', e => {
    this.handleClick();
  });
  
  // ... or delegate to the component itself
  this.addEventListener('click', e => {
    if ($toggle.contains(e.target)) {
      this.handleClick();
    }
  });

  console.assert($self === this);

},

handleClick() { 
  // The state's render callback will update the DOM in response.
  this.state.set('active', !this.state.get('active'));
}
```

***

### 🪆 Composing Components
There are multiple ways Sekoia helps with composing customElements. The first and probably least obvious, is that
Sekoia Components do not use shadow DOM. Everything inside ```element``` is composed into the elements light DOM. That
allows us to easily compose other components into our markup by including the components tag name.

#### Factory({...attributes})
For convenience and first-class ES module support, ```defineComponent``` returns a factory function that 
can be used to render a component's tag name along with attributes into the markup of another component. 
A common pattern looks like this:

child-component.js:

```javascript
export const ChildComponent = defineComponent('child-component', {
  element: (`
    <h1 $="title"></h1>
    <ul $="userList"></ul>
    <button $="deleteButton">Delete All Users</button>
  `)
});
```

parent-component.js:

```javascript
import { ChildComponent } from './child-component.js';

const ParentComponent = defineComponent('parent-component', {
  element: (`
    <header>Hello world</header>
    <main>${ChildComponent({class: 'pos-rel flex-row'})}</main>
  `)
});
```

You can pass an attribute object to the factory function returned by ```defineComponent```
and it's properties will be mapped to standard DOM attributes. It's also possible to inject state
into a component via the attributes object. You don't have to serialize the state object - Sekoia
uses temporary attribute reflection to inject the state into the component when it is attached
to the DOM. 
```javascript
ChildComponent({
  class: 'pos-rel pd-250',
  style: 'will-change: opacity', // use inline dom-strings
  state: { // state can be object
    user: {
      name: 'Jonathan'
    }
  }
});

// returns: '<child-component class="pos-rel pd-250" style="will-change: opacity;" provided-state="internalUID"');

```
It just works™. Additional helper functions attached directly to the factory are:

##### Factory.render({...attributes})

Similar to calling ```Factor({...attribute})``` but instead of returning a composable html string,
```Factory.render({...attributes})``` returns a DOM Node. Used for rendering children during reconciliation.

##### Factory.state({...data})

Returns an instance of the Component's internal reactive state with the provided snapshot data. This is used
for list rendering as Factory.state can be used directly as a model of ReactiveArray.
- [Reactive State Documentation](../state)
- [TodoMVC Example](../../../examples/TODO%20MVC)

***

### 🦥 Lazy instantiation
Sekoia Components are instantiated lazily with all expensive work being <b>deferred until the last possible moment.</b> Multiple instances of 
components share the same ComponentModel prototype and template for <b>greatly optimized memory consumption and rendering performance.</b>
When the first instance of a Component is attached to the DOM for the first time, the ComponentModel sets itself up once by 
scoping the CSS, collecting $refs and setting up the state model. All subsequent instances of the Component pull from the
ComponentModel's pooled template, styles and state model with <b>no additional roundtrips to expensive DOM APIs or state resolvers.</b>

> The extensive pooling and caching of resolved data structures allows Sekoia Components to outperform most frameworks and
> even native customElements while providing clean architectural conventions for scalable application design.



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
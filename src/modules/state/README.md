# Sekoia Reactivity Engine
Reactive, observable state with pooled models and fully automatic type safety.

- Micro-optimized, fully observable Objects and Arrays
- Computed properties with smart caching
- External state bindings
- ATS Automatic Type Safety
- Built-in time travel (undo, redo, etc)
- Semantic Private Properties
- Async Observer resolution
- Built-in defer/throttle hooks

Sekoia exports ```ReactiveObject``` and ```ReactiveArray```. These classes are driving the 
reactivity of Sekoia Components but are designed as general purpose state containers that
can be used for any kind of reactive and observable data.

## 👨‍💻 Getting started

Let's create a simple reactive state tree:
```javascript
import { ReactiveObject, ReactiveArray } from './store';

const State = new ReactiveObject({
  firstName: 'Jonathan',
  lastName: 'Ochmann',
  nickName: 'Jon',
  fullName: ({firstName, lastName}) => `${firstName} ${lastName}`,
  greeting: ({fullName, nickName}) => `Hey, I'm ${fullName} but my friends call me ${nickName}!`,
  friends: new ReactiveArray([], {
    model: data => State.clone(data)
  })
});
```
Now we can [observe](#observekey-callback-options--cancelable-false-throttle-0--defer-0) any changes to this state, [track](#trackkey-options--maxentries-100-ontrack-fn-throttle-0--defer-0) mutations over time, stamp out serializable 
[snapshots](#snapshotkey), [reset](#resetkey) to default and create new instances of the state model via [cloning](#clonedata).

### Overview 

There are a few concepts that distinguish ReactiveObjects from regular objects and Sekoia's reactive architecture from
traditional state modeling:
- Calling new ReactiveObject() creates both an instance and a model based on the property object passed into the constructor.
- Additional instances of the object are created by [cloning](#clonedata) the object with new data.
- This gives your state default data - so it can be [reset](#resetkey) with one line of code.
- Defaults allow Sekoia to [infer the type of primitives and the shape of objects](#setkey-value) in your model. No need for additional type checking.
- Based on the type and shape information, Sekoia will automatically reject data that doesn't [fit the model.](#setkey-value)

Sekoia caches property types, shape information and computed property resolution in a pooled model that is re-used by all instances of the reactive object.
Nested reactive objects have to be created explicitly - normal objects and arrays inside of reactive state models are treated like immutable primitives and are deep-compared by value,
meaning they can only be overwritten in their entirety. Nested reactive objects bubble their internal changes to their reactive parent objects. 
Bubbling can be prevented by making properties [private](#-private-properties).

#### 🧮 Computed Properties
You can specify <b>computed properties</b> simply by adding a pure function as a property value.
```javascript
const State = new ReactiveObject({
  prop: 1,
  plusOne: ({prop}) => prop + 1
});
```
Computed property functions receive an object containing all other properties (including other computed properties) as the
first and only argument. You should <b>always destructure the properties your computation depends on
directly in the parameter.</b> This ensures that all dependencies can be resolved.
The computation should return its result.
Computed properties can be derived from other computed properties, a mix of computed and non-computed properties etc. Evaluation
of computed properties is optimized so that they are only re-evaluated when any of their immediate dependencies have changed.
Nothing in Sekoia is ever re-computed or observed when it's not absolutely necessary.

#### 🔁 Bound Properties
You can directly [bind](#bindkey) any property in your state model to other reactive objects.
This allows different data stores to share and access the exact same data. When the data in a store changes, 
all objects which bind to the changed property in the store are automatically updated. 
```javascript
const MyStore = new ReactiveObject({
  thePropertyInTheStore: 123
});

const HerStore = new ReactiveObject({
  storeBound: MyStore.bind('thePropertyInTheStore')
});
``` 
<b>Note</b> that any computations and observers will be fired when the data in the store changes. The data can change 
by directly calling ```ExternalStore.set('thePropertyInTheStore', value)``` or, when dealing with internal [Component State](../component) which is bound to the Store via
```Component.state.set('storeBound', value)```
It is not possible to bind _private properties. It is only possible to bind to private properties if the bound
property is a readonly computed property.

#### 🥷 Private Properties
Prefixing keys with an underscore marks properties in ReactiveObjects as private.
Private properties:

- Do not trigger [wildcard observers](#observekey-callback-options--cancelable-false-throttle-0--defer-0).
- Do not propagate changes to parent ReactiveObject or ReactiveArray
- Can <i>not</i> be bound to other objects
- <i>Can</i> bind to non-private computed properties on other ReactiveObjects
- Are accessible like any other properties via get('_property')

***

## Methods
These methods are available on all instances of ReactiveObject and ReactiveArray.
The expected behaviour is documented for ReactiveObject first with some [special exceptions for ReactiveArray](#reactivearray-specialties) at the bottom of the section.

##### get([key])
returns data of key or entire object if key is undefined. 
> When retrieving nested ReactiveObjects or ReactiveArrays, the actual Reactive interface is returned.
> To retrieve plain, serializable data call snapshot() on the returned interface or retrieve a snapshot 
> directly from the reactive parent.

##### default([key])
Returns a deep clone the initial data value that was passed when the model was defined on the first object instantiation.
Returns entire object when no key is provided.

##### snapshot([key])
Returns a deep clone of writable (serializable) properties. Useful for persistence and immutable state updates.
```javascript
State.snapshot() === {
  firstName: 'Jonathan',
  lastName: 'Ochmann', 
  nickname: 'Jon', 
  friends: []
}
```

##### set([key], value)
Assigns target data to object if target matches the type (in case of primitives) or shape (in case of objects) of the state model.
The algorithm works with arbitrarily nested data structures consisting of { plain: objects } and [ plain, arrays ].
```javascript
State.set('firstName', 'Terry');

State.set({
  firstName: 'Terry',
  lastName: 'Gilliam',
  whatever: [] // will be ignored because it's not part of the model
});

// won't do anything. firstName must be String.
State.set('firstName', 123);

// will throw - Do not set computed properties (duh!)
State.set('greeting', 'Goodbye');
```
> **Equality rules for patching data:**
> Let source be the ReactiveObject and target be invading data.
> When source and target are both primitives, their type must match, but their value must be different in order to be assigned.
> When source and target are objects, the algorithm recursively applies the target object's properties to the source object's properties.
> The target object must deeply match the source object's shape. This means that the property keys must match, and the property values
> must match type. In other words, target objects are not allowed to add or remove properties from source object (when both are plain objects)
> and the property values of target must recursively match the shape or type of the source object's property values.
> Any target property value that does not match it's corresponding source property value does not get assigned.
> Mismatches do not throw errors - the algorithm will default to the source property value and continue to attempt to
> assign any remaining target property values that match. When an actual assignment happens, and dependent observers are queued.
> Arrays are treated similar to plain objects with an important distinction:
> Arrays are allowed to change length. When source is an empty array, we push any items from the target array
> into source because we have no way to compare existing items. When source is an array that has items and target is an array
> that has more items than source, any added items must match the shape or type of the last item in the source array.
> When the target array is shorter than or equal in length to the source array, we patch each item recursively.

##### reset([key])
Resets a state object to the data passed with the initial model definition (i.e the first object creation)

##### clone([data])
Creates a new instance of the object model and immediately assigns the passed data. Data must match the model's shape.

```javascript
// use "State" as a model to instantiate 
// a new person by passing in new props. note
// that we're not providing computed properties or
// nested reactive objects - only plain serializable snapshots
const User = State.clone({
  firstName: 'Paul',
  lastName: 'Anderson',
  nickName: 'PTA',
  friends: [
    State.snapshot(), // create a snapshot of the first person
    {firstName: 'Snoop', lastName: 'Dog', nickName: 'Lion'}
  ]
});
```

##### observe(key, callback, [options = {cancelable: false, throttle: 0 / defer: 0}])
Registers a callback function that is fired when the observed keys' value changed.
The callback receives the current value as the only argument.
Observers fire once immediately after registration.
When throttle or defer > 0 the observer is throttled or deferred to the provided interval in milliseconds.
Returns unobserve function when ```options.cancelable = true```, undefined otherwise.
<br>

```javascript
State.observe('greeting', value => {
  // fires whenever greeting computes a new value
  // and once, immediately after registration
});

const unobserve = State.observe('*', value => {
  // wildcard listener fires when any 
  // public property (see "Private Properties")
  // in the object has changed, including propagated
  // changes from nested reactive objects.
}, {
 cancelable: true, // make observe() return an unobserve function
 throttle: 250 // execute no more than once every 250ms
});
```
> It is theoretically possible that throttled or deferred observers may fire 
the same state value they fired previously. Consider this scenario:<br>
(1) Observed state changes to a new value.<br>
(2) Sekoia queues the state observer.<br>
(3) The observer is waiting for it's defer/throttle timeout to pass.<br>
(4) The state value changes back to the initial value while the observer is waiting.<br>
(5) The observer fires with the same value it fired previously.<br>

##### bind(key)
Returns a binding which can be implemented as a property value on other objects. Source property must
be public. Target property must be public unless it is bound to a [readonly computed property](#-computed-properties).
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
  boo: StateA.bind('_baz'), // -> THROWS. Do not bind private properties. See "Private Properties"
  _baz: StateA.bind('foo'), // -> THROWS. Do not bind private properties to writable properties.
  _ok: StateA.bind('uff')   // -> Works because "uff" is readonly (and public)
});

```

##### track(key, [options = {maxEntries: 100, onTrack: fn, throttle: 0 / defer: 0}])
Record all state changes for time-travel. Records entire object when
key is wildcard.
<br>
```options.maxEntries``` determines how many state changes
are recorded before old state changes get removed from the beginning of the
internal history track. <br>
```options.onTrack(𝑓)``` is a callback function that is invoked
whenever you time-travel to a tracked state. 
<br>
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
> Recorded states are guaranteed to be unique - even when asynchronously throttled or deferred.

##### undo(key)
Time travel to the last tracked state change. Requires that object or key is being tracked.

##### redo(key) 
Time travel to next tracked state change. Requires that object or key is being tracked.

##### restore(key, trackPosition)
Time travel to specified trackPosition. trackPosition is an index in the internal state
history array.

## ReactiveArray Specialties
ReactiveArrays have some important distinctions from ReactiveObjects:

- Most obviously, ReactiveArrays can change lengths, or, in other words, as opposed to ReactiveObjects, their property keys (indices) are allowed to change.
- Individual indices cannot be observed. ```ReactiveArray.observe(handler => {})``` does not receive a "key" argument. All observers are wildcard observers that react to anything happening within the array.
- ReactiveArray can be instantiated with a model creation function that transforms any data that is added to the array at runtime.
- ReactiveArrays have no computed properties, no bindings and no private keys.

In addition to the methods from ReactiveObject, ReactiveArray also implements reactive versions of all methods from <b>Array.prototype</b>
<br>
##### Accessors and Iterators

- every
- some
- findIndex
- findLastIndex
- includes
- indexOf
- lastIndexOf
- find
- slice
- forEach
- map
- filter
- reduce

##### Mutators

- pop
- push
- shift
- unshift
- splice
- reverse
- sort
- filterInPlace (just like filter() but mutating)
- clear (removes all items from array)

> When ReactiveArrays contain nested ReactiveObjects, the object patching rules described above apply for all mutators as well.

***

#### 💾 Persistence
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
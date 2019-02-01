# Cue - Build atomically reactive web apps in pure Javascript.

"No logic in markup." & "Not the front-end framework your dad used." 😢💔

<br>
<img align="left" src="https://github.com/monokee/Cue/raw/master/CueLogo.png" alt="Cue Logo" width="450" style="position: relative; margin-left: 50%; transform: translateY(-50%);"/>

### Reactive module-driven state
```javascript
Cue.State('AppData', Module => ({
  ...
}));
```
### Declarative data-driven views
```javascript
Cue.UI('MainView', Component => ({
  ...
}));
```
### Composable application fragments
```javascript
const MyCue = Cue({
  state: 'AppData',
  ui: 'MainView'
});
```
<br>

## Features
...tbd

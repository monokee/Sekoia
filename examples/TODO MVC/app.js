import { Component } from "../../build/cue.module.js";
import { TodoStore } from "./data/store.js";

Component.define('todo-mvc', {

  element: (`
    <header>
      <img $="logo" src="" alt="logo">
      <h1 $="headline"></h1>
    </header>
    ${TodoEditor()}
    <footer>
      <p $="author"></p>
      <p $="info"></p>
    </footer>
  `),

  style: (`
  
    * {
      box-sizing: border-box;
    }
    
    $self {
      position: relative;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding-top: 5.5em;
      font-family: Roboto, sans-serif;
      color: rgb(232,235,238);
      background-color: rgb(22,25,28);
      user-select: none;
    }
    
    header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    $logo {
      width: 4.5em;
      height: 4.5em;
      margin-right: 1em;
    }

    $editorContainer {
      position: relative;
      z-index: 1;
      width: 650px;
      max-width: 95%;
      box-shadow: none;
    }

    footer {
      margin-top: auto;
      margin-bottom: 1em;
      font-size: 0.85em;
      opacity: 0.5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    footer p {
      margin: 0;
    }
    
  `),

  data: {

    appTitle: {
      value: TodoStore.bind('appTitle'),
      reaction({$headline}, value) {
        $headline.textContent = value;
      }
    },

    appLogo: {
      value: TodoStore.bind('appLogo'),
      reaction({$logo}, value) {
        $logo.src = value;
      }
    },

    appAuthor: {
      value: TodoStore.bind('appAuthor'),
      reaction({$author}, value) {
        $author.textContent = `Written by ${value}`;
      }
    },

    footerInfo: {
      value: 'Illustrations by drawkit.io',
      reaction({$info}, value) {
        $info.textContent = value;
      }
    }

  }

});
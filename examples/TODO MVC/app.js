import { defineComponent } from "../../src/modules/component/define-component.js";
import { TodoEditor } from "./components/todo-editor.js";

defineComponent('todo-mvc', {

  element: (`
    <header>
      <h1 $="headline"></h1>
      <img $="logo" src="" alt="logo">
    </header>
    ${TodoEditor()}
    <footer>
      <p $="author"></p>
      <p $="info"></p>
    </footer>
  `),

  style: (`
    :root * { 
      box-sizing: border-box!important;
    }
    :root body{
      width: 100vw;
      height: 100vh;
      margin:0;
      font-family: Roboto, sans-serif;
      color: rgb(232, 235, 238);
      background-color: rgb(22,25,28);
      user-select: none;
    }
   :root ::-webkit-scrollbar{
      width: 3px;
    }
   :root ::-webkit-scrollbar-track{
      background: transparent;
    }
   :root ::-webkit-scrollbar-thumb{
      background:rgba(235,235,235,0.35);
      border-radius: 3px;
    }
    $self {
      position: relative;
      width: clamp(15rem, 90%, 50rem);
      margin-left: auto;
      margin-right: auto;
      padding: 1.5rem 1.5rem 5.5rem 1.5rem;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    } 
    header {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 3.5rem;
    }
    $headline {
      font-weight: 300;
    }
    $logo {
      height: 5.5em;
      object-fit: cover;
      border-radius: 16px;
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

  state: {

    appTitle: {
      value: 'Todo MVC',
      render({$headline}, value) {
        $headline.textContent = value;
      }
    },

    appLogo: {
      value: '../../logo.jpg',
      render({$logo}, value) {
        $logo.src = value;
      }
    },

    appAuthor: {
      value: 'monokee',
      render({$author}, value) {
        $author.textContent = `Written by ${value}`;
      }
    },

    footerInfo: {
      value: 'No rights reserved.',
      render({$info}, value) {
        $info.textContent = value;
      }
    }

  }

});
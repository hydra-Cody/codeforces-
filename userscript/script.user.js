// ==UserScript==
// @name         Codeforces++
// @namespace    cfpp
// @version      2.4.1
// @description  Codeforces extension pack
// @author       LeoRiether
// @source       https://github.com/LeoRiether/CodeforcesPP
// @icon         https://github.com/LeoRiether/CodeforcesPP/raw/master/assets/cf%2B%2B%20logo.png
// @match        *://codeforces.com/*
// @grant        unsafeWindow
// @grant        GM_addStyle
// @updateURL    https://github.com/LeoRiether/CodeforcesPP/releases/latest/download/script.meta.js
// @downloadURL  https://github.com/LeoRiether/CodeforcesPP/releases/latest/download/script.user.js
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const env$2 = {"NODE_ENV":"production","VERSION":"2.4.1","TARGET":"userscript"};

    /**
     * @file Utilities to manipulate the DOM
     */
    function isEvent(str) {
      return str.length > 2 && str[0] == 'o' && str[1] == 'n' && str[2] >= 'A' && str[2] <= 'Z';
    }

    var dom = {
      $(query, element) {
        return (element || document).querySelector(query);
      },

      $$(query, element) {
        return (element || document).querySelectorAll(query);
      },

      on(element, event, handler, options) {
        element.addEventListener(event, handler, options || {});
      },

      /**
       * Works like React.createElement
       * Doesn't support a set of features, but should work for most purposes
       */
      element(tag, props, ...children) {
        let el;

        if (typeof tag === 'string') {
          el = document.createElement(tag);
          Object.assign(el, props); // Some properties like data-* and onClick won't do anything here...

          if (props) {
            // ...so we have to consider them here
            for (let key in props) {
              if (key.startsWith('data-') || key == 'for') el.setAttribute(key, props[key]);else if (isEvent(key)) el.addEventListener(key.substr(2).toLowerCase(), props[key]);
            }
          }
        } else if (typeof tag === 'function') {
          el = tag(props);
        }

        for (let c of children) {
          if (typeof c === 'string') {
            el.appendChild(document.createTextNode(c));
          } else if (c instanceof Array) {
            el.append(...c);
          } else if (c) {
            el.appendChild(c);
          }
        }

        return el;
      },

      fragment(...children) {
        let frag = document.createDocumentFragment();

        for (let c of children) {
          if (typeof c === 'string') {
            frag.appendChild(document.createTextNode(c));
          } else if (c instanceof Array) {
            for (let cc of c) frag.appendChild(cc);
          } else if (c) {
            frag.appendChild(c);
          }
        }

        return frag;
      },

      isEditable(element) {
        const unselectable = ["button", "checkbox", "color", "file", "hidden", "image", "radio", "reset", "submit"];
        const isEditableInput = element.tagName == "INPUT" && unselectable.indexOf(element.type) == -1;
        const isTextarea = element.tagName == "TEXTAREA";
        const isSelect = element.tagName == "SELECT";
        return isEditableInput || isTextarea || isSelect || element.isContentEditable;
      }

    };

    /**
     * The same as Ramda's tryCatch:
     * `tryCatch` takes two functions, a `tryer` and a `catcher`. The returned
     * function evaluates the `tryer`; if it does not throw, it simply returns the
     * result. If the `tryer` *does* throw, the returned function evaluates the
     * `catcher` function and returns its result. Note that for effective
     * composition with this function, both the `tryer` and `catcher` functions
     * must return the same type of results.
     *
     * @param {Function} tryer The function that may throw.
     * @param {Function} catcher The function that will be evaluated if `tryer` throws.
     * @return {Function} A new function that will catch exceptions and send then to the catcher.
     */

    function tryCatch(tryer, catcher) {
      return (...args) => {
        try {
          return tryer(...args);
        } catch (err) {
          return catcher(err);
        }
      };
    }
    /**
     * Returns a new function that, when called, will try to call `fn`.
     * If `fn` throws, `def` will be returned instead
     * @param {Function} fn The function to try executing
     * @param {any} def The default value to return if `fn` throws
     * @return {Function}
     */

    function safe(fn, def) {
      return (...args) => {
        try {
          return fn(...args);
        } catch {
          return def;
        }
      };
    }
    /**
     * Takes a list of functions and returns a function that executes them in
     * left-to-right order, passing the return value of one to the next
     * @param {[Function]} fns The functions to be piped
     * @return {Function} The piped composition of the input functions
     */

    const pipe = (...fns) => arg => fns.reduce((acc, f) => f(acc), arg);
    /**
     * Curried version of Array.prototype.map
     */

    const map = fn => arr => [].map.call(arr, fn);
    /**
     * Curried version of Array.prototype.forEach
     */

    const forEach = fn => arr => [].forEach.call(arr, fn);
    /**
     * Flattens one level of a list
     * @param {[[a]]} list
     * @return {[a]}
     */

    function flatten(list) {
      const len = xs => xs && typeof xs.length === 'number' ? xs.length : 1;

      const n = list.reduce((acc, xs) => acc + len(xs), 0);
      let res = new Array(n);
      let p = 0;

      for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].length >= 0) {
          for (let j = 0; j < list[i].length; j++) res[p++] = list[i][j];
        } else {
          res[p++] = list[i];
        }
      }

      return res;
    }
    function once(fn) {
      let result,
          ran = false;
      return function (...args) {
        if (!ran) {
          ran = true;
          result = fn(...args);
        }

        return result;
      };
    }
    const capitalize = str => str[0].toUpperCase() + str.slice(1).toLowerCase();
    const nop = function () {};
    /**
     * Formats a keyboard event to a shortcut string
     * It's in Functional.js because putting it in shortcuts.js created a circular dependency, and I don't like warnings in my builds
     * @param {KeyboardEvent} event
     * @returns {String} a formatted shortcut string from the event, like "Ctrl+Shift+P"
     */

    function formatShortcut(event) {
      let res = "";
      if (event.metaKey) res += 'Meta+';
      if (event.ctrlKey) res += 'Ctrl+';
      if (event.altKey) res += 'Alt+';
      if (event.shiftKey) res += 'Shift+';
      res += event.key == ' ' ? 'Space' : capitalize(event.key);
      return res;
    }
    /**
     * Returns a debounced function that fires no more than once in a `delay` ms period
     * @param {Function} fn the function to debounce
     * @param {Number} delay the delay in milliseconds
     */

    function debounce(fn, delay) {
      let timeout;
      return function debounced(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          timeout = undefined;
          fn(...args);
        }, delay);
      };
    }
    async function profile(fn) {
      return fn();
    }

    /**
     * @file Minimalistic event-bus
     */
    let listeners = {};
    function listen(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    }
    async function fire(event, data) {
      const results = (listeners[event] || []).map(async cb => cb(data));
      return Promise.all(results);
    }

    const version = env$2.VERSION;
    /**
     * Decorates a function so, when called, it only runs when the DOM has loaded
     * @example
     * let write_sum = ready((x, y) => document.write(x + y));
     * write_sum(1, 2); // only writes when the DOM has loaded
     * @type (...a -> b) -> ...a -> Promise<b>
     */

    const ready$1 = fn => (...args) => {
      if (document.readyState == 'complete') {
        return Promise.resolve(fn(...args));
      }

      return new Promise(res => document.addEventListener('DOMContentLoaded', () => res(fn(...args)), {
        once: true
      }));
    };
    /**
     * @type Function -> Promise
     */

    const run_when_ready = fn => ready$1(fn)();
    const userHandle = once(ready$1(function () {
      const handle = dom.$('.lang-chooser').children[1].children[0].innerText.trim();
      return handle == 'Enter' ? 'tourist' : handle;
    }));

    var shared = /*#__PURE__*/Object.freeze({
        __proto__: null,
        version: version,
        ready: ready$1,
        run_when_ready: run_when_ready,
        userHandle: userHandle
    });

    const global = typeof unsafeWindow !== 'undefined' && unsafeWindow;
    const storage = {
      get: key => Promise.resolve(localStorage.getItem(key)).then(safe(JSON.parse, {})),
      set: (key, value) => Promise.resolve(localStorage.setItem(key, JSON.stringify(value))),
      propagate: async function () {}
    };

    var userscript = /*#__PURE__*/Object.freeze({
        __proto__: null,
        global: global,
        storage: storage
    });

    let env = {};

    {
      env = { ...shared,
        ...userscript
      };
    }

    var env$1 = env;

    function _extends() {
      _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];

          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }

        return target;
      };

      return _extends.apply(this, arguments);
    }

    function prop(title, type, id, data) {
      return {
        title,
        type,
        id,
        data
      };
    }
    let configProps = [prop('"Show Tags" button', 'toggle', 'showTags'), prop('Sidebar Action Box', 'toggle', 'sidebarBox'), prop('Default standings', 'select', 'defStandings', ['Common', 'Friends']), prop('Custom Style', 'toggle', 'style'), prop('Update standings every ___ seconds (0 to disable)', 'number', 'standingsItv'), prop('Join div1 and div2 standings', 'toggle', 'standingsTwin'), prop('Hide "on test X" in verdicts', 'toggle', 'hideTestNumber'), prop('Dark Theme', 'toggle', 'darkTheme'), ...([])];
    function scProp(title, id) {
      return {
        title,
        id
      };
    }
    let shortcutProps = [scProp('Submit', 'submit'), scProp('Dark Theme', 'darkTheme'), scProp('Open Finder', 'finder'), scProp('Scroll to Content', 'scrollToContent'), scProp('Hide Test Number', 'hideTestNumber')];

    const Toggle = ({
      config,
      id,
      pushChange,
      pullChange
    }) => {
      let checkbox = dom.element("input", {
        id: id,
        checked: config[id],
        type: "checkbox",
        onChange: e => pushChange(id, e.target.checked)
      });
      pullChange(id, value => checkbox.checked = value);
      return dom.element(dom.fragment, null, checkbox, dom.element("span", null));
    };

    const Number = ({
      config,
      id,
      pushChange
    }) => dom.element("input", {
      id: id,
      value: config[id] || 0,
      type: "number",
      onInput: e => pushChange(id, +e.target.value)
    });

    const Select = ({
      config,
      id,
      data,
      pushChange
    }) => dom.element("select", {
      id: id,
      onChange: e => pushChange(id, e.target.value)
    }, data.map(option => dom.element("option", {
      value: option,
      selected: option == config[id]
    }, option)));

    const Text = ({
      config,
      id,
      pushChange
    }) => dom.element("input", {
      id: id,
      value: config[id],
      type: "text",
      onChange: e => pushChange(id, e.target.value)
    });

    function Prop({
      title,
      type,
      id,
      data,
      config,
      pushChange,
      pullChange
    }) {
      let props = {
        config,
        id,
        pushChange,
        pullChange
      };
      const table = {
        toggle: () => dom.element(Toggle, props),
        number: () => dom.element(Number, props),
        select: () => dom.element(Select, _extends({}, props, {
          data: data
        })),
        text: () => dom.element(Text, props)
      };
      let el = table[type]();
      return dom.element("label", {
        className: type,
        for: id
      }, title, el);
    }

    function Shortcut({
      title,
      id,
      shortcuts,
      pushChange
    }) {
      const pushDebounced = debounce(pushChange, 250);

      function handleKeyDown(e) {
        e.preventDefault();
        let sc = formatShortcut(e);

        if (sc != 'Escape') {
          // would conflict with other CF++ default shortcuts and prevent exiting the popup/config modal
          e.target.value = sc;
          pushDebounced(id, sc);
        }
      }

      return dom.element("label", {
        className: "shortcut",
        for: `sc-${id}`
      }, title, dom.element("input", {
        id: `sc-${id}`,
        value: shortcuts[id],
        type: "text",
        onKeyDown: handleKeyDown
      }));
    }
    /**
     * Creates the UI's core, toggles, inputs, labels, and everything
     * @param {Object} config JSON object with the user config e.g. `config = { darkTheme: true, showTags: false }`
     * @param {Function(id, value)} pushChange will be called when the `id` config changes in the UI
     * @param {Function(id, callback)} pullChange registers an event listener/callback for any `id` config changes
     * @example <Config pushChange={(id, value) => console.log("Toggle was set to", value)}
     *                  pullChange={(id, cb) => events.listen(id, cb)}/>
     */


    function Config({
      config,
      pushChange = nop,
      pullChange = nop
    }) {
      return configProps.map(p => dom.element(Prop, _extends({}, p, {
        config: config,
        pushChange: pushChange,
        pullChange: pullChange
      })));
    }
    function Shortcuts({
      shortcuts,
      pushChange = nop
    }) {
      return shortcutProps.map(p => dom.element(Shortcut, _extends({}, p, {
        shortcuts: shortcuts,
        pushChange: pushChange
      })));
    }

    let config = {};
    function save() {
      localStorage.cfpp = JSON.stringify(config);
    }
    function commit(id) {
      fire(id, config[id]);
      save();
    }
    const get = key => config[key];
    function set(key, value) {
      if (config[key] == value) return;
      config[key] = value;
      commit(key);
    }
    const toggle = key => set(key, !config[key]);
    const defaultConfig = {
      showTags: true,
      style: true,
      darkTheme: false,
      standingsItv: 0,
      standingsTwin: false,
      defStandings: "common",
      hideTestNumber: false,
      sidebarBox: true,
      tutorialSpoilers: false,
      mashupSpoilers: false,
      shortcuts: {
        darkTheme: "Ctrl+I",
        finder: "Ctrl+Space",
        submit: "Ctrl+S",
        scrollToContent: "Ctrl+Alt+C",
        hideTestNumber: "Ctrl+Shift+H"
      }
    };
    function load() {
      // Get the data from localStorage because it's fast
      config = safe(JSON.parse, {})(localStorage.cfpp); // Settings auto-extend when more are added in the script

      config = Object.assign({}, defaultConfig, config);

      {
        save();
      } // Listen to requests for the config to change. Can come from the MPH, for example (env-extension.js)


      listen('request config change', ({
        id,
        value
      }) => {
        config[id] = value;
        fire(id, value); // no save(), commit() or set() to prevent infinite loops
      });
    }
    /**
     * Creates the interface to change the settings.
     */


    const createUI = env$1.ready(function () {
      // Some pages, like error pages and m2.codeforces, don't have a header
      // As there's no place to put the settings button, just abort
      if (!dom.$('.lang-chooser')) return;

      function pushShortcut(id, value) {
        config.shortcuts[id] = value;
        commit('shortcuts');
      }

      let modal = dom.element("div", {
        className: "cfpp-config cfpp-modal cfpp-hidden"
      }, dom.element("div", {
        className: "cfpp-modal-background",
        onClick: closeUI
      }), dom.element("div", {
        className: "cfpp-modal-inner"
      }, dom.element(Config, {
        config: config,
        pushChange: set,
        pullChange: listen
      }), dom.element("span", {
        className: "hr"
      }), dom.element(Shortcuts, {
        shortcuts: config.shortcuts,
        pushChange: pushShortcut
      }))); // Create the button that shows the modal

      let modalBtn = dom.element("a", {
        className: "cfpp-config-btn"
      }, "[++]");
      dom.on(modalBtn, 'click', ev => {
        ev.preventDefault();
        modal.classList.remove('cfpp-hidden');
      });
      dom.on(document, 'keyup', keyupEvent => {
        // pressing ESC also closes the UI
        if (keyupEvent.key == 'Escape') closeUI();
      }); // Append the created elements to the DOM

      document.body.appendChild(modal);
      dom.$('.lang-chooser').children[0].prepend(modalBtn);
    });
    function closeUI() {
      dom.$('.cfpp-config').classList.add('cfpp-hidden');
      save();
    }

    var commonCSS = "@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}.cfpp-hidden{display:none;}.cfpp-config-btn{font-size:22px!important;cursor:pointer;}.cfpp-config>.cfpp-modal-inner{width:30%;}.cfpp-modal{box-sizing:border-box;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:101;}.cfpp-modal-background{position:absolute;top:0;left:0;width:100vw;height:100vh;background:#00000087;animation:fadeIn 0.15s forwards;}html.cfpp-dark-mode .cfpp-modal-background{background:#ffffff87;}.cfpp-modal-inner>label{position:relative;margin-bottom:0.5em;display:flex;flex-direction:row;justify-content:space-between;user-select:none;}.cfpp-modal-inner input[type=text],.cfpp-modal-inner input[type=number]{width:32%;}.cfpp-modal-inner input[type=checkbox]{visibility:hidden;}.cfpp-modal-inner .toggle>span{position:absolute;width:1.4rem;height:1.4rem;top:calc(50% - 0.7rem);right:0;display:inline-block;border:thin solid #188ecd;border-radius:100%;background:#eee;transition:background 0.2s;}.cfpp-modal-inner .toggle>input:checked + span{background:#188ecd;}.cfpp-modal-inner .toggle>span:before{content:\"✓\";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#eee;font-size:0.8em;}.cfpp-modal-inner{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60vw;max-height:80vh;background:white;padding:2em;border-radius:6px;overflow:auto;animation:fadeIn 0.15s forwards;}.hr{display:block;border-top:1px solid #7f7f7f52;width:calc(100% + 4em);margin:.5em -2em;}.cfpp-navbar{float:left;margin-left:1.5em;}.cfpp-navbar-item{display:inline-block;position:relative;margin-right:1.5em;}.cfpp-navbar-item>a{color:#212121!important;}.cfpp-dropdown{position:absolute;top:100%;left:0;width:200%;z-index:99;display:none;background:#212121;padding:1em;box-shadow:1px 7px 19px #00000054;}.cfpp-dropdown a{display:block;color:#E0E0E0!important;}.cfpp-navbar-item:hover .cfpp-dropdown,.cfpp-navbar-item:focus-within .cfpp-dropdown{display:block;}.finder-inner{position:absolute;top:8%;left:50%;transform:translate(-50%,0%);width:60vw;animation:fadeIn 0.15s forwards;}.finder-input,.finder-results{box-sizing:border-box;width:100%;border:none;border-radius:6px;font-family:'Libre Franklin','Roboto',sans-serif;font-size:1.25em;}.finder-input{padding:1em 1.25em;margin-bottom:1.5em;transition:box-shadow 0.2s;}.finder-input:focus{outline:none;box-shadow:0 6px 19px #0b28667a;}.finder-results{background:white;list-style:none;padding:0;margin:0;max-height:75vh;overflow:auto;}.finder-results a{cursor:pointer;color:#282828!important;display:block;padding:1em 1.25em;transition:color,margin-left 0.1s;}.finder-results a:focus{color:#2c63d5;outline:none;margin-left:0.25em;}.inverted{filter:invert(1);}html.cfpp-dark-mode,html.cfpp-dark-mode img{filter:invert(1) hue-rotate(180deg);}html.cfpp-dark-mode .MathJax img:not(.inverted),html.cfpp-dark-mode .tex-formula:not(.inverted){filter:none!important;}#header img{filter:none;}html.cfpp-dark-mode,html.cfpp-dark-mode body{background:hsl(0,0%,93%)!important;}.verdict-hide-number .verdict-format-judged,.verdict-hide-number .diagnosticsHint{display:none!important;}.boxRow a,.boxRow input{color:black!important;border:none!important;background:transparent!important;padding:0!important;}.boxRow form{margin:0!important;}.spoilered:not(:hover),.spoilered-mashup ._MashupContestEditFrame_tags:not(:active){background:black;color:black;opacity:.25;}.spoilered:not(:hover) img,.spoilered:not(:hover) a{visibility:hidden;}.spoilered-mashup ._MashupContestEditFrame_tags.notice:not(:active){color:black!important;}.spoilered-mashup ._MashupContestEditFrame_tags{cursor:pointer;min-width:50%;}";

    var customCSS = "@font-face{font-family:'Libre Franklin';font-style:normal;font-weight:400;font-display:swap;src:local('Libre Franklin'),local('LibreFranklin-Regular'),url(https://fonts.gstatic.com/s/librefranklin/v4/jizDREVItHgc8qDIbSTKq4XkRiUR2zcLig.woff2) format('woff2');unicode-range:U+0100-024F,U+0259,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF;}@font-face{font-family:'Libre Franklin';font-style:normal;font-weight:400;font-display:swap;src:local('Libre Franklin'),local('LibreFranklin-Regular'),url(https://fonts.gstatic.com/s/librefranklin/v4/jizDREVItHgc8qDIbSTKq4XkRiUf2zc.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}a,a:visited,a:link,.contest-state-phase{text-decoration:none!important;color:#2c63d5;}.titled,.caption{color:#2c63d5!important;}body *,body>div p,body>div li,body>div th,body>div span:not(.tex-span),body>div .problem-statement .header .title,body>div .problem-statement .section-title,body>div .problem-statement .sample-tests,body>div .ttypography p,body>div .second-level-menu-list li,body>div td{font-family:'Libre Franklin','Roboto',sans-serif;}body>div div.ttypography pre,body>div pre.prettyprint li,body>div code.prettyprint span:not(.tex-span),body>div pre.prettyprint span:not(.tex-span){font-family:monospace;}.menu-list-container a{text-transform:none!important;font-variant:small-caps;}.roundbox-lt,.roundbox-lb,.roundbox-rt,.roundbox-rb,.lt,.lb,.rt,.rb,.ilt,.ilb,.irt,.irb{display:none;}.roundbox{border-radius:6px;overflow:hidden;border:none!important;box-shadow:1px 1px 5px rgba(108,108,108,0.17);}.titled{border:none!important;}table th,table td{border:none!important;}.datatable{background-color:#f8f8f8!important;}.title-photo div:first-child,.userbox{border:none!important;}.nav-links li{list-style:none!important;}.backLava{display:none!important;}input[type=submit]{background:#d2d2d245;border:none;border-bottom:3px solid #b6b6b678;padding:0.4em 1.1em!important;border-radius:6px;cursor:pointer;}input[type=submit]:active{border-bottom:1px solid #b6b6b678;}.submitForm input,.submitForm select{border:none;}.input-output-copier{text-transform:lowercase;font-variant:small-caps;border:none;}.lang-chooser{font-size:0;}.lang-chooser a{font-size:small;margin-left:0.3em;}.problem-statement{margin:0!important;}.problem-statement .property-title{display:none!important;}.problem-statement .header .title{font-size:200%!important;margin-bottom:0!important;}.problem-statement .header{margin:2.5em 0 1.5em!important;text-align:left!important;}.problem-statement .header>div{display:inline-block!important;margin-right:0.5em;}.problem-statement .header>div:not(.title){color:#9E9E9E;}.problem-statement .header>div:not(:last-child)::after{content:\",\";}div.ttypography p,.sample-test{margin-bottom:1.5em!important;}.problem-statement .section-title{font-size:150%;margin-bottom:0.25em;}.source-and-history-div{border:none;}#facebox{position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50% ,-50%);}html{background:#f2f2f2;}body{background:inherit!important;margin:0;}#pageContent{background:white;padding:1.5em!important;border-radius:6px;box-shadow:1px 1px 5px rgba(108,108,108,0.17);}.problem-statement .header,div.ttypography{margin:0 0 1em!important;}";

    async function injectStyle(css) {
      let style = dom.element("style", {
        className: "cfpp-style"
      }, css);
      (document.body || document.head || document.documentElement).appendChild(style);
      return style;
    }

    const addStyle = typeof GM_addStyle === 'function' ? GM_addStyle : injectStyle;
    let injectedCustomStyle;
    async function custom() {
      injectedCustomStyle = await addStyle(customCSS);
    }
    async function common() {
      {
        addStyle(commonCSS);
      }
    } // Applies only to custom css, which is configurable.

    function install$e() {
      if (get('style')) {
        custom();
      }
    }
    function uninstall$8() {
      injectedCustomStyle && injectedCustomStyle.remove();
      injectedCustomStyle = undefined;
    }

    var style = /*#__PURE__*/Object.freeze({
        __proto__: null,
        custom: custom,
        common: common,
        install: install$e,
        uninstall: uninstall$8
    });

    function install$d() {
      if (get('darkTheme')) document.documentElement.classList.add('cfpp-dark-mode');
    }
    function uninstall$7() {
      document.documentElement.classList.remove('cfpp-dark-mode');
    }

    var dark_theme = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$d,
        uninstall: uninstall$7
    });

    const install$c = env$1.ready(function () {
      if (!get('showTags') || !dom.$('.tag-box')) return; // If the user has already AC'd this problem, there's no need to hide the tags

      let hasAC = dom.$('.verdict-accepted');

      if (hasAC) {
        return;
      }

      let tbox = dom.$('.tag-box'); // individual tag

      let container = tbox.parentNode.parentNode; // actual container for all the tags

      container.style.display = 'none';

      function ShowTagsButton() {
        return dom.element("button", {
          className: "caption showTagsBtn",
          style: "background: transparent; border: none; cursor: pointer;",
          onClick: uninstall$6
        }, "Show");
      }

      container.parentNode.appendChild(dom.element(ShowTagsButton, null));
    });
    const uninstall$6 = env$1.ready(function () {
      let btn = dom.$('.showTagsBtn');

      if (btn) {
        btn.remove();
        let container = dom.$('.tag-box').parentNode.parentNode; // container for all the tags

        container.style.display = 'block';
      }
    });

    var show_tags = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$c,
        uninstall: uninstall$6
    });

    function changeNoACsDisplay(display) {
      // Get problems that don't have an AC
      let noACs = dom.$$('.problems tr:not(.accepted-problem)');

      for (let p of noACs) {
        // Hide them hackfully!
        let k = p.children[1].children[1] || {};
        k = k.style || {};
        k.display = display;
      }
    }

    const install$b = env$1.ready(function () {
      if (get('showTags') && dom.$('.problems')) changeNoACsDisplay('none');
    });
    const uninstall$5 = () => changeNoACsDisplay('block');

    var problemset = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$b,
        uninstall: uninstall$5
    });

    const install$a = env$1.ready(function () {
      let searchableRegex = /\/(gym|group)\/(.?)+\/problem\/\w$/i; // Maches a problem on a /gym or /group page

      if (!searchableRegex.test(location.pathname)) return;
      let problemTitle = dom.$('.problem-statement .title').innerText;
      problemTitle = problemTitle.split('.').slice(1).join('.');
      problemTitle += ' codeforces';
      const href = `https://google.com/search?q=${encodeURIComponent(problemTitle)}`;
      dom.$('.second-level-menu-list').appendChild(dom.element("li", null, dom.element("a", {
        href: href,
        target: "_blank",
        className: "searchBtn"
      }, " Google It ")));
    });
    function uninstall$4() {
      let btn = dom.$('.searchBtn');
      if (btn) btn.remove();
    }

    var search_button = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$a,
        uninstall: uninstall$4
    });

    function showModal() {
      dom.$('.cfpp-tutorial').classList.remove('cfpp-hidden');
    }

    function closeModal() {
      dom.$('.cfpp-tutorial').classList.add('cfpp-hidden');
    } // TODO: make it a fetch()

    /**
     * Queries the tutorial page and resolves with the HTML *string* returned by the Codeforces API
     * Assumes the document has been loaded completely already (because install() is decorated with env.ready)
     * @param {String} problemCode - see getProblemCode()
     * @returns {Promise<String>}
     */


    const getTutorialHTML = problemCode => new Promise(function (resolve, reject) {
      const csrf = env$1.global.Codeforces.getCsrfToken();
      let xhr = new XMLHttpRequest();
      xhr.open('POST', '/data/problemTutorial');
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
      xhr.setRequestHeader('X-Csrf-Token', csrf);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.responseType = 'json';

      xhr.onload = () => {
        if (xhr.response && xhr.response.success) {
          resolve(xhr.response.html);
        } else {
          reject("couldn't query the API");
        }
      };

      xhr.onerror = () => reject("couldn't query the API");

      xhr.send(`problemCode=${problemCode}&csrf_token=${csrf}`);
    });
    /**
     * @returns {String} the problem code
     * @example extractProblemCode("/contest/998/problem/D") //=> "998D"
     */


    async function extractProblemCode(url) {
      let matches = url.match(/\/problemset\/problem\/(\d+)\/(.+)|\/contest\/(\d+)\/problem\/(.+)/i);
      if (matches[1]) return matches[1] + matches[2];
      if (matches[3]) return matches[3] + matches[4];
      throw "couldn't get problem code from URL";
    }

    function createModalNodes() {
      let modalInner = dom.element("div", {
        className: "cfpp-modal-inner"
      }, "loading...");
      let modal = dom.element("div", {
        className: "cfpp-modal cfpp-tutorial cfpp-hidden"
      }, dom.element("div", {
        className: "cfpp-modal-background",
        onClick: closeModal
      }), modalInner);
      dom.on(document, 'keyup', keyupEvent => {
        if (keyupEvent.key == 'Escape') closeModal();
      });
      return [modal, modalInner];
    }

    function addSpoilers(modalInner) {
      const getChildren = node => [].slice.call(node ? node.children : []);

      const setSpoiler = state => node => node.classList.toggle('spoilered', state);
      /**
       * @param {Bool} state - set to true if you want to spoiler everything, false to unspoiler
       */


      function updateDOM(state) {
        getChildren(dom.$('.problem-statement>div', modalInner)).forEach(node => {
          if (node.tagName == 'UL') // Spoiler <li>s individually instead of the whole <ul>
            getChildren(node).forEach(setSpoiler(state));else setSpoiler(state)(node);
        });
      }

      updateDOM(get('tutorialSpoilers'));
      listen('tutorialSpoilers', updateDOM);
      let title = modalInner.children[0];
      title.appendChild(dom.element("span", {
        style: "font-size: 0.65em; float: right; cursor: pointer;",
        onClick: () => toggle('tutorialSpoilers')
      }, "Toggle spoilers"));
    }

    const loadModal = once(async function () {
      let [modal, modalInner] = createModalNodes();
      document.body.appendChild(modal);
      return extractProblemCode(location.pathname).then(getTutorialHTML).then(html => modalInner.innerHTML = html).then(() => addSpoilers(modalInner)).then(() => MathJax.Hub.Queue(() => MathJax.Hub.Typeset(modalInner))).catch(err => modalInner.innerText = `Failed to load the tutorial: ${err}`);
    });
    /**
     * Creates a "Tutorial" button.
     * When clicked, the button will create a modal and fill it with the tutorial's content
     */

    const install$9 = env$1.ready(function () {
      const problemRegex = /\/problemset\/problem\/|\/contest\/\d+\/problem\/(\w|\d)/i;
      if (!problemRegex.test(location.pathname)) return;
      let btn = dom.element("a", {
        className: "cfpp-tutorial-btn",
        style: "cursor: pointer;"
      }, " Tutorial ");
      dom.on(btn, 'click', () => {
        loadModal();
        showModal();
      }); // Load the tutorial if we're idle

      if ('requestIdleCallback' in env$1.global) {
        env$1.global.requestIdleCallback(loadModal, {
          timeout: 10000
        });
      }

      dom.$('.second-level-menu-list').appendChild(dom.element("li", null, btn));
    });

    var show_tutorial = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$9
    });

    const install$8 = env$1.ready(async function () {
      const handle = await env$1.userHandle();
      let oldNav = dom.$('.main-menu-list');
      let newNav = dom.element("nav", {
        className: "cfpp-navbar"
      }); // Without this the dropdowns don't appear

      oldNav.parentNode.parentNode.style.overflow = 'visible';
      let keys = {
        "/": {},
        "/groups": {
          "My Groups": `/groups/with/${handle}`,
          "My Teams": `/teams/with/${handle}`
        },
        "/problemset": {
          "Status": "/problemset/status",
          "Friends Status": "/problemset/status?friends=on",
          "My Submissions": `/submissions/${handle}`,
          "Favourites": `/favourite/problems`,
          "ACM SGU": "/problemsets/acmsguru"
        },
        "/contests": {
          "My Contests": `/contests/with/${handle}`,
          "My Problems": `/contests/writer/${handle}`
        },
        "/gyms": {
          "Mashups": "/mashups"
        },
        "/ratings": {
          "Friends": "/ratings/friends/true"
        },
        "/edu/courses": {}
      };
      let other = dom.element("div", {
        className: "cfpp-navbar-item"
      }, dom.element("a", {
        href: "#"
      }, "Other"));
      let ddOther = dom.element("div", {
        className: "cfpp-dropdown"
      }); // Iterate over all nav items and include them the new navbar

      for (let item of oldNav.children) {
        let link = item.children[0]; // <a> tag

        let newItem = dom.element("div", {
          className: "cfpp-navbar-item"
        }, link); // Add dropdown menu, if needed

        const href = link.getAttribute('href');

        if (keys[href]) {
          let dropdown = dom.element("div", {
            className: "cfpp-dropdown"
          });

          for (let ddText in keys[href]) {
            dropdown.appendChild(dom.element("a", {
              href: keys[href][ddText]
            }, ddText));
          }

          if (dropdown.children.length) {
            newItem.appendChild(dropdown);
          }

          newNav.appendChild(newItem);
        } else {
          ddOther.appendChild(dom.element("a", {
            href: href
          }, link));
        }
      }

      other.appendChild(ddOther);
      newNav.appendChild(other);
      oldNav.replaceWith(newNav); // Change Codeforces logo to Codeforces++

      let logo = dom.$('#header img');

      if (logo && /codeforces-logo/.test(logo.getAttribute('src'))) {
        logo.setAttribute('src', 'https://github.com/LeoRiether/CodeforcesPP/raw/master/assets/codeforcespp.png');
      }
    });

    var navbar = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$8
    });

    function groups() {
      dom.$$('.datatable a.groupName').forEach(link => link.href = link.href.replace('/members', '/contests'));
    } // Redirects every /standings page to a 'friends only' standings page


    function friendsStandings() {
      let links = document.getElementsByTagName('a');

      for (let link of links) {
        if (link.href.endsWith('/problemset/standings')) {
          // Problemset standings
          let url = new URL(link.href);
          url.searchParams.set('friendsEnabled', 'on'); // add '?friendsEnabled=on'

          link.href = url.href;
        } else if (link.href.endsWith('/standings')) {
          // Everything else
          link.href += '/friends/true';
        }
      }
    } // Redirects contest registrants to friends registrants


    function registrants() {
      dom.$$('.contestParticipantCountLinkMargin').forEach(e => e.href += '/friends/true');
    } // Redirects /problemset/standings to the contest standings you actually want


    function problemsetStandings(contestID) {
      let links = dom.$$('.second-level-menu-list a');

      for (let link of links) {
        if (link.href.endsWith('/problemset/standings')) {
          link.href = link.href.replace('problemset', 'contest/' + contestID);
          return;
        }
      }
    } // Adds a /virtual button on gym pages


    function gymVirtual() {
      dom.$('#sidebar').children[0].insertAdjacentElement('afterend', dom.element("div", {
        class: "roundbox sidebox"
      }, dom.element("div", {
        class: "caption titled"
      }, "\u2192 Virtual participation"), dom.element("form", {
        style: "text-align:center; margin:1em;",
        action: `${location.href}/virtual`,
        method: "get"
      }, dom.element("input", {
        type: "submit",
        value: "Start virtual contest"
      }))));
    }

    const install$7 = env$1.ready(function () {
      if (/\/groups\/with\//i.test(location.pathname)) {
        groups();
      } // Always do this *before* friendsStandings() because of endsWith('/problemset/standings')


      const contestIDMatch = location.pathname.match(/problemset\/problem\/(\d+)/i);

      if (contestIDMatch) {
        problemsetStandings(contestIDMatch[1]);
      }

      if (get('defStandings') == 'Friends' && !/\/standings/i.test(location.pathname)) {
        friendsStandings();
      }

      if (dom.$('.contestParticipantCountLinkMargin')) {
        registrants();
      } // /gym/:ID or /group/:GroupID/contest/:ID


      if (/gym\/\d+$/i.test(location.pathname) || /group\/[a-zA-Z0-9]+\/contest\/\d+$/i.test(location.pathname)) {
        gymVirtual();
      }
    });

    var redirector = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$7
    });

    const includesAny = (patterns, text) => patterns.some(p => text.includes(p));
    /**
     * Runs all <script> tags inside the element
     */


    function runScripts(element) {
      const scripts = [].slice.call(element.getElementsByTagName('script'));
      scripts.forEach(s => {
        const content = s.childNodes[0].nodeValue;
        const patterns = ['handleContestantProblemHistory', 'statisticsRow'];

        if (includesAny(patterns, content)) {
          element.appendChild(dom.element("script", {
            type: "text/javascript"
          }, content));
          s.remove();
        }
      });
    }
    /**
     * Returns the <div id="pageContent" in the standings page for a given URL
     */

    const getStandingsPageContent = url => fetch(url).then(response => response.text()).then(text => new DOMParser().parseFromString(text, 'text/html')).then(html => dom.$('#pageContent', html) || Promise.reject("You might be offline or Codeforces is down!"));

    /**
     * Updates the main standings and fires the "standings updated" event
     */

    function update$1() {
      // Load the main standings
      const upd = getStandingsPageContent(location.href).then(env$1.ready(content => {
        dom.$('#pageContent').replaceWith(content);
        return content;
      })).catch(err => console.error("Couldn't load the standings. Reason: ", err));
      const evt = fire('standings updated'); // After everything has been updated, run the scripts

      Promise.all([upd, evt]).then(([content, _]) => runScripts(content));
    }

    let intervalID = 0;
    function install$6() {
      if (intervalID) uninstall$3();
      const standingsItv = +get('standingsItv');

      if (standingsItv > 0 && location.pathname.includes('/standings')) {
        intervalID = setInterval(update$1, standingsItv * 1000);
      }
    }
    function uninstall$3() {
      clearInterval(intervalID);
      intervalID = 0;
    }

    var update_standings = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$6,
        uninstall: uninstall$3
    });

    function gatherInfo() {
      const pageContent = dom.$('#pageContent');
      const name = dom.$('.contest-name', pageContent).innerText;
      const id = +/\/contest\/(\d+)\//.exec(location.href)[1]; // just finds the /contest/{ID} and converts to a number

      const div = +(/Div\. (\d)/i.exec(name) || [])[1];
      const twinID = div == 1 ? id + 1 : id - 1;
      return {
        pageContent,
        name,
        id,
        div,
        twinID
      };
    }

    const verifyTwinExists = once(async info => {
      if (info.div != 1 && info.div != 2) return false;

      const API_URL = contestID => `//codeforces.com/api/contest.standings?contestId=${contestID}&count=1&from=1`;

      let curFetch = fetch(API_URL(info.id)).then(res => res.json());
      let twinFetch = fetch(API_URL(info.twinID)).then(res => res.json()); // Contests are twins if they start at the same time!

      return Promise.all([curFetch, twinFetch]).then(([cur, twin]) => cur.status == 'OK' && twin.status == 'OK' && cur.result.contest.startTimeSeconds == twin.result.contest.startTimeSeconds);
    });
    const twinURL = once(info => location.href.replace(`/${info.id}/`, `/${info.twinID}/`));
    /**
     * Updates the container for the twin standings
     */

    const update = env$1.ready(function () {
      let container = dom.$('#cfpp-twin-standings');
      if (!container) return;
      const url = twinURL();
      return getStandingsPageContent(url).then(content => {
        dom.$('.toggle-show-unofficial', content).remove();
        dom.$('.source-and-history-div', content).remove();
        dom.$('.history-div', content).remove();
        dom.$('.second-level-menu', content).remove();

        if (container.children.length) {
          container.children[0].replaceWith(content);
        } else {
          container.appendChild(content);
        }
      }).catch(err => console.error("Couldn't load twin standings. Reason: ", err));
    });
    const listenToStandingsUpdates = once(() => listen('standings updated', update) // If the main standings updated, we should too
    );
    const install$5 = env$1.ready(async function () {
      const shouldInstall = get('standingsTwin');
      const isProblemsetStandings = location.pathname.includes('/problemset/standings');
      const isStandings = location.pathname.includes('/standings');
      if (!shouldInstall || isProblemsetStandings || !isStandings) return;
      let info = gatherInfo();
      if (!(await verifyTwinExists(info))) return; // Initialize twinURL (only runs once and memoizes result, so we can call without `info` later)
      // kind of a hack, I'm sorry

      twinURL(info); // Create standings container

      let container = dom.element("div", {
        id: "cfpp-twin-standings"
      });
      info.pageContent.parentNode.appendChild(container);
      update().then(() => runScripts(container));
      listenToStandingsUpdates();
    });
    function uninstall$2() {
      let container = dom.$('#cfpp-twin-standings');
      if (container) container.remove();
    }

    var twin_standings = /*#__PURE__*/Object.freeze({
        __proto__: null,
        update: update,
        install: install$5,
        uninstall: uninstall$2
    });

    const pluckVerdictRegex = / on (pre)?test ?\d*$/;

    const pluckVerdict = s => s.replace(pluckVerdictRegex, '');

    const pluckVerdictOnNode = safe(n => {
      let c = n.childNodes[0];
      c.nodeValue = pluckVerdict(c.nodeValue);
    }, '');
    let ready = false;
    function init() {
      if (ready) return;
      ready = true; // Proxy Codeforces.showMessage to hide the test case

      let _showMessage = env$1.global.Codeforces.showMessage;

      env$1.global.Codeforces.showMessage = function (message) {
        if (get('hideTestNumber')) {
          message = pluckVerdict(message);
        }

        _showMessage(message);
      }; // Subscribe to Codeforces submisions pubsub


      if (env$1.global.submissionsEventCatcher) {
        const channel = env$1.global.submissionsEventCatcher.channels[0];
        env$1.global.submissionsEventCatcher.subscribe(channel, data => {
          if (!get('hideTestNumber')) return;

          if (data.t === 's') {
            const el = dom.$(`[data-a='${data.d[0]}'] .status-verdict-cell span`);
            pluckVerdictOnNode(el);
          }
        });
      }
    }
    const install$4 = env$1.ready(function () {
      if (!get('hideTestNumber')) return;
      init();
      document.documentElement.classList.add('verdict-hide-number');
      dom.$$('.verdict-rejected,.verdict-waiting').forEach(pluckVerdictOnNode);
    });
    function uninstall$1() {
      if (!document.documentElement.classList.contains('verdict-hide-number')) return;
      document.documentElement.classList.remove('verdict-hide-number');
      dom.$$('.verdict-rejected,.verdict-waiting').forEach(e => {
        e.childNodes[0].nodeValue += ' on test ';
      });
    }

    var verdict_test_number = /*#__PURE__*/Object.freeze({
        __proto__: null,
        init: init,
        install: install$4,
        uninstall: uninstall$1
    });

    function toggleCoachMode() {
      let data = new URLSearchParams();
      data.append("action", "toggleGymContestsManagerEnabled");
      data.append("csrf_token", env$1.global.Codeforces.getCsrfToken());
      data.append("_tta", env$1.global.Codeforces.tta());
      return fetch("/gyms", {
        method: "POST",
        body: data
      }).then(res => res.text()).then(html => {
        let doc = new DOMParser().parseFromString(html, "text/html");
        let btn = doc.querySelector(".toggleGymContestsManagerEnabled input[type=submit]");
        let status = btn && btn.value.startsWith("Disable") ? "enabled" : "disabled";
        env$1.global.Codeforces.reloadAndShowMessage(`Coach mode is now ${status}`);
      }).catch(err => console.error("Codeforces++ couldn't toggle coach mode: ", err));
    }

    let isOpen = false;
    const safeJSONParse = safe(JSON.parse, {}); // TODO: every info I need is pulled from the DOM. Refactor to have a JS model of the search that syncs with the html

    /**
     * Kinda like a React component
     * I'm basically rolling my own React at this point
     */

    function Result(props) {
      if (!props.href && !props.onClick) {
        console.error(`Codeforces++ Error!\n` + `Please report this on GitHub: https://github.com/LeoRiether/CodeforcesPP\n` + `<Result> was created without any action attached. key=${props.key}.`);
      }

      return dom.element("li", {
        "data-key": props.key,
        "data-search": props.title.toLowerCase()
      }, props.href ? dom.element("a", {
        href: props.href
      }, props.title) : dom.element("a", {
        href: "#",
        onClick: props.onClick
      }, props.title));
    }

    let extensions = {
      common(handle) {
        return [{
          key: "contests",
          title: "Contests",
          href: "/contests"
        }, {
          key: "problemset",
          title: "Problemset",
          href: "/problemset"
        }, {
          key: "psetting",
          title: "Problemsetting",
          href: `/contests/with/${handle}`
        }, {
          key: "subms",
          title: "Submissions",
          href: `/submissions/${handle}`
        }, {
          key: "groups",
          title: "Groups",
          href: `/groups/with/${handle}`
        }, {
          key: "profile",
          title: "Profile",
          href: `/profile/${handle}`
        }, {
          key: "cfviz",
          title: "CfViz",
          href: "https://cfviz.netlify.com"
        }, {
          key: "favs",
          title: "Favourites",
          href: "/favourite/problems"
        }, {
          key: "teams",
          title: "Teams",
          href: `/teams/with/${handle}`
        }, {
          key: "status",
          title: "Status",
          href: "/problemset/status"
        }, {
          key: "fstatus",
          title: "Friends Status",
          href: "/problemset/status?friends=on"
        }, {
          key: "gym",
          title: "Gym",
          href: "/gyms"
        }, {
          key: "blog",
          title: "Blog",
          href: `/blog/handle/${handle}`
        }, {
          key: "mashups",
          title: "Mashups",
          href: "/mashups"
        }, {
          key: "rating",
          title: "Rating",
          href: "/ratings"
        }, {
          key: "api",
          title: "API",
          href: "/apiHelp"
        }, {
          key: "togCoach",
          title: "Toggle Coach Mode",
          onClick: toggleCoachMode
        }];
      },

      problem() {
        return [{
          key: "tutorial",
          title: "Problem: Tutorial",

          onClick() {
            close();
            dom.$('.cfpp-tutorial-btn').click();
          }

        }, {
          key: "submit",
          title: "Problem: Submit",

          onClick() {
            close();
            dom.$('#sidebar [name=sourceFile]').click();
          }

        }];
      },

      contest(baseURL, id, isGym) {
        const name = isGym ? 'Gym' : 'Contest';
        baseURL += `${name.toLowerCase()}/${id}`;
        const standingsFriends = get('defStandings') === 'Friends' ? '/friends/true' : '';
        return [{
          key: "cstandings",
          title: `${name}: Standings`,
          href: `${baseURL}/standings/${standingsFriends}`
        }, {
          key: "cproblems",
          title: `${name}: Problems`,
          href: `${baseURL}`
        }, {
          key: "csubmit",
          title: `${name}: Submit`,
          href: `${baseURL}/submit`
        }, {
          key: "csubmissions",
          title: `${name}: Submissions`,
          href: `${baseURL}/my`
        }, {
          key: "invoc",
          title: `${name}: Custom Invocation`,
          href: `${baseURL}/customtest`
        }, {
          key: "cstatus",
          title: `${name}: Status`,
          href: `${baseURL}/status`
        }, {
          key: "virtual",
          title: `${name}: Virtual`,
          href: `${baseURL}/virtual`
        }];
      },

      groups() {
        const makeRecordFromGroup = ([name, id]) => ({
          key: `group_${id}`,
          title: `Group: ${name}`,
          href: `/group/${id}/contests`
        });

        const makeGroups = pipe(safe(JSON.parse, []), map(makeRecordFromGroup));
        return makeGroups(localStorage.userGroups);
      }

    };
    /**
     * Bind search and navigation events (Input, ArrowDown, ArrowUp, ...)
     */

    function bindEvents(input, results) {
      // Random note: this is LISP, but without the parenthesis
      const updateDisplay = value => result => result.style.display = includesSubseq(result.dataset.search, value.toLowerCase()) ? "" : // visible
      "none"; // invisible


      const focus = result => {
        let c = result.children[0]; // <a> inside the result <li>

        c.focus();
        c.scrollIntoViewIfNeeded();
      };

      dom.on(input, 'input', () => {
        [].forEach.call(results.children, updateDisplay(input.value));
      });
      dom.on(input, 'keydown', e => {
        const visibleResults = Array.from(results.children).filter(c => c.style.display == "");
        if (visibleResults.length == 0) return;

        if (e.key == 'Enter') {
          let chosen = visibleResults[0];
          chosen.children[0].click();
          increasePriority(chosen.dataset.key);
          close();
        } else if (e.key == 'ArrowUp') {
          focus(visibleResults[visibleResults.length - 1]);
          e.preventDefault();
        } else if (e.key == 'ArrowDown') {
          focus(visibleResults[0]);
          e.preventDefault();
        }
      });
      dom.on(results, 'keydown', e => {
        const visibleResults = Array.from(results.children).filter(c => c.style.display == "");
        let i = visibleResults.indexOf(document.activeElement.parentElement); // Move to desired sibling

        if (e.key == 'ArrowDown') {
          i++;
        } else if (e.key == 'ArrowUp') {
          i--;
        } else {
          return;
        }

        if (i < 0 || i >= visibleResults.length) {
          input.focus();
          putCursorAtEnd(input);
          results.scrollTop = 0;
          e.preventDefault(); // prevent putCursorAtEnd from not working correctly, and scrolling
        } else {
          focus(visibleResults[i]);
          e.preventDefault(); // prevent scrolling
        }
      });
      dom.on(results, 'click', e => {
        increasePriority(e.target.parentElement.dataset.key);
      });
    }

    async function resultList() {
      const handle = await env$1.userHandle();
      let data = [];

      if (/\/problemset\/problem\/|\/contest\/\d+\/problem\/\w/i.test(location.pathname)) {
        data.push(extensions.problem());
      }

      const contestMatch = location.href.match(/\/contest\/(\d+)/i);
      const gymMatch = contestMatch || location.href.match(/\/gym\/(\d+)/i); // only executes if contest didn't match

      if (contestMatch) {
        // Is it a contest?
        const baseURL = location.href.substring(0, location.href.indexOf('contest'));
        data.push(extensions.contest(baseURL, contestMatch[1], false));
      } else if (gymMatch) {
        // Is it a gym contest?
        const baseURL = location.href.substring(0, location.href.indexOf('gym'));
        data.push(extensions.contest(baseURL, gymMatch[1], true));
      } else {
        // If it's neither, we have to put the problemset's Custom Invocation in the data
        data.push([{
          key: "invoc",
          title: "Custom Invocation",
          href: "/problemset/customtest"
        }]);
      }

      data.push(extensions.groups());
      data.push(extensions.common(handle));
      data = flatten(data); // Sort the data by priority

      let priority = safeJSONParse(localStorage.finderPriority);
      data = data.sort((a, b) => (priority[b.key] || 0) - (priority[a.key] || 0));
      return data;
    }

    const create = once(async function () {
      let input = dom.element("input", {
        type: "text",
        className: "finder-input",
        placeholder: "Search anything"
      });
      let results = dom.element("ul", {
        className: "finder-results"
      });
      let modal = dom.element("div", {
        className: "cfpp-modal cfpp-hidden",
        tabindex: "0"
      }, dom.element("div", {
        className: "cfpp-modal-background",
        onClick: close
      }), dom.element("div", {
        className: "finder-inner",
        tabindex: "0"
      }, input, results));
      dom.on(document, 'keyup', e => {
        if (e.key == 'Escape') close();
      });
      const list = await resultList();
      results.append(...list.map(props => dom.element(Result, props)));
      bindEvents(input, results);
      document.body.appendChild(modal);
      return {
        modal,
        input,
        results
      };
    });

    async function open() {
      if (isOpen) return;
      isOpen = true;
      let {
        modal,
        input
      } = await create();
      modal.classList.remove('cfpp-hidden');
      input.focus();
    }

    async function close() {
      if (!isOpen) return;
      isOpen = false;
      let {
        modal,
        input,
        results
      } = await create();
      modal.classList.add('cfpp-hidden');
      input.value = "";
      [].forEach.call(results.children, r => r.style.display = "");
    }
    /**
     * Increases the priority of a finder key in localStorage.finderPriority
     */


    function increasePriority(key) {
      let fp = safeJSONParse(localStorage.finderPriority);
      const maxValue = Object.values(fp).reduce((x, y) => Math.max(x, y), 0);
      fp[key] = maxValue + 1;
      localStorage.finderPriority = JSON.stringify(fp);
    }
    /**
     * Puts the cursor at the end in an input element
     */


    function putCursorAtEnd(input) {
      let pos = input.value.length;

      if (input.setSelectionRange) {
        input.focus();
        input.setSelectionRange(pos, pos);
      } else if (input.createTextRange) {
        var range = input.createTextRange();
        range.collapse(true);
        range.moveEnd('character', pos);
        range.moveStart('character', pos);
        range.select();
      }
    }

    function includesSubseq(text, pattern) {
      let p = pattern.length - 1;

      for (let i = text.length - 1; i >= 0 && p >= 0; i--) {
        if (text[i] == pattern[p]) p--;
      }

      return p < 0;
    }

    async function updateGroups() {
      const handle = await env$1.userHandle();

      if (location.href.endsWith(`/groups/with/${handle}`)) {
        // Opportune moment to update the user's groups
        const idRegex = /\/group\/([\d\w]+)/;

        const extractID = group => idRegex.exec(group)[1];

        let groups = [].map.call(dom.$$('.groupName'), el => [el.innerText.trim(), extractID(el.href)]);
        localStorage.userGroups = JSON.stringify(groups);
      }
    }

    function submit() {
      // Try getting the [choose a file] input
      let fileInput = document.getElementsByName('sourceFile');
      if (fileInput.length == 0) return;
      fileInput = fileInput[0];
      dom.on(window, 'focus', () => {
        const submitBtn = dom.$('.submit', fileInput.parentNode.parentNode.parentNode); // cool huh?

        submitBtn.focus();
      }, {
        once: true
      });
      fileInput.click(); // open the file picker
    }

    function scrollToContent() {
      const pageContent = dom.$('#pageContent');
      if (!pageContent) return;
      pageContent.scrollIntoView();
      document.documentElement.scrollBy(0, -20);
    }

    function install$3() {
      // id2Fn[an id like "darkTheme"] == a function that is called when the shortcut is pressed
      const id2Fn = {
        submit: submit,
        scrollToContent: scrollToContent,
        darkTheme: () => toggle('darkTheme'),
        hideTestNumber: () => toggle('hideTestNumber'),
        finder: open
      }; // id2Shortcut[an id like "darkTheme"] == a shortcut like "Ctrl+I"

      let id2Shortcut = get('shortcuts'); // convert(id2Shortcut, id2Fn) -> shortcut2Fn

      function convert(i2s, i2f) {
        let s2f = {};

        for (let id in i2s) {
          let shortcut = i2s[id].toLowerCase();
          let fn = i2f[id];
          s2f[shortcut] = fn;
        }

        return s2f;
      } // shortcut2Fn["Ctrl+I"] == a function like darkTheme()


      let shortcut2Fn = convert(id2Shortcut, id2Fn);
      listen('shortcuts', newId2Shortcut => shortcut2Fn = convert(newId2Shortcut, id2Fn));
      dom.on(document, 'keydown', e => {
        // Disallow shortcuts from firing when the user is focusing an input, textarea, ...
        if (dom.isEditable(document.activeElement)) return;
        let sc = formatShortcut(e).toLowerCase();
        const fn = shortcut2Fn[sc];

        if (fn) {
          e.preventDefault();
          e.stopPropagation();
          fn();
        }
      });
    }

    var shortcuts = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$3
    });

    // This is done to keep event listeners attached, but prevents uninstall() from ever existing

    const addToBox = box => col => box.appendChild(dom.element("tr", {
      className: "boxRow"
    }, dom.element("td", null, dom.element("div", {
      style: "display: flex;"
    }, dom.element("div", {
      style: "display: inline-block; flex: 1;"
    }, " ", col, " ")))));

    function fixStyling(sidebar, forms, menu) {
      let pageContent = dom.$('#pageContent'); // Hide containers that will have it's links moved to the sidebar

      menu.style.display = 'none';
      forms.forEach(e => e.closest('.sidebox').style.display = 'none'); // Fix alignment issues

      sidebar.style.marginTop = 0;
      pageContent.style.paddingTop = 0;
    } // Move the "favourite problem" star to after the contest name


    function moveStar() {
      let star = dom.$('.toggle-favourite', sidebar),
          starRow = star && star.closest('tr');
      if (!star) return;
      star.style.height = "14px";
      dom.$('tr a', sidebar).appendChild(star);
      starRow.remove();
    }

    let installed = false;
    const install$2 = env$1.ready(function () {
      if (!get('sidebarBox')) return;
      let sidebar = dom.$('#sidebar'),
          rtable = dom.$('#sidebar>:first-child .rtable'),
          box = dom.$('.sidebox .rtable tbody', sidebar),
          forms = [].slice.call(dom.$$('.sidebox form', sidebar)),
          menu = dom.$('.second-level-menu'),
          menuLinks = dom.$$('.second-level-menu-list li>a', menu);
      if (!sidebar || !rtable || !box || !menu) return;
      if (installed) return notifyPageNeedsRefresh(); // can't install twice

      installed = true;
      fixStyling(sidebar, forms, menu);
      let submitForm;

      if (forms.length && dom.$('.submit', forms[forms.length - 1])) {
        submitForm = forms.pop();
      }

      const addAllToBox = pipe(flatten, forEach(addToBox(box)));
      addAllToBox([menuLinks, forms]);
      if (submitForm) addToBox(box)(submitForm);
      moveStar();
    });
    function uninstall() {
      notifyPageNeedsRefresh();
    }

    function notifyPageNeedsRefresh() {
      env$1.global.Codeforces.showMessage("Please refresh the page to see changes");
    }

    var sidebar$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$2,
        uninstall: uninstall
    });

    /**
     * Inserts the "Add all" button
     */

    const installAddAll = form => {
      async function addAll() {
        let input = dom.$('.ac_input', form);
        let button = dom.$('._MashupContestEditFrame_addProblemLink');

        const add = problem => new Promise(res => {
          input.value = problem;
          button.click();

          (function tryRes() {
            if (input.value == '') return res();
            setTimeout(tryRes, 100);
          })();
        });

        const problems = input.value.split(/\s/).filter(p => p != "");

        for (let problem of problems) {
          await add(problem);
        }
      }

      const spanStyle = `border-radius: 50%; background: #959595; 
         color: white; margin-left: 0.5em;
         display: inline-block; text-align: center; width: 1em;
         cursor: pointer;`;
      let button = dom.element("div", {
        style: "text-align: center;"
      }, dom.element("input", {
        type: "submit",
        onClick: addAll,
        value: "Add all"
      }), dom.element("span", {
        style: spanStyle,
        onClick: () => env$1.global.Codeforces.showMessage(`Input multiple problem codes separated by whitespace (like "123A 123B")
                 and press "Add all" to add all of them at once`)
      }, "?"));
      form.insertAdjacentElement('afterend', button);
    };
    /**
     * Sets up tag spoilers in mashup pages and adds the "Toggle tag spoilers"
     * button
     */


    const installMashupTagSpoilers = form => {
      const frame = dom.$('._MashupContestEditFrame_frame');

      const updateDOM = () => {
        if (get('mashupSpoilers')) frame.classList.add('spoilered-mashup');else frame.classList.remove('spoilered-mashup');
      };

      const toggleSpoilers = () => {
        toggle('mashupSpoilers');
        updateDOM();
      };

      let button = dom.element("div", {
        style: "text-align: center; margin-bottom: 1rem;"
      }, dom.element("input", {
        type: "submit",
        onClick: toggleSpoilers,
        value: "Toggle tag spoilers"
      }));
      form.insertAdjacentElement('afterend', button);
      updateDOM();
    };

    const install$1 = env$1.ready(function () {
      const form = dom.$('._MashupContestEditFrame_addProblem');
      if (!form) return;
      installAddAll(form);
      installMashupTagSpoilers(form);
    });

    var mashup = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install$1
    });

    const install = env$1.ready(function () {
      if (/\/problem\//i.test(location.href)) {
        let problemTitle = dom.$('.title');
        if (problemTitle && problemTitle.textContent) document.title = problemTitle.textContent;
      }
    });

    var change_page_title = /*#__PURE__*/Object.freeze({
        __proto__: null,
        install: install
    });

    profile(run);

    async function run() {
      console.log("Codeforces++ is running!");
      load();
      createUI();
      let modules = [[style, 'style'], [dark_theme, 'darkTheme'], [show_tags, 'showTags'], [problemset, 'showTags'], [search_button, 'searchBtn'], [show_tutorial, ''], [navbar, ''], [redirector, ''], [update_standings, 'standingsItv'], [twin_standings, 'standingsTwin'], [verdict_test_number, 'hideTestNumber'], [shortcuts, ''], [sidebar$1, 'sidebarBox'], [mashup, ''], [change_page_title, '']]; // It works until you need to change the load order

      let moduleNames = ['style', 'dark_theme', 'show_tags', 'problemset', 'search_button', 'show_tutorial', 'navbar', 'redirector', 'update_standings', 'twin_standings', 'verdict_test', 'shortcuts', 'sidebar', 'mashup', 'change_page_title'];

      function registerConfigCallback(m, id) {
        listen(id, value => {
          if (value === true || value === false) {
            value ? m.install() : (m.uninstall || nop)();
          } else {
            (m.uninstall || nop)();
            m.install(value);
          }
        });
      }

      modules.forEach(([m, configID], index) => {
        tryCatch(m.install, e => console.log(`Error installing module #${moduleNames[index]}:`, e))();

        if (configID) {
          registerConfigCallback(m, configID);
        }
      });
      common();
      updateGroups();
      env$1.run_when_ready(function () {
        const v = get('version');

        if (v != env$1.version) {
          set('version', env$1.version);
          env$1.global.Codeforces.showMessage(`Codeforces++ was updated to version ${env$1.version}!
            Read the <a href="https://github.com/LeoRiether/CodeforcesPP/releases/latest" style="text-decoration:underline !important;color:white;">
            changelog</a>`);
        }
      });
    }

})();

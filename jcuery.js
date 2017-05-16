/* jshint -W116 */
var j = function(sel, ctx) {
  if (!(this instanceof j)) return new j(sel, ctx);
  if (sel instanceof j) return sel;
  if (typeof sel === 'string') {
    console.log(this);
    sel = this.select(sel, ctx);
  }
  if (sel && sel.nodeName) sel = [sel];
  this.nodes = this.slice(sel);
};

extend(j, {
  nodes: [],
  extend: function() {
    /* jshint -W073 */
    let options, name, src, copy, copyIsArray, clone,
      target = arguments[0] || {},
      i = 1,
      length = arguments.length,
      deep = false;
    if (typeof target === 'boolean') {
      deep = target;
      target = arguments[i] || {};
      i++;
    }
    if (typeof target !== 'object' && !j.isFunction(target)) target = {};
    if (i === length) {
      target = this;
      i--;
    }
    for (; i < length; i++) {
      if ((options = arguments[i]) != null) {
        for (name in options) {
          if (options[name]) {
            src = target[name];
            copy = options[name];
            if (target === copy) {
              continue;
            }
            if (deep && copy && (j.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
              if (copyIsArray) {
                copyIsArray = false;
                clone = src && Array.isArray(src) ? src : [];
              } else clone = src && j.isPlainObject(src) ? src : {};
              target[name] = j.extend(deep, clone, copy);
            } else if (copy !== undefined) {
              target[name] = copy;
            }
          }
        }
      }
    }
    /* jshint +W073 */
    return target;
  },
  addClass: () => {
    return this.eacharg(arguments, (el, name) => {
      el.classList.add(name);
    });
  },
  adjacent: (html, data, callback) => {
    if (typeof data === 'number') {
      if (data === 0) {
        data = [];
      } else {
        data = new Array(data).join().split(',').map(Number.call, Number);
      }
    }
    return this.each((node, j) => {
      let fragment = document.createDocumentFragment();
      j(data || {}).map((el, i) => {
        let part = (typeof html === 'function') ? html.call(this, el, i, node, j) :
          html;
        return typeof part === 'string' ? j.generate(part) : j(part);
      }).each((n) => {
        fragment.appendChild(this.isInPage(n) ? j(n).clone().first() : n);
      });
      callback.call(this, node, fragment);
    });
  },
  after: (html, data) => {
    return this.adjacent(html, data, (node, fragment) => {
      node.parentNode.insertBefore(fragment, node.nextSibling);
    });
  },
  ajax: (done, before) => {
    return this.handle('submit', e => {
      ajax(
        j(this).attr('action'), {
          body: j(this).serialize(),
          method: j(this).attr('method')
        },
        done && done.bind(this),
        before && before.bind(this)
      );
    });
  },
  append: (html, data) => {
    return this.adjacent(html, data, (node, fragment) => {
      node.appendChild(fragment);
    });
  },
  args: (args, node, i) => {
    args = typeof args === 'function' ? args(node, i) : typeof args !== 'string' ? this.slice(args).map(
      this.str(node, i)) : args;
    return args.toString().split(/[\s,]+/).filter(e => {
      return e.length;
    });
  },
  array: callback => {
    callback = callback;
    return this.nodes.reduce((list, node, i) => {
      let v;
      if (callback) {
        v = callback.call(this, node, i);
        v = !v ? false : (typeof v === 'string') ? j(v) : (v instanceof j) ? v.nodes : v;
      } else v = node.innerHTML;
      return list.concat(v !== false ? v : []);
    }, []);
  },
  attr: (name, value, data) => {
    data = data ? 'data-' : '';
    if (value !== undefined) {
      let nm = name;
      name = {};
      name[nm] = value;
    }
    return typeof name === 'object' ?
      this.each((node) => {
        for (let key in name) {
          if (name[key]) node.setAttribute(data + key, name[key]);
        }
      }) : this.length ? this.first().getAttribute(data + name) : '';
  },
  before: (html, data) => {
    return this.adjacent(html, data, (node, fragment) => {
      node.parentNode.insertBefore(fragment, node);
    });
  },
  children: selector => {
    return this.map((node) => {
      return this.slice(node.children);
    }).filter(selector);
  },
  clone: () => {
    return this.map((node, i) => {
      let clone = node.cloneNode(true);
      let dest = this.getAll(clone);
      this.getAll(node).each((src, i) => {
        for (let key in this.mirror) {
          if (this.mirror[key]) this.mirror[key](src, dest.nodes[i]);
        }
      });
      return clone;
    });
  },
  getAll: (context) => {
    return j([context].concat(j('*', context).nodes));
  },
  mirror: {
    events: (src, dest) => {
      function fn(dest, type) {
        return function(event) {
          j(dest).on(type, event);
        };
      }
      if (!src._e) return;
      for (let type in src._e) {
        if (src._e[type]) src._e[type].forEach(fn);
      }
    },
    select: (src, dest) => {
      if (j(src).is('select')) {
        dest.value = src.value;
      }
    },
    textarea: (src, dest) => {
      if (j(src).is('textarea')) {
        dest.value = src.value;
      }
    }
  },
  closest: selector => {
    return this.map(node => {
      do {
        if (j(node).is(selector)) {
          return node;
        }
      } while ((node = node.parentNode) && node !== document);
    });
  },
  data: (name, value) => {
    return this.attr(name, value, true);
  },
  each: callback => {
    this.nodes.forEach(callback.bind(this));

    return this;
  },
  eacharg: (args, callback) => {
    return this.each((node, i) => {
      this.args(args, node, i).forEach((arg) => {
        callback.call(this, node, arg);
      }, this);
    });
  },
  empty: () => {
    return this.each((node) => {
      while (node.firstChild) node.removeChild(node.firstChild);
    });
  },
  filter: selector => {
    let callback = (node) => {
      node.matches = node.matches || node.msMatchesSelector || node.webkitMatchesSelector;
      return node.matches(selector || '*');
    };
    callback = typeof selector === 'function' ?
      selector : (selector instanceof j) ? (node) => {
        return (selector.nodes).indexOf(node) !== -1;
      } : callback;
    return j(this.nodes.filter(callback));
  },
  find: selector => {
    return this.map((node) => {
      return j(selector || '*', node);
    });
  },
  first: () => {
    return this.nodes[0] || false;
  },
  generate: html => {
    if (/^\s*<t(h|r|d)/.test(html)) return j(document.createElement('table')).html(html).children().nodes;
    else if (/^\s*</.test(html)) return j(document.createElement('div')).html(html).children().nodes;
    else return document.createTextNode(html);
  },
  handle: () => {
    let args = this.slice(arguments).map(arg => {
      if (typeof arg === 'function') {
        return (e) => {
          e.preventDefault();
          arg.apply(this, arguments);
        };
      }
      return arg;
    }, this);

    return this.on.apply(this, args);
  },
  hasClass: () => {
    return this.is('.' + this.args(arguments).join('.'));
  },
  html: txt => {
    if (txt === undefined) {
      return this.first().innerHTML || '';
    }
    return this.each((node) => {
      node.innerHTML = txt;
    });
  },
  is: sel => {
    return this.filter(sel).length > 0;
  },
  isInPage: node => {
    return (node === document.body) ? false : document.body.contains(node);
  },
  last: () => {
    return this.nodes[this.length - 1] || false;
  },
  map: callback => {
    return callback ? j(this.array(callback)).unique() : this;
  },
  not: filter => {
    return this.filter((node) => {
      return !j(node).is(filter || true);
    });
  },
  off: ev => {
    return this.eacharg(ev, (node, event) => {
      j(node._e ? node._e[event] : []).each((cb) => {
        node.removeEventListener(event, cb);
      });
    });
  },
  on: (ev, cb, cb2) => {
    if (typeof cb === 'string') {
      let sel = cb;
      cb = (e) => {
        let args = arguments;
        j(e.currentTarget).find(sel).each(target => {
          if (target === e.target || target.contains(e.target)) {
            try {
              Object.defineProperty(e, 'currentTarget', {
                get: () => {
                  return target;
                }
              });
            } catch (err) {}
            cb2.apply(target, args);
          }
        });
      };
    }
    let callback = (e) => {
      return cb.apply(this, [e].concat(e.detail || []));
    };
    return this.eacharg(ev, (node, e) => {
      node.addEventListener(event, callback);
      node._e = node._e || {};
      node._e[e] = node._e[e] || [];
      node._e[e].push(callback);
    });
  },
  param: obj => {
    function ev(key) {
      return this.uri(key) + '=' + this.uri(obj[key]);
    }
    return Object.keys(obj).map(ev.bind(this)).join('&');
  },
  parent: sel => {
    return this.map(node => {
      return node.parentNode;
    }).filter(sel);
  },
  prepend: (html, data) => {
    return this.adjacent(html, data, (node, fragment) => {
      node.insertBefore(fragment, node.firstChild);
    });
  },
  remove: () => {
    return this.each((node) => {
      node.parentNode.removeChild(node);
    });
  },
  removeClass: () => {
    return this.eacharg(arguments, (el, name) => {
      el.classList.remove(name);
    });
  },
  replace: (html, data) => {
    let nodes = [];
    this.adjacent(html, data, (node, fragment) => {
      nodes = nodes.concat(this.slice(fragment.children));
      node.parentNode.replaceChild(fragment, node);
    });
    return j(nodes);
  },
  scroll: () => {
    this.first().scrollIntoView({
      behavior: 'smooth'
    });
    return this;
  },
  select: (parameter, context) => {
    parameter = parameter.replace(/^\s*/, '').replace(/\s*$/, '');
    if (context) return j.select.byCss(parameter, context);
    for (let key in j.selectors) {
      if (j.selectors[key]) {
        context = key.split('/');
        if ((new RegExp(context[1], context[2])).test(parameter)) {
          return j.selectors[key](parameter);
        }
      }
    }
  },
  selectors: {
    [/^\.[\w\-]+$/]: par => {
      return document.getElementsByClassName(par.substring(1));
    },
    [/^\w+$/]: par => {
      return document.getElementsByTagName(par);
    },
    [/^\#[\w\-]+$/]: par => {
      return document.getElementById(par.substring(1));
    },
    [/^</]: par => {
      return j().generate(par);
    }
  },
  serialize: () => {
    return this.slice(this.first().elements).reduce((query, el) => {
      if ((!el.name || el.disabled || el.type === 'file') || (/(checkbox|radio)/.test(el.type) &&
          !el.checked)) return query;
      if (el.type === 'select-multiple') {
        j(el.options).each((opt) => {
          if (opt.selected) query += '&' + this.uri(el.name) + '=' + this.uri(opt.value);
        });
        return query;
      }
      return query + '&' + this.uri(el.name) + '=' + this.uri(el.value);
    }, '').slice(1);
  },
  siblings: selector => {
    return this.parent().children(selector).not(this);
  },
  size: () => {
    return this.first().getBoundingClientRect();
  },
  slice: ps => {
    return (!ps || ps.length === 0 || typeof ps === 'string' || ps.toString() === '[object Function]') ? [] :
      ps.length ? [].slice.call(ps.nodes || ps) : [ps];
  },
  str: (node, i) => {
    return (arg) => {
      if (typeof arg === 'function') {
        return arg.call(this, node, i);
      }
      return arg.toString();
    };
  },
  text: text => {
    return (text === undefined) ? this.first().textContent || '' : this.each((node) => {
      node.textContent = text;
    });
  },
  toggleClass: (classes, addOrRemove) => {
    /* jshint -W018 */
    if (!!addOrRemove === addOrRemove) {
      return this[addOrRemove ? 'addClass' : 'removeClass'](classes);
    }
    /* jshint +W018 */
    return this.eacharg(classes, (el, name) => {
      el.classList.toggle(name);
    });
  },
  trigger: events => {
    let data = this.slice(arguments).slice(1);
    return this.eacharg(events, (node, event) => {
      let ev,
        opts = {
          bubbles: true,
          cancelable: true,
          detail: data
        };
      try {
        ev = new window.CustomEvent(event, opts);
      } catch (e) {
        ev = document.createEvent('CustomEvent');
        ev.initCustomEvent(event, true, true, data);
      }
      node.dispatchEvent(ev);
    });
  },
  unique: () => {
    return j(this.nodes.reduce((clean, node) => {
      let istruthy = node !== null && node !== undefined && node !== false;
      return (istruthy && clean.indexOf(node) === -1) ? clean.concat(node) : clean;
    }, []));
  },
  uri: str => {
    return encodeURIComponent(str).replace(/!/g, '%21')
      .replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(
        /%20/g, '+');
  },
  wrap: selector => {
    function findDeepestNode(node) {
      while (node.firstElementChild) node = node.firstElementChild;
      return j(node);
    }
    return this.map(node => {
      return j(selector).each(n => {
        findDeepestNode(n).append(node.cloneNode(true));
        node.parentNode.replaceChild(n, node);
      });
    });
  },
  isFunction: (f) => {
    return typeof f === 'function';
  },
  Deferred: (func) => {
    let tuples = [
        ['notify', 'progress', this.Callbacks('memory'),
          this.Callbacks('memory'), 2
        ],
        ['resolve', 'done', this.Callbacks('once memory'),
          this.Callbacks('once memory'), 0, 'resolved'
        ],
        ['reject', 'fail', this.Callbacks('once memory'),
          this.Callbacks('once memory'), 1, 'rejected'
        ]
      ],
      state = 'pending',
      promise = {
        state: () => {
          return state;
        },
        always: () => {
          deferred.done(arguments).fail(arguments);
          return this;
        },
        catch: fn => {
          return promise.then(null, fn);
        },
        pipe: () => {
          var fns = arguments;
          return this.Deferred(function(newDefer) {
            this.each(tuples, function(i, tuple) {
              let fn = this.isFunction(fns[tuple[4]]) && fns[tuple[4]];
              deferred[tuple[1]](function() {
                var returned = fn && fn.apply(this, arguments);
                if (returned && this.isFunction(returned.promise)) {
                  returned.promise().progress(newDefer.notify).done(newDefer.resolve).fail(newDefer
                    .reject);
                } else {
                  newDefer[tuple[0] + 'With'](this, fn ? [returned] : arguments);
                }
              });
            });
            fns = null;
          }).promise();
        },
        then: (onFulfilled, onRejected, onProgress) => {
          let maxDepth = 0;

          function resolve(depth, deferred, handler, special) {
            return function() {
              let that = this,
                args = arguments,
                mightThrow = () => {
                  let returned, then;
                  if (depth < maxDepth) return;
                  returned = handler.apply(that, args);
                  if (returned === deferred.promise()) throw new TypeError('Thenable self-resolution');
                  then = returned && (typeof returned === 'object' || typeof returned === 'function') &&
                    returned.then;
                  if (this.isFunction(then)) {
                    if (special) then.call(returned, resolve(maxDepth, deferred, Identity, special),
                      resolve(maxDepth, deferred, Thrower, special));
                    else {
                      maxDepth++;
                      then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth,
                        deferred, Thrower, special), resolve(maxDepth, deferred, Identity, deferred.notifyWith));
                    }
                  } else {
                    if (handler !== Identity) {
                      that = undefined;
                      args = [returned];
                    }
                    (special || deferred.resolveWith)(that, args);
                  }
                },
                process = special ? mightThrow : function() {
                  try { mightThrow(); } catch (e) {
                    if (this.Deferred
                      .exceptionHook) { this.Deferred.exceptionHook(e, process.stackTrace); }
                    if (depth + 1 >=
                      maxDepth) {
                      if (handler !== Thrower) {
                        that = undefined;
                        args = [e];
                      }
                      deferred.rejectWith(that, args);
                    }
                  }
                };
              if (depth) process();
              else {
                if (this.Deferred.getStackHook) process.stackTrace = this.Deferred.getStackHook();
                window.setTimeout(process);
              }
            };
          }
          return this.Deferred(function(newDefer) {
            tuples[0][3].add(resolve(0, newDefer, this.isFunction(onProgress) ? onProgress : Identity,
              newDefer.notifyWith));
            tuples[1][3].add(resolve(0, newDefer, this.isFunction(onFulfilled) ? onFulfilled : Identity));
            tuples[2][3].add(resolve(0, newDefer, this.isFunction(onRejected) ? onRejected : Thrower));
          }).promise();
        },
        promise: function(obj) {
          return obj != null ? this.extend(obj, promise) : promise;
        }
      },
      deferred = {};
    this.each(tuples, (i, tuple) => {
      let list = tuple[2],
        stateString = tuple[5];
      promise[tuple[1]] = list.add;
      if (stateString) list.add(function() { state = stateString; }, tuples[3 - i][2].disable, tuples[0][2].lock);
      list.add(tuple[3].fire);
      deferred[tuple[0]] = function() {
        deferred[tuple[0] + 'With'](this === deferred ? undefined : this, arguments);
        return this;
      };
      deferred[tuple[0] + 'With'] = list.fireWith;
    });
    promise.promise(deferred);
    if (func) func.call(deferred, deferred);
    return deferred;
  },

  when: function(singleValue) {
    let remaining = arguments.length,
      i = remaining,
      resolveContexts = Array(i),
      resolveValues = [].slice.call(arguments),
      master = this.Deferred(),
      updateFunc = function(i) {
        return function(value) {
          resolveContexts[i] = this;
          resolveValues[i] = arguments.length > 1 ? [].slice.call(arguments) : value;
          if (!(--remaining)) {
            master.resolveWith(resolveContexts, resolveValues);
          }
        };
      };
    if (remaining <= 1) {
      adoptValue(singleValue, master.done(updateFunc(i)).resolve, master.reject, !remaining);
      if (master.state() === 'pending' || this.isFunction(resolveValues[i] && resolveValues[i].then)) return master
        .then();
    }
    while (i--) adoptValue(resolveValues[i], updateFunc(i), master.reject);
    return master.promise();
  }
});

/* eslint-disable no-unused-vars*/
function ajax(action, opt, done = function() {}, before = undefined) {
  let request;
  opt = {
    body: opt.body || {},
    method: (opt.method || 'GET').toUpperCase(),
    headers: opt.headers || {}
  };
  opt.headers['X-Requested-With'] = opt.headers['X-Requested-With'] || 'XMLHttpRequest';
  if (typeof window.FormData === 'undefined' || !(opt.body instanceof window.FormData))
    opt.headers['Content-Type'] = opt.headers['Content-Type'] || 'application/x-www-form-urlencoded';
  if (/json/.test(opt.headers['Content-Type']))
    opt.body = JSON.stringify(opt.body);
  if ((typeof opt.body === 'object') && !(opt.body instanceof window.FormData))
    opt.body = j().param(opt.body);
  request = new window.XMLHttpRequest();
  j(request).on('error timeout abort', () => {
    done(new Error(), null, request);
  }).on('load', () => {
    return done(/^(4|5)/.test(request.status) ? new Error(request.status) : null,
      parseJson(request.response) || request.response, request);
  });
  request.open(opt.method, action);
  for (let name in opt.headers) {
    if (opt.headers[name])
      request.setRequestHeader(name, opt.headers[name]);
  }
  if (before) before(request);
  request.send(opt.body);
  return request;
}

function parseJson(jsonString) {
  try {
    let o = JSON.parse(jsonString);
    if (o && typeof o === 'object') {
      return o;
    }
  } catch (e) {}
  return false;
}

function win(obj) { return obj != null && obj == obj.window; }

function objt(obj) { return typeof obj === 'object'; }

function plain(obj) {
  return objt(obj) && !win(obj) && Object.getPrototypeOf(obj) == Object.prototype;
}

function extend(target, source, deep) {
  let arry = Array.isArray ||
    function(object) { return object instanceof Array; };
  for (let key in source) {
    if (deep && (plain(source[key]) || arry(source[key]))) {
      if (plain(source[key]) && !plain(target[key])) target[key] = {};
      if (arry(source[key]) && !arry(target[key])) target[key] = [];
      extend(target[key], source[key], deep);
    } else if (source[key] !== undefined) target[key] = source[key];
  }
}

function adoptValue(value, resolve, reject, noValue) {
  let method;
  try {
    if (value && this.isFunction((method = value.promise))) method.call(value).done(resolve).fail(reject);
    else if (value && this.isFunction((method = value.then))) method.call(value, resolve, reject);
    else resolve.apply(undefined, [value].slice(noValue));
  } catch (value) {
    reject.apply(undefined, [value]);
  }
}

function Identity(v) {
  return v;
}

function Thrower(ex) {
  throw ex;
}
/* eslint-enable no-unused-vars*/

export default j;

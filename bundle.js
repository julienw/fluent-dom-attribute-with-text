(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // node_modules/@fluent/bundle/esm/types.js
  var FluentType, FluentNone, FluentNumber, FluentDateTime;
  var init_types = __esm({
    "node_modules/@fluent/bundle/esm/types.js"() {
      FluentType = class {
        /**
         * Create a `FluentType` instance.
         *
         * @param value The JavaScript value to wrap.
         */
        constructor(value) {
          this.value = value;
        }
        /**
         * Unwrap the raw value stored by this `FluentType`.
         */
        valueOf() {
          return this.value;
        }
      };
      FluentNone = class extends FluentType {
        /**
         * Create an instance of `FluentNone` with an optional fallback value.
         * @param value The fallback value of this `FluentNone`.
         */
        constructor(value = "???") {
          super(value);
        }
        /**
         * Format this `FluentNone` to the fallback string.
         */
        toString(scope) {
          return `{${this.value}}`;
        }
      };
      FluentNumber = class extends FluentType {
        /**
         * Create an instance of `FluentNumber` with options to the
         * `Intl.NumberFormat` constructor.
         *
         * @param value The number value of this `FluentNumber`.
         * @param opts Options which will be passed to `Intl.NumberFormat`.
         */
        constructor(value, opts = {}) {
          super(value);
          this.opts = opts;
        }
        /**
         * Format this `FluentNumber` to a string.
         */
        toString(scope) {
          if (scope) {
            try {
              const nf = scope.memoizeIntlObject(Intl.NumberFormat, this.opts);
              return nf.format(this.value);
            } catch (err) {
              scope.reportError(err);
            }
          }
          return this.value.toString(10);
        }
      };
      FluentDateTime = class _FluentDateTime extends FluentType {
        static supportsValue(value) {
          if (typeof value === "number")
            return true;
          if (value instanceof Date)
            return true;
          if (value instanceof FluentType)
            return _FluentDateTime.supportsValue(value.valueOf());
          if ("Temporal" in globalThis) {
            const _Temporal = globalThis.Temporal;
            if (value instanceof _Temporal.Instant || value instanceof _Temporal.PlainDateTime || value instanceof _Temporal.PlainDate || value instanceof _Temporal.PlainMonthDay || value instanceof _Temporal.PlainTime || value instanceof _Temporal.PlainYearMonth) {
              return true;
            }
          }
          return false;
        }
        /**
         * Create an instance of `FluentDateTime` with options to the
         * `Intl.DateTimeFormat` constructor.
         *
         * @param value The number value of this `FluentDateTime`, in milliseconds.
         * @param opts Options which will be passed to `Intl.DateTimeFormat`.
         */
        constructor(value, opts = {}) {
          if (value instanceof _FluentDateTime) {
            opts = { ...value.opts, ...opts };
            value = value.value;
          } else if (value instanceof FluentType) {
            value = value.valueOf();
          }
          if (typeof value === "object" && "calendarId" in value && opts.calendar === void 0) {
            opts = { ...opts, calendar: value.calendarId };
          }
          super(value);
          this.opts = opts;
        }
        [Symbol.toPrimitive](hint) {
          return hint === "string" ? this.toString() : this.toNumber();
        }
        /**
         * Convert this `FluentDateTime` to a number.
         * Note that this isn't always possible due to the nature of Temporal objects.
         * In such cases, a TypeError will be thrown.
         */
        toNumber() {
          const value = this.value;
          if (typeof value === "number")
            return value;
          if (value instanceof Date)
            return value.getTime();
          if ("epochMilliseconds" in value) {
            return value.epochMilliseconds;
          }
          if ("toZonedDateTime" in value) {
            return value.toZonedDateTime("UTC").epochMilliseconds;
          }
          throw new TypeError("Unwrapping a non-number value as a number");
        }
        /**
         * Format this `FluentDateTime` to a string.
         */
        toString(scope) {
          if (scope) {
            try {
              const dtf = scope.memoizeIntlObject(Intl.DateTimeFormat, this.opts);
              return dtf.format(this.value);
            } catch (err) {
              scope.reportError(err);
            }
          }
          if (typeof this.value === "number" || this.value instanceof Date) {
            return new Date(this.value).toISOString();
          }
          return this.value.toString();
        }
      };
    }
  });

  // node_modules/@fluent/bundle/esm/resolver.js
  function match(scope, selector, key) {
    if (key === selector) {
      return true;
    }
    if (key instanceof FluentNumber && selector instanceof FluentNumber && key.value === selector.value) {
      return true;
    }
    if (selector instanceof FluentNumber && typeof key === "string") {
      let category = scope.memoizeIntlObject(Intl.PluralRules, selector.opts).select(selector.value);
      if (key === category) {
        return true;
      }
    }
    return false;
  }
  function getDefault(scope, variants, star) {
    if (variants[star]) {
      return resolvePattern(scope, variants[star].value);
    }
    scope.reportError(new RangeError("No default"));
    return new FluentNone();
  }
  function getArguments(scope, args) {
    const positional = [];
    const named = /* @__PURE__ */ Object.create(null);
    for (const arg of args) {
      if (arg.type === "narg") {
        named[arg.name] = resolveExpression(scope, arg.value);
      } else {
        positional.push(resolveExpression(scope, arg));
      }
    }
    return { positional, named };
  }
  function resolveExpression(scope, expr) {
    switch (expr.type) {
      case "str":
        return expr.value;
      case "num":
        return new FluentNumber(expr.value, {
          minimumFractionDigits: expr.precision
        });
      case "var":
        return resolveVariableReference(scope, expr);
      case "mesg":
        return resolveMessageReference(scope, expr);
      case "term":
        return resolveTermReference(scope, expr);
      case "func":
        return resolveFunctionReference(scope, expr);
      case "select":
        return resolveSelectExpression(scope, expr);
      default:
        return new FluentNone();
    }
  }
  function resolveVariableReference(scope, { name }) {
    let arg;
    if (scope.params) {
      if (Object.prototype.hasOwnProperty.call(scope.params, name)) {
        arg = scope.params[name];
      } else {
        return new FluentNone(`$${name}`);
      }
    } else if (scope.args && Object.prototype.hasOwnProperty.call(scope.args, name)) {
      arg = scope.args[name];
    } else {
      scope.reportError(new ReferenceError(`Unknown variable: $${name}`));
      return new FluentNone(`$${name}`);
    }
    if (arg instanceof FluentType) {
      return arg;
    }
    switch (typeof arg) {
      case "string":
        return arg;
      case "number":
        return new FluentNumber(arg);
      case "object":
        if (FluentDateTime.supportsValue(arg)) {
          return new FluentDateTime(arg);
        }
      // eslint-disable-next-line no-fallthrough
      default:
        scope.reportError(new TypeError(`Variable type not supported: $${name}, ${typeof arg}`));
        return new FluentNone(`$${name}`);
    }
  }
  function resolveMessageReference(scope, { name, attr }) {
    const message = scope.bundle._messages.get(name);
    if (!message) {
      scope.reportError(new ReferenceError(`Unknown message: ${name}`));
      return new FluentNone(name);
    }
    if (attr) {
      const attribute = message.attributes[attr];
      if (attribute) {
        return resolvePattern(scope, attribute);
      }
      scope.reportError(new ReferenceError(`Unknown attribute: ${attr}`));
      return new FluentNone(`${name}.${attr}`);
    }
    if (message.value) {
      return resolvePattern(scope, message.value);
    }
    scope.reportError(new ReferenceError(`No value: ${name}`));
    return new FluentNone(name);
  }
  function resolveTermReference(scope, { name, attr, args }) {
    const id = `-${name}`;
    const term = scope.bundle._terms.get(id);
    if (!term) {
      scope.reportError(new ReferenceError(`Unknown term: ${id}`));
      return new FluentNone(id);
    }
    if (attr) {
      const attribute = term.attributes[attr];
      if (attribute) {
        scope.params = getArguments(scope, args).named;
        const resolved2 = resolvePattern(scope, attribute);
        scope.params = null;
        return resolved2;
      }
      scope.reportError(new ReferenceError(`Unknown attribute: ${attr}`));
      return new FluentNone(`${id}.${attr}`);
    }
    scope.params = getArguments(scope, args).named;
    const resolved = resolvePattern(scope, term.value);
    scope.params = null;
    return resolved;
  }
  function resolveFunctionReference(scope, { name, args }) {
    let func = scope.bundle._functions[name];
    if (!func) {
      scope.reportError(new ReferenceError(`Unknown function: ${name}()`));
      return new FluentNone(`${name}()`);
    }
    if (typeof func !== "function") {
      scope.reportError(new TypeError(`Function ${name}() is not callable`));
      return new FluentNone(`${name}()`);
    }
    try {
      let resolved = getArguments(scope, args);
      return func(resolved.positional, resolved.named);
    } catch (err) {
      scope.reportError(err);
      return new FluentNone(`${name}()`);
    }
  }
  function resolveSelectExpression(scope, { selector, variants, star }) {
    let sel = resolveExpression(scope, selector);
    if (sel instanceof FluentNone) {
      return getDefault(scope, variants, star);
    }
    for (const variant of variants) {
      const key = resolveExpression(scope, variant.key);
      if (match(scope, sel, key)) {
        return resolvePattern(scope, variant.value);
      }
    }
    return getDefault(scope, variants, star);
  }
  function resolveComplexPattern(scope, ptn) {
    if (scope.dirty.has(ptn)) {
      scope.reportError(new RangeError("Cyclic reference"));
      return new FluentNone();
    }
    scope.dirty.add(ptn);
    const result = [];
    const useIsolating = scope.bundle._useIsolating && ptn.length > 1;
    for (const elem of ptn) {
      if (typeof elem === "string") {
        result.push(scope.bundle._transform(elem));
        continue;
      }
      scope.placeables++;
      if (scope.placeables > MAX_PLACEABLES) {
        scope.dirty.delete(ptn);
        throw new RangeError(`Too many placeables expanded: ${scope.placeables}, max allowed is ${MAX_PLACEABLES}`);
      }
      if (useIsolating) {
        result.push(FSI);
      }
      result.push(resolveExpression(scope, elem).toString(scope));
      if (useIsolating) {
        result.push(PDI);
      }
    }
    scope.dirty.delete(ptn);
    return result.join("");
  }
  function resolvePattern(scope, value) {
    if (typeof value === "string") {
      return scope.bundle._transform(value);
    }
    return resolveComplexPattern(scope, value);
  }
  var MAX_PLACEABLES, FSI, PDI;
  var init_resolver = __esm({
    "node_modules/@fluent/bundle/esm/resolver.js"() {
      init_types();
      MAX_PLACEABLES = 100;
      FSI = "\u2068";
      PDI = "\u2069";
    }
  });

  // node_modules/@fluent/bundle/esm/scope.js
  var Scope;
  var init_scope = __esm({
    "node_modules/@fluent/bundle/esm/scope.js"() {
      Scope = class {
        constructor(bundle, errors, args) {
          this.dirty = /* @__PURE__ */ new WeakSet();
          this.params = null;
          this.placeables = 0;
          this.bundle = bundle;
          this.errors = errors;
          this.args = args;
        }
        reportError(error) {
          if (!this.errors || !(error instanceof Error)) {
            throw error;
          }
          this.errors.push(error);
        }
        memoizeIntlObject(ctor, opts) {
          let cache2 = this.bundle._intls.get(ctor);
          if (!cache2) {
            cache2 = {};
            this.bundle._intls.set(ctor, cache2);
          }
          let id = JSON.stringify(opts);
          if (!cache2[id]) {
            cache2[id] = new ctor(this.bundle.locales, opts);
          }
          return cache2[id];
        }
      };
    }
  });

  // node_modules/@fluent/bundle/esm/builtins.js
  function values(opts, allowed) {
    const unwrapped = /* @__PURE__ */ Object.create(null);
    for (const [name, opt] of Object.entries(opts)) {
      if (allowed.includes(name)) {
        unwrapped[name] = opt.valueOf();
      }
    }
    return unwrapped;
  }
  function NUMBER(args, opts) {
    let arg = args[0];
    if (arg instanceof FluentNone) {
      return new FluentNone(`NUMBER(${arg.valueOf()})`);
    }
    if (arg instanceof FluentNumber) {
      return new FluentNumber(arg.valueOf(), {
        ...arg.opts,
        ...values(opts, NUMBER_ALLOWED)
      });
    }
    if (arg instanceof FluentDateTime) {
      return new FluentNumber(arg.toNumber(), {
        ...values(opts, NUMBER_ALLOWED)
      });
    }
    throw new TypeError("Invalid argument to NUMBER");
  }
  function DATETIME(args, opts) {
    let arg = args[0];
    if (arg instanceof FluentNone) {
      return new FluentNone(`DATETIME(${arg.valueOf()})`);
    }
    if (arg instanceof FluentDateTime || arg instanceof FluentNumber) {
      return new FluentDateTime(arg, values(opts, DATETIME_ALLOWED));
    }
    throw new TypeError("Invalid argument to DATETIME");
  }
  var NUMBER_ALLOWED, DATETIME_ALLOWED;
  var init_builtins = __esm({
    "node_modules/@fluent/bundle/esm/builtins.js"() {
      init_types();
      NUMBER_ALLOWED = [
        "unitDisplay",
        "currencyDisplay",
        "useGrouping",
        "minimumIntegerDigits",
        "minimumFractionDigits",
        "maximumFractionDigits",
        "minimumSignificantDigits",
        "maximumSignificantDigits"
      ];
      DATETIME_ALLOWED = [
        "dateStyle",
        "timeStyle",
        "fractionalSecondDigits",
        "dayPeriod",
        "hour12",
        "weekday",
        "era",
        "year",
        "month",
        "day",
        "hour",
        "minute",
        "second",
        "timeZoneName"
      ];
    }
  });

  // node_modules/@fluent/bundle/esm/memoizer.js
  function getMemoizerForLocale(locales) {
    const stringLocale = Array.isArray(locales) ? locales.join(" ") : locales;
    let memoizer = cache.get(stringLocale);
    if (memoizer === void 0) {
      memoizer = /* @__PURE__ */ new Map();
      cache.set(stringLocale, memoizer);
    }
    return memoizer;
  }
  var cache;
  var init_memoizer = __esm({
    "node_modules/@fluent/bundle/esm/memoizer.js"() {
      cache = /* @__PURE__ */ new Map();
    }
  });

  // node_modules/@fluent/bundle/esm/bundle.js
  var FluentBundle;
  var init_bundle = __esm({
    "node_modules/@fluent/bundle/esm/bundle.js"() {
      init_resolver();
      init_scope();
      init_types();
      init_builtins();
      init_memoizer();
      FluentBundle = class {
        /**
         * Create an instance of `FluentBundle`.
         *
         * @example
         * ```js
         * let bundle = new FluentBundle(["en-US", "en"]);
         *
         * let bundle = new FluentBundle(locales, {useIsolating: false});
         *
         * let bundle = new FluentBundle(locales, {
         *   useIsolating: true,
         *   functions: {
         *     NODE_ENV: () => process.env.NODE_ENV
         *   }
         * });
         * ```
         *
         * @param locales - Used to instantiate `Intl` formatters used by translations.
         * @param options - Optional configuration for the bundle.
         */
        constructor(locales, { functions, useIsolating = true, transform = (v) => v } = {}) {
          this._terms = /* @__PURE__ */ new Map();
          this._messages = /* @__PURE__ */ new Map();
          this.locales = Array.isArray(locales) ? locales : [locales];
          this._functions = {
            NUMBER,
            DATETIME,
            ...functions
          };
          this._useIsolating = useIsolating;
          this._transform = transform;
          this._intls = getMemoizerForLocale(locales);
        }
        /**
         * Check if a message is present in the bundle.
         *
         * @param id - The identifier of the message to check.
         */
        hasMessage(id) {
          return this._messages.has(id);
        }
        /**
         * Return a raw unformatted message object from the bundle.
         *
         * Raw messages are `{value, attributes}` shapes containing translation units
         * called `Patterns`. `Patterns` are implementation-specific; they should be
         * treated as black boxes and formatted with `FluentBundle.formatPattern`.
         *
         * @param id - The identifier of the message to check.
         */
        getMessage(id) {
          return this._messages.get(id);
        }
        /**
         * Add a translation resource to the bundle.
         *
         * @example
         * ```js
         * let res = new FluentResource("foo = Foo");
         * bundle.addResource(res);
         * bundle.getMessage("foo");
         * // → {value: .., attributes: {..}}
         * ```
         *
         * @param res
         * @param options
         */
        addResource(res, { allowOverrides = false } = {}) {
          const errors = [];
          for (let i = 0; i < res.body.length; i++) {
            let entry = res.body[i];
            if (entry.id.startsWith("-")) {
              if (allowOverrides === false && this._terms.has(entry.id)) {
                errors.push(new Error(`Attempt to override an existing term: "${entry.id}"`));
                continue;
              }
              this._terms.set(entry.id, entry);
            } else {
              if (allowOverrides === false && this._messages.has(entry.id)) {
                errors.push(new Error(`Attempt to override an existing message: "${entry.id}"`));
                continue;
              }
              this._messages.set(entry.id, entry);
            }
          }
          return errors;
        }
        /**
         * Format a `Pattern` to a string.
         *
         * Format a raw `Pattern` into a string. `args` will be used to resolve
         * references to variables passed as arguments to the translation.
         *
         * In case of errors `formatPattern` will try to salvage as much of the
         * translation as possible and will still return a string. For performance
         * reasons, the encountered errors are not returned but instead are appended
         * to the `errors` array passed as the third argument.
         *
         * If `errors` is omitted, the first encountered error will be thrown.
         *
         * @example
         * ```js
         * let errors = [];
         * bundle.addResource(
         *     new FluentResource("hello = Hello, {$name}!"));
         *
         * let hello = bundle.getMessage("hello");
         * if (hello.value) {
         *     bundle.formatPattern(hello.value, {name: "Jane"}, errors);
         *     // Returns "Hello, Jane!" and `errors` is empty.
         *
         *     bundle.formatPattern(hello.value, undefined, errors);
         *     // Returns "Hello, {$name}!" and `errors` is now:
         *     // [<ReferenceError: Unknown variable: name>]
         * }
         * ```
         */
        formatPattern(pattern, args = null, errors = null) {
          if (typeof pattern === "string") {
            return this._transform(pattern);
          }
          let scope = new Scope(this, errors, args);
          try {
            let value = resolveComplexPattern(scope, pattern);
            return value.toString(scope);
          } catch (err) {
            if (scope.errors && err instanceof Error) {
              scope.errors.push(err);
              return new FluentNone().toString(scope);
            }
            throw err;
          }
        }
      };
    }
  });

  // node_modules/@fluent/bundle/esm/resource.js
  var RE_MESSAGE_START, RE_ATTRIBUTE_START, RE_VARIANT_START, RE_NUMBER_LITERAL, RE_IDENTIFIER, RE_REFERENCE, RE_FUNCTION_NAME, RE_TEXT_RUN, RE_STRING_RUN, RE_STRING_ESCAPE, RE_UNICODE_ESCAPE, RE_LEADING_NEWLINES, RE_TRAILING_SPACES, RE_BLANK_LINES, RE_INDENT, TOKEN_BRACE_OPEN, TOKEN_BRACE_CLOSE, TOKEN_BRACKET_OPEN, TOKEN_BRACKET_CLOSE, TOKEN_PAREN_OPEN, TOKEN_ARROW, TOKEN_COLON, TOKEN_COMMA, TOKEN_BLANK, FluentResource, Indent;
  var init_resource = __esm({
    "node_modules/@fluent/bundle/esm/resource.js"() {
      RE_MESSAGE_START = /^(-?[a-zA-Z][\w-]*) *= */gm;
      RE_ATTRIBUTE_START = /\.([a-zA-Z][\w-]*) *= */y;
      RE_VARIANT_START = /\*?\[/y;
      RE_NUMBER_LITERAL = /(-?[0-9]+(?:\.([0-9]+))?)/y;
      RE_IDENTIFIER = /([a-zA-Z][\w-]*)/y;
      RE_REFERENCE = /([$-])?([a-zA-Z][\w-]*)(?:\.([a-zA-Z][\w-]*))?/y;
      RE_FUNCTION_NAME = /^[A-Z][A-Z0-9_-]*$/;
      RE_TEXT_RUN = /([^{}\n\r]+)/y;
      RE_STRING_RUN = /([^\\"\n\r]*)/y;
      RE_STRING_ESCAPE = /\\([\\"])/y;
      RE_UNICODE_ESCAPE = /\\u([a-fA-F0-9]{4})|\\U([a-fA-F0-9]{6})/y;
      RE_LEADING_NEWLINES = /^\n+/;
      RE_TRAILING_SPACES = / +$/;
      RE_BLANK_LINES = / *\r?\n/g;
      RE_INDENT = /( *)$/;
      TOKEN_BRACE_OPEN = /{\s*/y;
      TOKEN_BRACE_CLOSE = /\s*}/y;
      TOKEN_BRACKET_OPEN = /\[\s*/y;
      TOKEN_BRACKET_CLOSE = /\s*] */y;
      TOKEN_PAREN_OPEN = /\s*\(\s*/y;
      TOKEN_ARROW = /\s*->\s*/y;
      TOKEN_COLON = /\s*:\s*/y;
      TOKEN_COMMA = /\s*,?\s*/y;
      TOKEN_BLANK = /\s+/y;
      FluentResource = class {
        constructor(source) {
          this.body = [];
          RE_MESSAGE_START.lastIndex = 0;
          let cursor = 0;
          while (true) {
            let next = RE_MESSAGE_START.exec(source);
            if (next === null) {
              break;
            }
            cursor = RE_MESSAGE_START.lastIndex;
            try {
              this.body.push(parseMessage(next[1]));
            } catch (err) {
              if (err instanceof SyntaxError) {
                continue;
              }
              throw err;
            }
          }
          function test(re) {
            re.lastIndex = cursor;
            return re.test(source);
          }
          function consumeChar(char, errorClass) {
            if (source[cursor] === char) {
              cursor++;
              return true;
            }
            if (errorClass) {
              throw new errorClass(`Expected ${char}`);
            }
            return false;
          }
          function consumeToken(re, errorClass) {
            if (test(re)) {
              cursor = re.lastIndex;
              return true;
            }
            if (errorClass) {
              throw new errorClass(`Expected ${re.toString()}`);
            }
            return false;
          }
          function match2(re) {
            re.lastIndex = cursor;
            let result = re.exec(source);
            if (result === null) {
              throw new SyntaxError(`Expected ${re.toString()}`);
            }
            cursor = re.lastIndex;
            return result;
          }
          function match1(re) {
            return match2(re)[1];
          }
          function parseMessage(id) {
            let value = parsePattern();
            let attributes = parseAttributes();
            if (value === null && Object.keys(attributes).length === 0) {
              throw new SyntaxError("Expected message value or attributes");
            }
            return { id, value, attributes };
          }
          function parseAttributes() {
            let attrs = /* @__PURE__ */ Object.create(null);
            while (test(RE_ATTRIBUTE_START)) {
              let name = match1(RE_ATTRIBUTE_START);
              let value = parsePattern();
              if (value === null) {
                throw new SyntaxError("Expected attribute value");
              }
              attrs[name] = value;
            }
            return attrs;
          }
          function parsePattern() {
            let first;
            if (test(RE_TEXT_RUN)) {
              first = match1(RE_TEXT_RUN);
            }
            if (source[cursor] === "{" || source[cursor] === "}") {
              return parsePatternElements(first ? [first] : [], Infinity);
            }
            let indent = parseIndent();
            if (indent) {
              if (first) {
                return parsePatternElements([first, indent], indent.length);
              }
              indent.value = trim(indent.value, RE_LEADING_NEWLINES);
              return parsePatternElements([indent], indent.length);
            }
            if (first) {
              return trim(first, RE_TRAILING_SPACES);
            }
            return null;
          }
          function parsePatternElements(elements = [], commonIndent) {
            while (true) {
              if (test(RE_TEXT_RUN)) {
                elements.push(match1(RE_TEXT_RUN));
                continue;
              }
              if (source[cursor] === "{") {
                elements.push(parsePlaceable());
                continue;
              }
              if (source[cursor] === "}") {
                throw new SyntaxError("Unbalanced closing brace");
              }
              let indent = parseIndent();
              if (indent) {
                elements.push(indent);
                commonIndent = Math.min(commonIndent, indent.length);
                continue;
              }
              break;
            }
            let lastIndex = elements.length - 1;
            let lastElement = elements[lastIndex];
            if (typeof lastElement === "string") {
              elements[lastIndex] = trim(lastElement, RE_TRAILING_SPACES);
            }
            let baked = [];
            for (let element of elements) {
              if (element instanceof Indent) {
                element = element.value.slice(0, element.value.length - commonIndent);
              }
              if (element) {
                baked.push(element);
              }
            }
            return baked;
          }
          function parsePlaceable() {
            consumeToken(TOKEN_BRACE_OPEN, SyntaxError);
            let selector = parseInlineExpression();
            if (consumeToken(TOKEN_BRACE_CLOSE)) {
              return selector;
            }
            if (consumeToken(TOKEN_ARROW)) {
              let variants = parseVariants();
              consumeToken(TOKEN_BRACE_CLOSE, SyntaxError);
              return {
                type: "select",
                selector,
                ...variants
              };
            }
            throw new SyntaxError("Unclosed placeable");
          }
          function parseInlineExpression() {
            if (source[cursor] === "{") {
              return parsePlaceable();
            }
            if (test(RE_REFERENCE)) {
              let [, sigil, name, attr = null] = match2(RE_REFERENCE);
              if (sigil === "$") {
                return { type: "var", name };
              }
              if (consumeToken(TOKEN_PAREN_OPEN)) {
                let args = parseArguments();
                if (sigil === "-") {
                  return { type: "term", name, attr, args };
                }
                if (RE_FUNCTION_NAME.test(name)) {
                  return { type: "func", name, args };
                }
                throw new SyntaxError("Function names must be all upper-case");
              }
              if (sigil === "-") {
                return {
                  type: "term",
                  name,
                  attr,
                  args: []
                };
              }
              return { type: "mesg", name, attr };
            }
            return parseLiteral();
          }
          function parseArguments() {
            let args = [];
            while (true) {
              switch (source[cursor]) {
                case ")":
                  cursor++;
                  return args;
                case void 0:
                  throw new SyntaxError("Unclosed argument list");
              }
              args.push(parseArgument());
              consumeToken(TOKEN_COMMA);
            }
          }
          function parseArgument() {
            let expr = parseInlineExpression();
            if (expr.type !== "mesg") {
              return expr;
            }
            if (consumeToken(TOKEN_COLON)) {
              return {
                type: "narg",
                name: expr.name,
                value: parseLiteral()
              };
            }
            return expr;
          }
          function parseVariants() {
            let variants = [];
            let count = 0;
            let star;
            while (test(RE_VARIANT_START)) {
              if (consumeChar("*")) {
                star = count;
              }
              let key = parseVariantKey();
              let value = parsePattern();
              if (value === null) {
                throw new SyntaxError("Expected variant value");
              }
              variants[count++] = { key, value };
            }
            if (count === 0) {
              return null;
            }
            if (star === void 0) {
              throw new SyntaxError("Expected default variant");
            }
            return { variants, star };
          }
          function parseVariantKey() {
            consumeToken(TOKEN_BRACKET_OPEN, SyntaxError);
            let key;
            if (test(RE_NUMBER_LITERAL)) {
              key = parseNumberLiteral();
            } else {
              key = {
                type: "str",
                value: match1(RE_IDENTIFIER)
              };
            }
            consumeToken(TOKEN_BRACKET_CLOSE, SyntaxError);
            return key;
          }
          function parseLiteral() {
            if (test(RE_NUMBER_LITERAL)) {
              return parseNumberLiteral();
            }
            if (source[cursor] === '"') {
              return parseStringLiteral();
            }
            throw new SyntaxError("Invalid expression");
          }
          function parseNumberLiteral() {
            let [, value, fraction = ""] = match2(RE_NUMBER_LITERAL);
            let precision = fraction.length;
            return {
              type: "num",
              value: parseFloat(value),
              precision
            };
          }
          function parseStringLiteral() {
            consumeChar('"', SyntaxError);
            let value = "";
            while (true) {
              value += match1(RE_STRING_RUN);
              if (source[cursor] === "\\") {
                value += parseEscapeSequence();
                continue;
              }
              if (consumeChar('"')) {
                return { type: "str", value };
              }
              throw new SyntaxError("Unclosed string literal");
            }
          }
          function parseEscapeSequence() {
            if (test(RE_STRING_ESCAPE)) {
              return match1(RE_STRING_ESCAPE);
            }
            if (test(RE_UNICODE_ESCAPE)) {
              let [, codepoint4, codepoint6] = match2(RE_UNICODE_ESCAPE);
              let codepoint = parseInt(codepoint4 || codepoint6, 16);
              return codepoint <= 55295 || 57344 <= codepoint ? (
                // It's a Unicode scalar value.
                String.fromCodePoint(codepoint)
              ) : (
                // Lonely surrogates can cause trouble when the parsing result is
                // saved using UTF-8. Use U+FFFD REPLACEMENT CHARACTER instead.
                "\uFFFD"
              );
            }
            throw new SyntaxError("Unknown escape sequence");
          }
          function parseIndent() {
            let start = cursor;
            consumeToken(TOKEN_BLANK);
            switch (source[cursor]) {
              case ".":
              case "[":
              case "*":
              case "}":
              case void 0:
                return false;
              case "{":
                return makeIndent(source.slice(start, cursor));
            }
            if (source[cursor - 1] === " ") {
              return makeIndent(source.slice(start, cursor));
            }
            return false;
          }
          function trim(text, re) {
            return text.replace(re, "");
          }
          function makeIndent(blank) {
            let value = blank.replace(RE_BLANK_LINES, "\n");
            let length = RE_INDENT.exec(blank)[1].length;
            return new Indent(value, length);
          }
        }
      };
      Indent = class {
        constructor(value, length) {
          this.value = value;
          this.length = length;
        }
      };
    }
  });

  // node_modules/@fluent/bundle/esm/index.js
  var init_esm = __esm({
    "node_modules/@fluent/bundle/esm/index.js"() {
      init_bundle();
      init_resource();
      init_types();
    }
  });

  // node_modules/@fluent/dom/esm/overlay.js
  function translateElement(element, translation) {
    const { value } = translation;
    if (typeof value === "string") {
      if (element.localName === "title" && element.namespaceURI === "http://www.w3.org/1999/xhtml") {
        element.textContent = value;
      } else if (!reOverlay.test(value)) {
        element.textContent = value;
      } else {
        const templateElement = element.ownerDocument.createElementNS("http://www.w3.org/1999/xhtml", "template");
        templateElement.innerHTML = value;
        overlayChildNodes(templateElement.content, element);
      }
    }
    overlayAttributes(translation, element);
  }
  function overlayChildNodes(fromFragment, toElement) {
    for (const childNode of fromFragment.childNodes) {
      if (childNode.nodeType === childNode.TEXT_NODE) {
        continue;
      }
      if (childNode.hasAttribute("data-l10n-name")) {
        const sanitized = getNodeForNamedElement(toElement, childNode);
        fromFragment.replaceChild(sanitized, childNode);
        continue;
      }
      if (isElementAllowed(childNode)) {
        const sanitized = createSanitizedElement(childNode);
        fromFragment.replaceChild(sanitized, childNode);
        continue;
      }
      console.warn(`An element of forbidden type "${childNode.localName}" was found in the translation. Only safe text-level elements and elements with data-l10n-name are allowed.`);
      fromFragment.replaceChild(createTextNodeFromTextContent(childNode), childNode);
    }
    toElement.textContent = "";
    toElement.appendChild(fromFragment);
  }
  function hasAttribute(attributes, name) {
    if (!attributes) {
      return false;
    }
    for (let attr of attributes) {
      if (attr.name === name) {
        return true;
      }
    }
    return false;
  }
  function overlayAttributes(fromElement, toElement) {
    const explicitlyAllowed = toElement.hasAttribute("data-l10n-attrs") ? toElement.getAttribute("data-l10n-attrs").split(",").map((i) => i.trim()) : null;
    for (const attr of Array.from(toElement.attributes)) {
      if (isAttrNameLocalizable(attr.name, toElement, explicitlyAllowed) && !hasAttribute(fromElement.attributes, attr.name)) {
        toElement.removeAttribute(attr.name);
      }
    }
    if (!fromElement.attributes) {
      return;
    }
    for (const attr of Array.from(fromElement.attributes)) {
      if (isAttrNameLocalizable(attr.name, toElement, explicitlyAllowed) && toElement.getAttribute(attr.name) !== attr.value) {
        toElement.setAttribute(attr.name, attr.value);
      }
    }
  }
  function getNodeForNamedElement(sourceElement, translatedChild) {
    const childName = translatedChild.getAttribute("data-l10n-name");
    const sourceChild = sourceElement.querySelector(`[data-l10n-name="${childName}"]`);
    if (!sourceChild) {
      console.warn(`An element named "${childName}" wasn't found in the source.`);
      return createTextNodeFromTextContent(translatedChild);
    }
    if (sourceChild.localName !== translatedChild.localName) {
      console.warn(`An element named "${childName}" was found in the translation but its type ${translatedChild.localName} didn't match the element found in the source (${sourceChild.localName}).`);
      return createTextNodeFromTextContent(translatedChild);
    }
    sourceElement.removeChild(sourceChild);
    const clone = sourceChild.cloneNode(false);
    return shallowPopulateUsing(translatedChild, clone);
  }
  function createSanitizedElement(element) {
    const clone = element.ownerDocument.createElement(element.localName);
    return shallowPopulateUsing(element, clone);
  }
  function createTextNodeFromTextContent(element) {
    return element.ownerDocument.createTextNode(element.textContent);
  }
  function isElementAllowed(element) {
    const allowed = TEXT_LEVEL_ELEMENTS[element.namespaceURI];
    return allowed && allowed.includes(element.localName);
  }
  function isAttrNameLocalizable(name, element, explicitlyAllowed = null) {
    if (explicitlyAllowed && explicitlyAllowed.includes(name)) {
      return true;
    }
    const allowed = LOCALIZABLE_ATTRIBUTES[element.namespaceURI];
    if (!allowed) {
      return false;
    }
    const attrName = name.toLowerCase();
    const elemName = element.localName;
    if (allowed.global.includes(attrName)) {
      return true;
    }
    if (!allowed[elemName]) {
      return false;
    }
    if (allowed[elemName].includes(attrName)) {
      return true;
    }
    if (element.namespaceURI === "http://www.w3.org/1999/xhtml" && elemName === "input" && attrName === "value") {
      const type = element.type.toLowerCase();
      if (type === "submit" || type === "button" || type === "reset") {
        return true;
      }
    }
    return false;
  }
  function shallowPopulateUsing(fromElement, toElement) {
    toElement.textContent = fromElement.textContent;
    overlayAttributes(fromElement, toElement);
    return toElement;
  }
  var reOverlay, TEXT_LEVEL_ELEMENTS, LOCALIZABLE_ATTRIBUTES;
  var init_overlay = __esm({
    "node_modules/@fluent/dom/esm/overlay.js"() {
      reOverlay = /<|&#?\w+;/;
      TEXT_LEVEL_ELEMENTS = {
        "http://www.w3.org/1999/xhtml": [
          "em",
          "strong",
          "small",
          "s",
          "cite",
          "q",
          "dfn",
          "abbr",
          "data",
          "time",
          "code",
          "var",
          "samp",
          "kbd",
          "sub",
          "sup",
          "i",
          "b",
          "u",
          "mark",
          "bdi",
          "bdo",
          "span",
          "br",
          "wbr"
        ]
      };
      LOCALIZABLE_ATTRIBUTES = {
        "http://www.w3.org/1999/xhtml": {
          global: ["title", "aria-description", "aria-label", "aria-valuetext"],
          a: ["download"],
          area: ["download", "alt"],
          // value is special-cased in isAttrNameLocalizable
          input: ["alt", "placeholder"],
          menuitem: ["label"],
          menu: ["label"],
          optgroup: ["label"],
          option: ["label"],
          track: ["label"],
          img: ["alt"],
          textarea: ["placeholder"],
          th: ["abbr"]
        },
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul": {
          global: [
            "accesskey",
            "aria-label",
            "aria-valuetext",
            "label",
            "title",
            "tooltiptext"
          ],
          description: ["value"],
          key: ["key", "keycode"],
          label: ["value"],
          textbox: ["placeholder", "value"]
        }
      };
    }
  });

  // node_modules/cached-iterable/src/cached_iterable.mjs
  var CachedIterable;
  var init_cached_iterable = __esm({
    "node_modules/cached-iterable/src/cached_iterable.mjs"() {
      CachedIterable = class extends Array {
        /**
         * Create a `CachedIterable` instance from an iterable or, if another
         * instance of `CachedIterable` is passed, return it without any
         * modifications.
         *
         * @param {Iterable} iterable
         * @returns {CachedIterable}
         */
        static from(iterable) {
          if (iterable instanceof this) {
            return iterable;
          }
          return new this(iterable);
        }
      };
    }
  });

  // node_modules/cached-iterable/src/cached_sync_iterable.mjs
  var init_cached_sync_iterable = __esm({
    "node_modules/cached-iterable/src/cached_sync_iterable.mjs"() {
      init_cached_iterable();
    }
  });

  // node_modules/cached-iterable/src/cached_async_iterable.mjs
  var CachedAsyncIterable;
  var init_cached_async_iterable = __esm({
    "node_modules/cached-iterable/src/cached_async_iterable.mjs"() {
      init_cached_iterable();
      CachedAsyncIterable = class extends CachedIterable {
        /**
         * Create an `CachedAsyncIterable` instance.
         *
         * @param {Iterable} iterable
         * @returns {CachedAsyncIterable}
         */
        constructor(iterable) {
          super();
          if (Symbol.asyncIterator in Object(iterable)) {
            this.iterator = iterable[Symbol.asyncIterator]();
          } else if (Symbol.iterator in Object(iterable)) {
            this.iterator = iterable[Symbol.iterator]();
          } else {
            throw new TypeError("Argument must implement the iteration protocol.");
          }
        }
        /**
         * Asynchronous iterator caching the yielded elements.
         *
         * Elements yielded by the original iterable will be cached and available
         * synchronously. Returns an async generator object implementing the
         * iterator protocol over the elements of the original (async or sync)
         * iterable.
         */
        [Symbol.asyncIterator]() {
          const cached = this;
          let cur = 0;
          return {
            async next() {
              if (cached.length <= cur) {
                cached.push(cached.iterator.next());
              }
              return cached[cur++];
            }
          };
        }
        /**
         * This method allows user to consume the next element from the iterator
         * into the cache.
         *
         * @param {number} count - number of elements to consume
         */
        async touchNext(count = 1) {
          let idx = 0;
          while (idx++ < count) {
            const last = this[this.length - 1];
            if (last && (await last).done) {
              break;
            }
            this.push(this.iterator.next());
          }
          return this[this.length - 1];
        }
      };
    }
  });

  // node_modules/cached-iterable/src/index.mjs
  var init_src = __esm({
    "node_modules/cached-iterable/src/index.mjs"() {
      init_cached_sync_iterable();
      init_cached_async_iterable();
    }
  });

  // node_modules/@fluent/dom/esm/localization.js
  function valueFromBundle(bundle, errors, message, args) {
    if (message.value) {
      return bundle.formatPattern(message.value, args, errors);
    }
    return null;
  }
  function messageFromBundle(bundle, errors, message, args) {
    const formatted = {
      value: null,
      attributes: null
    };
    if (message.value) {
      formatted.value = bundle.formatPattern(message.value, args, errors);
    }
    let attrNames = Object.keys(message.attributes);
    if (attrNames.length > 0) {
      formatted.attributes = new Array(attrNames.length);
      for (let [i, name] of attrNames.entries()) {
        let value = bundle.formatPattern(message.attributes[name], args, errors);
        formatted.attributes[i] = { name, value };
      }
    }
    return formatted;
  }
  function keysFromBundle(method, bundle, keys, translations) {
    const messageErrors = [];
    const missingIds = /* @__PURE__ */ new Set();
    keys.forEach(({ id, args }, i) => {
      if (translations[i] !== void 0) {
        return;
      }
      let message = bundle.getMessage(id);
      if (message) {
        messageErrors.length = 0;
        translations[i] = method(bundle, messageErrors, message, args);
        if (messageErrors.length > 0 && typeof console !== "undefined") {
          const locale = bundle.locales[0];
          const errors = messageErrors.join(", ");
          console.warn(`[fluent][resolver] errors in ${locale}/${id}: ${errors}.`);
        }
      } else {
        missingIds.add(id);
      }
    });
    return missingIds;
  }
  var Localization;
  var init_localization = __esm({
    "node_modules/@fluent/dom/esm/localization.js"() {
      init_src();
      Localization = class {
        /**
         * @param {Array<String>} resourceIds     - List of resource IDs
         * @param {Function}      generateBundles - Function that returns a
         *                                          generator over FluentBundles
         *
         * @returns {Localization}
         */
        constructor(resourceIds = [], generateBundles) {
          this.resourceIds = resourceIds;
          this.generateBundles = generateBundles;
          this.onChange(true);
        }
        addResourceIds(resourceIds, eager = false) {
          this.resourceIds.push(...resourceIds);
          this.onChange(eager);
          return this.resourceIds.length;
        }
        removeResourceIds(resourceIds) {
          this.resourceIds = this.resourceIds.filter((r) => !resourceIds.includes(r));
          this.onChange();
          return this.resourceIds.length;
        }
        /**
         * Format translations and handle fallback if needed.
         *
         * Format translations for `keys` from `FluentBundle` instances on this
         * DOMLocalization. In case of errors, fetch the next context in the
         * fallback chain.
         *
         * @param   {Array<Object>}         keys    - Translation keys to format.
         * @param   {Function}              method  - Formatting function.
         * @returns {Promise<Array<string|Object>>}
         * @private
         */
        async formatWithFallback(keys, method) {
          const translations = [];
          let hasAtLeastOneBundle = false;
          for await (const bundle of this.bundles) {
            hasAtLeastOneBundle = true;
            const missingIds = keysFromBundle(method, bundle, keys, translations);
            if (missingIds.size === 0) {
              break;
            }
            if (typeof console !== "undefined") {
              const locale = bundle.locales[0];
              const ids = Array.from(missingIds).join(", ");
              console.warn(`[fluent] Missing translations in ${locale}: ${ids}`);
            }
          }
          if (!hasAtLeastOneBundle && typeof console !== "undefined") {
            console.warn(`[fluent] Request for keys failed because no resource bundles got generated.
  keys: ${JSON.stringify(keys)}.
  resourceIds: ${JSON.stringify(this.resourceIds)}.`);
          }
          return translations;
        }
        /**
         * Format translations into `{value, attributes}` objects.
         *
         * The fallback logic is the same as in `formatValues`
         * but it returns `{value, attributes}` objects
         * which are suitable for the translation of DOM elements.
         *
         * Returns a Promise resolving to an array of the translation strings.
         *
         * @example
         * ```js
         * docL10n.formatMessages([
         *   {id: 'hello', args: { who: 'Mary' }},
         *   {id: 'welcome'}
         * ]).then(console.log);
         *
         * // [
         * //   { value: 'Hello, Mary!', attributes: null },
         * //   {
         * //     value: 'Welcome!',
         * //     attributes: [ { name: "title", value: 'Hello' } ]
         * //   }
         * // ]
         * ```
         *
         * @param   {Array<Object>} keys
         * @returns {Promise<Array<{value: string, attributes: Object}>>}
         * @private
         */
        formatMessages(keys) {
          return this.formatWithFallback(keys, messageFromBundle);
        }
        /**
         * Retrieve translations corresponding to the passed keys.
         *
         * A generalized version of `DOMLocalization.formatValue`. Keys must
         * be `{id, args}` objects.
         *
         * Returns a Promise resolving to an array of the translation strings.
         *
         * @example
         * ```js
         * docL10n.formatValues([
         *   {id: 'hello', args: { who: 'Mary' }},
         *   {id: 'hello', args: { who: 'John' }},
         *   {id: 'welcome'}
         * ]).then(console.log);
         *
         * // ['Hello, Mary!', 'Hello, John!', 'Welcome!']
         * ```
         *
         * @param   {Array<Object>} keys
         * @returns {Promise<Array<string>>}
         */
        formatValues(keys) {
          return this.formatWithFallback(keys, valueFromBundle);
        }
        /**
         * Retrieve the translation corresponding to the `id` identifier.
         *
         * If passed, `args` is a simple hash object with a list of variables that
         * will be interpolated in the value of the translation.
         *
         * Returns a Promise resolving to the translation string.
         *
         * Use this sparingly for one-off messages which don't need to be
         * retranslated when the user changes their language preferences, e.g. in
         * notifications.
         *
         * @example
         * ```js
         * docL10n.formatValue(
         *   'hello', { who: 'world' }
         * ).then(console.log);
         *
         * // 'Hello, world!'
         * ```
         *
         * @param   {string}  id     - Identifier of the translation to format
         * @param   {Object}  [args] - Optional external arguments
         * @returns {Promise<string>}
         */
        async formatValue(id, args) {
          const [val] = await this.formatValues([{ id, args }]);
          return val;
        }
        handleEvent() {
          this.onChange();
        }
        /**
         * This method should be called when there's a reason to believe
         * that language negotiation or available resources changed.
         */
        onChange(eager = false) {
          this.bundles = CachedAsyncIterable.from(this.generateBundles(this.resourceIds));
          if (eager) {
            this.bundles.touchNext(2);
          }
        }
      };
    }
  });

  // node_modules/@fluent/dom/esm/dom_localization.js
  var L10NID_ATTR_NAME, L10NARGS_ATTR_NAME, L10N_ELEMENT_QUERY, DOMLocalization;
  var init_dom_localization = __esm({
    "node_modules/@fluent/dom/esm/dom_localization.js"() {
      init_overlay();
      init_localization();
      L10NID_ATTR_NAME = "data-l10n-id";
      L10NARGS_ATTR_NAME = "data-l10n-args";
      L10N_ELEMENT_QUERY = `[${L10NID_ATTR_NAME}]`;
      DOMLocalization = class extends Localization {
        /**
         * @param {Array<String>}    resourceIds     - List of resource IDs
         * @param {Function}         generateBundles - Function that returns a
         *                                             generator over FluentBundles
         * @returns {DOMLocalization}
         */
        constructor(resourceIds, generateBundles) {
          super(resourceIds, generateBundles);
          this.roots = /* @__PURE__ */ new Set();
          this.pendingrAF = null;
          this.pendingElements = /* @__PURE__ */ new Set();
          this.windowElement = null;
          this.mutationObserver = null;
          this.observerConfig = {
            attributes: true,
            characterData: false,
            childList: true,
            subtree: true,
            attributeFilter: [L10NID_ATTR_NAME, L10NARGS_ATTR_NAME]
          };
        }
        onChange(eager = false) {
          super.onChange(eager);
          if (this.roots) {
            this.translateRoots();
          }
        }
        /**
         * Set the `data-l10n-id` and `data-l10n-args` attributes on DOM elements.
         * FluentDOM makes use of mutation observers to detect changes
         * to `data-l10n-*` attributes and translate elements asynchronously.
         * `setAttributes` is a convenience method which allows to translate
         * DOM elements declaratively.
         *
         * You should always prefer to use `data-l10n-id` on elements (statically in
         * HTML or dynamically via `setAttributes`) over manually retrieving
         * translations with `format`.  The use of attributes ensures that the
         * elements can be retranslated when the user changes their language
         * preferences.
         *
         * ```javascript
         * localization.setAttributes(
         *   document.querySelector('#welcome'), 'hello', { who: 'world' }
         * );
         * ```
         *
         * This will set the following attributes on the `#welcome` element.
         * The MutationObserver will pick up this change and will localize the element
         * asynchronously.
         *
         * ```html
         * <p id='welcome'
         *   data-l10n-id='hello'
         *   data-l10n-args='{"who": "world"}'>
         * </p>
         * ```
         *
         * @param {Element}                element - Element to set attributes on
         * @param {string}                 id      - l10n-id string
         * @param {Object<string, string>} args    - KVP list of l10n arguments
         * @returns {Element}
         */
        setAttributes(element, id, args) {
          element.setAttribute(L10NID_ATTR_NAME, id);
          if (args) {
            element.setAttribute(L10NARGS_ATTR_NAME, JSON.stringify(args));
          } else {
            element.removeAttribute(L10NARGS_ATTR_NAME);
          }
          return element;
        }
        /**
         * Get the `data-l10n-*` attributes from DOM elements.
         *
         * ```javascript
         * localization.getAttributes(
         *   document.querySelector('#welcome')
         * );
         * // -> { id: 'hello', args: { who: 'world' } }
         * ```
         *
         * @param   {Element}  element - HTML element
         * @returns {{id: string, args: Object}}
         */
        getAttributes(element) {
          return {
            id: element.getAttribute(L10NID_ATTR_NAME),
            args: JSON.parse(element.getAttribute(L10NARGS_ATTR_NAME) || null)
          };
        }
        /**
         * Add `newRoot` to the list of roots managed by this `DOMLocalization`.
         *
         * Additionally, if this `DOMLocalization` has an observer, start observing
         * `newRoot` in order to translate mutations in it.
         *
         * @param {Element | DocumentFragment}      newRoot - Root to observe.
         */
        connectRoot(newRoot) {
          for (const root of this.roots) {
            if (root === newRoot || root.contains(newRoot) || newRoot.contains(root)) {
              throw new Error("Cannot add a root that overlaps with existing root.");
            }
          }
          if (this.windowElement) {
            if (this.windowElement !== newRoot.ownerDocument.defaultView) {
              throw new Error(`Cannot connect a root:
          DOMLocalization already has a root from a different window.`);
            }
          } else {
            this.windowElement = newRoot.ownerDocument.defaultView;
            this.mutationObserver = new this.windowElement.MutationObserver((mutations) => this.translateMutations(mutations));
          }
          this.roots.add(newRoot);
          this.mutationObserver.observe(newRoot, this.observerConfig);
        }
        /**
         * Remove `root` from the list of roots managed by this `DOMLocalization`.
         *
         * Additionally, if this `DOMLocalization` has an observer, stop observing
         * `root`.
         *
         * Returns `true` if the root was the last one managed by this
         * `DOMLocalization`.
         *
         * @param   {Element | DocumentFragment} root - Root to disconnect.
         * @returns {boolean}
         */
        disconnectRoot(root) {
          this.roots.delete(root);
          this.pauseObserving();
          if (this.roots.size === 0) {
            this.mutationObserver = null;
            if (this.windowElement && this.pendingrAF) {
              this.windowElement.cancelAnimationFrame(this.pendingrAF);
            }
            this.windowElement = null;
            this.pendingrAF = null;
            this.pendingElements.clear();
            return true;
          }
          this.resumeObserving();
          return false;
        }
        /**
         * Translate all roots associated with this `DOMLocalization`.
         *
         * @returns {Promise}
         */
        translateRoots() {
          const roots = Array.from(this.roots);
          return Promise.all(roots.map((root) => this.translateFragment(root)));
        }
        /**
         * Pauses the `MutationObserver`.
         */
        pauseObserving() {
          if (!this.mutationObserver) {
            return;
          }
          this.translateMutations(this.mutationObserver.takeRecords());
          this.mutationObserver.disconnect();
        }
        /**
         * Resumes the `MutationObserver`.
         */
        resumeObserving() {
          if (!this.mutationObserver) {
            return;
          }
          for (const root of this.roots) {
            this.mutationObserver.observe(root, this.observerConfig);
          }
        }
        /**
         * Translate mutations detected by the `MutationObserver`.
         *
         * @private
         */
        translateMutations(mutations) {
          for (const mutation of mutations) {
            switch (mutation.type) {
              case "attributes":
                if (mutation.target.hasAttribute("data-l10n-id")) {
                  this.pendingElements.add(mutation.target);
                }
                break;
              case "childList":
                for (const addedNode of mutation.addedNodes) {
                  if (addedNode.nodeType === addedNode.ELEMENT_NODE) {
                    if (addedNode.childElementCount) {
                      for (const element of this.getTranslatables(addedNode)) {
                        this.pendingElements.add(element);
                      }
                    } else if (addedNode.hasAttribute(L10NID_ATTR_NAME)) {
                      this.pendingElements.add(addedNode);
                    }
                  }
                }
                break;
            }
          }
          if (this.pendingElements.size > 0) {
            if (this.pendingrAF === null) {
              this.pendingrAF = this.windowElement.requestAnimationFrame(() => {
                this.translateElements(Array.from(this.pendingElements));
                this.pendingElements.clear();
                this.pendingrAF = null;
              });
            }
          }
        }
        /**
         * Translate a DOM element or fragment asynchronously using this
         * `DOMLocalization` object.
         *
         * Manually trigger the translation (or re-translation) of a DOM fragment.
         * Use the `data-l10n-id` and `data-l10n-args` attributes to mark up the DOM
         * with information about which translations to use.
         *
         * Returns a `Promise` that gets resolved once the translation is complete.
         *
         * @param   {Element | DocumentFragment} frag - Element or DocumentFragment to be translated
         * @returns {Promise}
         */
        translateFragment(frag) {
          return this.translateElements(this.getTranslatables(frag));
        }
        /**
         * Translate a list of DOM elements asynchronously using this
         * `DOMLocalization` object.
         *
         * Manually trigger the translation (or re-translation) of a list of elements.
         * Use the `data-l10n-id` and `data-l10n-args` attributes to mark up the DOM
         * with information about which translations to use.
         *
         * Returns a `Promise` that gets resolved once the translation is complete.
         *
         * @param   {Array<Element>} elements - List of elements to be translated
         * @returns {Promise}
         */
        async translateElements(elements) {
          if (!elements.length) {
            return void 0;
          }
          const keys = elements.map(this.getKeysForElement);
          const translations = await this.formatMessages(keys);
          return this.applyTranslations(elements, translations);
        }
        /**
         * Applies translations onto elements.
         *
         * @param {Array<Element>} elements
         * @param {Array<Object>}  translations
         * @private
         */
        applyTranslations(elements, translations) {
          this.pauseObserving();
          for (let i = 0; i < elements.length; i++) {
            if (translations[i] !== void 0) {
              translateElement(elements[i], translations[i]);
            }
          }
          this.resumeObserving();
        }
        /**
         * Collects all translatable child elements of the element.
         *
         * @param {Element | DocumentFragment} element
         * @returns {Array<Element>}
         * @private
         */
        getTranslatables(element) {
          const nodes = Array.from(element.querySelectorAll(L10N_ELEMENT_QUERY));
          if (typeof element.hasAttribute === "function" && element.hasAttribute(L10NID_ATTR_NAME)) {
            nodes.push(element);
          }
          return nodes;
        }
        /**
         * Get the `data-l10n-*` attributes from DOM elements as a two-element
         * array.
         *
         * @param {Element} element
         * @returns {Object}
         * @private
         */
        getKeysForElement(element) {
          return {
            id: element.getAttribute(L10NID_ATTR_NAME),
            args: JSON.parse(element.getAttribute(L10NARGS_ATTR_NAME) || null)
          };
        }
      };
    }
  });

  // node_modules/@fluent/dom/esm/index.js
  var init_esm2 = __esm({
    "node_modules/@fluent/dom/esm/index.js"() {
      init_dom_localization();
      init_localization();
    }
  });

  // main.js
  var require_main = __commonJS({
    "main.js"() {
      init_esm();
      init_esm2();
      var data = JSON.stringify(
        {
          name: "example",
          values: [1, 2, 3],
          nested: { key: "value" }
        },
        null,
        2
      );
      async function* generateBundles(locales) {
        const response = await fetch("locales/en/main.ftl");
        const text = await response.text();
        const bundle = new FluentBundle("en-US");
        const errors = bundle.addResource(new FluentResource(text));
        if (errors.length) {
          console.error("FTL parse errors:", errors);
        }
        yield bundle;
      }
      var l10n = new DOMLocalization(["locales/en/main.ftl"], generateBundles);
      l10n.connectRoot(document.documentElement);
      var box = document.querySelector("[data-l10n-id='box']");
      l10n.setAttributes(box, "box", { data });
      box.addEventListener("mouseover", () => console.log("title attr:", box.title));
    }
  });
  require_main();
})();

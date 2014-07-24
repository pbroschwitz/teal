# Teal – Stylesheets without selectors

[![Build Status](https://travis-ci.org/teal-lang/teal.svg?branch=master)](https://travis-ci.org/teal-lang/teal)

Teal is a new take on CSS that throws away the concept of selectors to make
it easy to reason about the styles that get actually applied.

With Teal, stylesheets turn into an implementation detail: It feels as if you
were writing inline styles (just with a much nicer syntax) and Teal converts
them into rules and class names for you.

This allows you to split your whole frontend into separate components that are
guaranteed to be free of side effects.

Unlike preprocessors which which only look at one side (the CSS), teal also
addresses the other part: the generation of markup.

You define markup and style together in one place
(one `.tl` file for each component) and teal figures out the
appropriate CSS rules and class names in a BEM/SMACSS-like fashion.

In other words Teal transforms `.tl` files into a stylesheet and a bunch of
templates. By default these templates are compiled to JavaScript (supporting
both Node.JS and browsers) but you can also plug in other language adapters to
compile them to PHP or whatever runtime you would like to use.

The [teal-react](https://github.com/fgnass/teal-react) add-on for example
compiles `.tl` files into React components. Adapters for [kirby](getkirby.com)
and [WebComponents](http://webcomponents.org/) will follow soon.


# Syntax

A Teal file looks a lot like LESS or SCSS at the first glance – except that it
also contains placeholders which tell Teal where content should be placed:

Here is a simple example, lets call it `el/teaser.tl`:

```js
div {
  background: #888;
  padding: 1em;
  h1 {
    font-size: 2em;
    $title
  }
  p {
    $children
  }
  a {
    href = $link
    "Read more"
  }
}
```

This, when rendered, will generate the following HTML structure:

```html
<div class="el-teaser">
  <h1>...</h1>
  <p>...</p>
  <a href="...">Read more</a>
</div>
```

Also the following rules will be added to the generated stylesheet:
x
```css
.el-teaser {
  background: #888;
  padding: 1em;
}
.el-teaser > h1 {
  font-size: 2em
}
```

Since there are no styles specified for the `a` and the `p` element, the `h1`
is the only additional rule in this case. And as Teal exactly knows where the
H1 will end up in the DOM, it can use a very short, yet unique selector to
target it.

## Referencing Components

You can also think about a `.tl` file as kind of custom HTML element with custom
attributes. If you use a tag name that starts with either `/`, `./` or `../`
Teal will interpret it as path, resolve it and render the specified file:

```
div {
  /el/teaser {
    title = "Hello world"
    children = "Lorem ipsum"
  }
  ./foo {
    title = "Another component"
  }
}
```

__Note:__ You can not only pass primitive values as attributes but also other
elements or document fragments:

```
./two-cols {
  left = /el/teaser { title = "Left" }
  right = /el/teaser { title = "Right" }
}
```

### Nested content

If you pass children to a component Teal will expose them as `$children`.
So the following two examples are equivalent:

```
/el/teaser {
  children = {
    "Hello" b { "World!" }
  }
}
// this can be written as:

/el/teaser {
  "Hello" b { "World!" }
}
```

### Implicit children and attributes

If a component does not contain a `$children` variable all nested content is
appended to the component's root element. All other unknown parameters are set
as HTML attributes. This allows you to style HTML elements without having to
list all possible attributes. See how the following example does neither contain
`$children` nor `$href`:

```
a {
  text-decoration: none;
  color: inherit;
  :hover {
    color: teal;
  }
}
```

### States

A component may define different states (aka modifiers):

```
button {
  background: gray;
  .primary {
    background: blue;
    font-size: 2em;
  }
  .danger {
    background: red;
  }
}
```

To activate a state just pass a truthy parameter with the name of the state:

```js
./button { primary=true }
```

__Note:__ If you omit the value and just specify a name `true` is implied.
Hence the following code yields the same result:

```js
./button { primary }
```

If multiple elements inside a component need to be styled when a certain state
is active, just repeat the same modifier and Teal will figure out the
appropriate selectors:

```
button {
  .primary {
    background: blue;
  }
  i {
    .primary {
      color: green
    }
  }
}
```

### Disambiguation

Sometimes it can be hard for Teal to generate meaningful selectors:

```
div {
  div {
    float: left;
    $left
  }
  div {
    float: right;
    $right
  }
}
```

Teal could use `nth-child()` to select the inner divs but in order to stay
compatible with IE < 9 Teal assigns _synthetic classes_ instead, something like
`.el-teaser > .div-1`. To help Teal generate better class names you can provide
_naming hints_ like this:

```
div {
  div.left {
    ...
  }
  div.right {
    ...
  }
}
```

### Constants

You can define constants for colors or sizes using the `@const` directive.
You just have to make sure that the `.tl` file in which the constants are
defined is processed _before_ the files in which they are used. The easiest
way to guarantee this is to put `@const` into a file placed in Teal's root
directory.

```css
@const {
  error: #f00;
  gutter: 12px;
  desktop: (min-width:960px);
}
```

### Media Queries

With Teal you can define all media-specific styles right next to the rest of
a component's style declarations:

```
a {
  display: block;
  @media $desktop {
    float: left;
    width: 50%;
  }
}
```

When building the CSS, Teal will collect all identical media queries and
group them in one single `@media` block at the end of the stylesheet.

### Mixins



### Directives

### Inline animations

### Macros and functions

### Multiline Strings




### Assets

If a component uses an external asset, Teal resolves the path relative to the
`.tl` file and (if used with express) exposes it. This is done by using the
built-in `src()` function:

```js
div {
  img { src=src("./rainbow.gif") }
  background: url(src("./sky.jpg"));
}
```


# Usage

### Within an express app


```js
var express = require('express')
  , teal = require('teal')

var app = express()
  , tl = teal()

app.use(tl)

app.get('/', function(req, res) {
  res.render('page', { title: 'Hello', children: 'Hello World.' })
})
```

# Syntax Highlighting

* [teal.tmLanguage](https://github.com/fgnass/teal.tmLanguage) for TextMate and Sublime Text

* [atom-teal](https://github.com/fgnass/atom-teal) for Atom

![screenshot](https://fgnass.github.io/images/atom-teal.png)

# Add-Ons

* [teal-browserify](https://github.com/teal-lang/teal-browserify) to use Teal
  components in browser apps and/or to easily create browserify bundles from
  within a .tl file.

* [teal-instant](https://github.com/teal-lang/teal-instant) to live-reload the
  HTML/CSS when a file is modified

* [teal-autoprefixer](https://github.com/teal-lang/teal-autoprefixer) to
  automatically add vendor prefixes

* [teal-react](https://github.com/teal-lang/teal-react) to compile .tl files
  into React components

* [teal-markdown](https://github.com/teal-lang/teal-markdown) to render
  markdown text

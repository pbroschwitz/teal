# .tl


Keeping CSS in sync with the markup (or the other way round) is often hard and
error-prone. Developers have to apply strict naming conventions to prevent
unwanted side effects.

Teal addresses these issues by using a totally different approach:

You define markup and style together in one place
(one `.tl` file for each component) and teal figures out the
appropriate CSS rules and class names in a BEM/SMACSS-like fashion.

In other words Teal compiles `.tl` files into a __stylesheet__ and a bunch of
__templates__.


# Syntax

A teal file looks a lot like LESS or SCSS at the first glance – except that it
also contains placeholders which tell teal where content should be placed:

Here is a simple example, lets call it `el/teaser.tl`:

```less
div {
  background: #888;
  padding: 1em;
  h1 {
    font-size: 2em;
    $title
  }
  p {
    $text
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
is the only additional rule in this case. And as teal exactly knows where the
H1 will end up in the DOM, it can use a very short, yet unique selector to
target it.

## Components

You can also think about a `.tl` file as kind of custom HTML element with custom
attributes. If you use a tag name that contains at least one slash, teal will
interpret it as path, resolve it and render the specified file:

```less
div {
  /el/teaser {
    title = "Hello world"
    text = "Lorem ipsum"
  }
  ./foo {
    title = "Another component"
    text = "Lorem ipsum dolor sit amet"
  }
}
```

You can not only pass primitive values as attributes but also other elements or
document fragments:

```less
./two-cols {
  left: /el/teaser { title = "Left" }
  right: /el/teaser { title = "Right" }
}
```

### Passing children

If you pass children to a component teal will expose them as `$content`.
So the following two examples are equivalent:
```less
./foo {
  "Hello" b { "World!" }
}
```
```less
./foo {
  content = {
    "Hello" b { "World!" }
  }
}
```

__Note:__ If a component does not explicitly define a `$content` placeholder
any content is appended to the component's root element.

### States

A component may define different states (aka modifiers):

```less
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

```less
./button { primary=true }
```

__Note:__ If you omit the value and just specify a name `true` is implied.
Hence the following code yields the same result:

```less
./button { primary }
```

By default Teal uses double-class selectors to target states:

```css
.el-button.primary {
  background: blue;
  font-size: 2em;
}
.el-button.danger {
  background: red;
}
```

__Note:__ State names must not contain dashes to prevent name clashes with
components.

### Assets

If a component uses an external asset, Teal resolves the path relative to the
`.tl` file and (if used with express) exposes it. This is done by using the
built-in `src()` function:

```less
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
  res.render('page', { title: 'Hello', content: 'Hello World.' })
})
```

# Add-Ons

* [teal-browserify](https://github.com/fgnass/teal-browserify) to use teal
  components in browser apps and/or to easily create browserify bundles from
  within a .tl file.

* [teal-instant](https://github.com/fgnass/teal-instant) to live-reload the
  HTML/CSS when a file is modified

* [teal-autoprefixer](https://github.com/fgnass/teal-autoprefixer) to
  automatically add vendor prefixes

* [teal-react](https://github.com/fgnass/teal-react) to compile .tl files into
  React components

# Teal

Teal is a language to write small reusable HTML components. The CSS properties
defined in a `.tl` file are extracted and put into a stylesheet. At the same
time each teal file is turned into a compiled template.

Now here's the twist: You don't have to write any CSS selectors. Since markup
and style are defined in one place, Teal can figure out the appropriate rules
and assign class names as needed. You no longer have to apply naming conventions
like BEM or SMACSS by hand, instead Teal will do this for you.

This makes refactoring your frontend code a lot easier. You'll never ever have
to wonder where a given line of CSS is actually used. And you can be sure that
altering a property won't have any undesired side effects.

And thanks to the built-in source maps support, inspecting an HTML element will
take you straight to location where it has been defined.

## Basic Example

Here is a simple example, lets call it `teaser.tl`:

```scss
div {
  background: #888
  padding: 1em
  h1 {
    font-size: 2em
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

This, when rendered, will generate the following HTML:

```html
<div class="teaser">
  <h1>...</h1>
  <p>...</p>
  <a href="...">Read more</a>
</div>
```

Also the following rules will be added to the generated stylesheet:

```css
.teaser {
  background: #888
  padding: 1em
}
.teaser > h1 {
  font-size: 2em
}
```

## Components

You can also think about a `.tl` file as a custom HTML element. If you use a
path instead of a tag name, teal will render the specified file and expose the
passed attributes as template variables.

```scss
div {
  ./teaser {
    title = "Hello world"
    text = "Lorem ipsum"
  }
  ./teaser {
    title = "Another teaser"
    text = "Lorem ipsum dolor sit amet"
  }
}
```

## Assets

If a component uses an external asset, Teal resolves the path relative to the
`.tl` file and (if used with express) exposes it. This is done by using the
built-in `url()` function:

```scss
div {
  background: url("./sky.jpg")
  img { src=url("./rainbow.gif") }
}
```

## Client-side templates

The compiled teal templates can be used either server-side or in the browser via
a browserify transform:

```js
var teaser = require('./teaser.tl')
var el = teaser({ title: 'Hello', text: 'world' })
document.body.appendChild(el)
```


# Usage

## Within an express app


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

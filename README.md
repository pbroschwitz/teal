# Teal

## Templating language for a modular web

Teal is a template language that unifies HTML and CSS to define small composable
modules.

The idea: By defining a component's markup and style together in one place
(a .tl file) we create small encapsulated modules that don't interfere with
each other.

# Syntax

    div {
      border: 1px solid #555
      padding: 20px
      background: #888
      a {
        color: #000
        href=$link
        $label
      }
    }


Use slashes to call another component. The paths can either be relative to the
current file or absolute (starting at the root of the module's views folder).

    div {
      /teaser {
        $title: "Lorem Ipsum"
        $content: ./image {
          $src: "/photo.jpg"
        }
      }
    }

# Usage

## Within an express app

```js
var express = require('express')
  , teal = require('teal')

var app = express()
  , view = teal()

app.use(view)

app.engine('tl', view.engine)
app.set('view engine', 'tl')
view.process(app.get('views'))


app.get('/', function(req, res) {
  res.render('page', { title: 'Hello', content: 'Hello World.' })
})
``

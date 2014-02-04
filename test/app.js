var request = require('supertest')
  , express = require('express')
  , teal = require('../lib')

var app = express()
  , view = teal()

app.use(view.resources)
view.process(__dirname + '/fixture')

describe('app', function() {
  it('should ...', function(done) {
    request(app)
      .get('/main.css')
      .expect(200, done)
  })
})
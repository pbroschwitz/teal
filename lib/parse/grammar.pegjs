/* ---- Helper Functions ---- */

{

  /**
   * Helper function to convert rules like `first:Foo rest:(',' Foo)*` into
   * an array. The optional index argument specifies the position of the item
   * in the `rest:(...)` group.
   */
  function list(first, rest, index) {
    if (first === undefined) return []
    if (!rest.length) return [first]
    if (typeof index == 'number') rest = rest.map(function(item) {
      return item[index]
    })
    return [first].concat(rest)
  }

  /**
   * Helper function to handle recursive structures.
   */
  function tree(first, rest, builder) {
    var result = first, i
    for (i = 0; i < rest.length; i++) {
      result = builder(result, rest[i])
    }
    return result
  }

  /**
   * Compute the line/column numbers for the given offset.
   */
  function location(offset) {
    var p = peg$computePosDetails(offset)
    return { line: p.line, column: p.column }
  }

  /**
   * Add a `position` object to node that is compatible with the CSS ast.
   */
  function pos(node) {
    node.position = {
      file: options.file,
      source: options.url,
      start: location(peg$reportedPos),
      end: location(peg$currPos-1),
      toString: function() {
        return this.file + ':' + this.start.line + ',' + this.start.column
      }
    }
    return node
  }
}

/* ---- Rules ---- */

Start
  = __ d:Doctype? __ r:Root? __ EOF {
    return pos({ type: 'root', doctype: d, root: r })
  }

Doctype
 = '!doctype'i _ '{' name:$(!'}' .)* '}' { return name.trim() }


Variable "variable"
  = '$' name:$([a-z_]i [a-z0-9_-]i*) {
    return { type: 'variable', name: name }
  }

Root
  = Element
  / Reference

Fragment
  = decl:Block {
    return { type: 'fragment', declarations: decl }
  }

Element
  = tag:Tag cls:ElementClass? _ decl:Block {
    return pos({ type: 'element', tag: tag, class: cls, declarations: decl })
  }

Tag "tag"
  = $([a-z]i [a-z0-9]i*)
  / '<' _ exp:SimpleExp _ '>' { return exp }

ElementClass "class"
  = '.' c:$([a-z0-9]i [a-z0-9_-]i*) { return c }

Reference
  = p:Path _ decl:Block {
    return pos({ type: 'reference', path: p, declarations: decl })
  }

Path "path"
  = $('.'? '/' [a-z0-9_./-]i+)

Block
  = __ '{' __ c:BlockContent* __ '}' __ { return c }

BlockContent
  = d:Declaration __ { return d }

Declaration
  = Property
  / Style
  / Media
  / Font
  / Animation
  / Content
  / Attribute

Content
  = c:(SimpleExp / Element / Reference / Directive) {
    return { type: 'content', content: c }
  }

Attribute
  = name:AttributeName _ '=' __ value:AttributeValue {
    return { type: 'attribute', name: name, value: value }
  }
  / name:AttributeName (WhiteSpace / LineTerminatorSequence / Comment / &'}') {
    return { type: 'attribute', name: name, value: true }
  }

AttributeName "attribute name"
  = $([a-z]i [a-z0-9_-]i*)

AttributeValue
  = Exp
  / Element
  / Reference
  / Fragment

Property
  = name:PropertyName _ ':' __ value:PropertyValue+ __ (';' / &'}') {
    return pos({ type: 'declaration', property: name, value: value })
  }

PropertyName "property name"
  = $([a-z-]i [a-z0-9_-]i*)

PropertyValue
  = Function
  / $(!(';' / '}' / Function) .)+

Animation
  = '@animation' __ v:AnimationValue __ '{' __ k:Keyframe* __ '}' {
    return pos({ type: 'animation', value: v.trim(), keyframes: k })
  }

AnimationValue
  = $(!'{' .)*

Keyframe
  = v:KeyframeValues decl:Block {
    return { type: 'keyframe', values: v, declarations: decl }
  }

KeyframeValues
  = n: KeyframeValue m:(',' __ KeyframeValue)* { return list(n, m, 2) }

KeyframeValue
  = 'from'
  / 'to'
  / $([0-9]+ '%')


Font
  = '@font-face' decl:Block {
    return pos({ type: 'font', declarations: decl })
  }

Media
  = '@media' mq:MediaQuery decl:Block {
    return pos({ type: 'media', media: mq.trim().replace(/:(?=\S)/g, ': '), declarations: decl })
  }

MediaQuery
  = (!'{' .)* { return text().trim() }

Style
 = sel:Selectors decl:Block {
   return pos({ type: 'style', selectors: sel, declarations: decl })
 }

Selectors
  = n:Selector m:(',' __ Selector)* { return list(n, m, 2) }

Selector "selector"
  = $(':' [a-z0-9():-]i+)
  / $('[' (!']')* ']')
  / '.' s:$([a-z]i[a-z0-9_-]i*)+  { return { state: s }}
  / p:('^'+) sel:Selector { return { parent: p.length, selector: sel } }


Directive
  = Each
  / If

Each
  = '@each' __ v:Variable __ 'in' __ e:Exp __ body:DirectiveContent {
    return { type: 'each', variable: v, expression: e, body: body }
  }

If
  = '@if' __ c:Exp _ con:DirectiveContent alt:Else? {
    return { type: 'if', condition: c, consequent: con, alternate: alt }
  }

Else
  = '@else' __ alt:DirectiveContent {
    return alt
  }

DirectiveContent
  = Fragment
  / SimpleExp
  / Element
  / Reference
  / Directive

SimpleExp
  = MemberExpression
  / TernaryExpression

MemberExpression
  = o:(Variable / Function)
    m:( '.' p:Identifier { return { name: p } }
      / '[' __ p:Exp __ ']' { return { name: p, computed: true } }
    )+ {
    return tree(o, m, function(result, el) {
      return { type: 'member', object: result, property: el.name, computed: el.computed }
    })
  }

TernaryExpression
  = exp:BinaryExpression __ '?' __ truthy:Exp __ ':' __ falsy:Exp {
    return { type: 'ternary', expression: exp, truthy: truthy, falsy: falsy }
  }
  / BinaryExpression

BinaryExpression
  = exp:UnaryExpression __ '|' __ def:BinaryExpression {
    return { type: 'default', expression: exp, default: def }
  }
  / l:UnaryExpression __ '+' __ r:BinaryExpression {
    return { type: 'concat', left: l, right: r }
  }
  / UnaryExpression

UnaryExpression
  = '!' __ exp:PrimaryExpression { return { type: 'not', expression: exp } }
  / PrimaryExpression

PrimaryExpression
  = Variable
  / Function
  / SimpleLiteral


Exp
  = SimpleExp
  / ComplexLiteral


Function "function"
  = name:FunctionName '(' __ args:ArgumentList __ ')' {
    return options.expand({ type: 'function', name: name, arguments: args })
  }

FunctionName "function name"
  = $([a-z-]i [a-z0-9_-]i*)

ArgumentList
  = n:Exp? m:(__ ',' __ Exp)* { return list(n, m, 3) }

SimpleLiteral
  = NullLiteral
  / BooleanLiteral
  / DecimalLiteral
  / StringLiteral

ComplexLiteral
  = SimpleLiteral
  / ArrayLiteral
  / ObjectLiteral

ArrayLiteral
  = '[' __ n:Exp m:(__ ',' __ Exp)* __ ']' {
    return list(n, m, 3)
  }

ObjectLiteral
  = '{' __ props:ObjectProperties __ '}' {
    var obj = {}
    props.forEach(function(p) {
      obj[p.name] = p.value
    })
    return obj
  }

ObjectProperties
  = n:ObjectProperty? m:(__ ',' __ ObjectProperty)* {
    return list(n, m, 3)
  }

ObjectProperty
  = name:Identifier __ ':' __ value:Exp {
    return { name: name, value: value }
  }

Identifier
  = $([a-z]i [a-z0-9_]i*)

NullLiteral "null"
  = 'null' { return null }

BooleanLiteral "boolean"
  = 'true'  { return true }
  / 'false' { return false }

DecimalLiteral "number"
  = DecimalIntegerLiteral '.' DecimalDigit* {
    return parseFloat(text())
  }
  / '.' DecimalDigit+ {
    return parseFloat(text())
  }
  / DecimalIntegerLiteral {
    return parseFloat(text())
  }

DecimalIntegerLiteral
  = '0'
  / NonZeroDigit DecimalDigit*

DecimalDigit
  = [0-9]

NonZeroDigit
  = [1-9]


StringLiteral "string"
  = '"' chars:DoubleStringCharacter* '"' { return chars.join('') }
  / "'" chars:SingleStringCharacter* "'" { return chars.join('') }

DoubleStringCharacter
  = !('"' / '\\"' / LineTerminator) . { return text() }
  / '\\"'. { return '"' }

SingleStringCharacter
  = !("'" / "\\'" / LineTerminator) . { return text() }
  / "\\'" { return "'" }



/* ----- Lexical Grammar ---- */

__ "whitespace"
  = (WhiteSpace / LineTerminatorSequence / Comment)*

_ "whitespace"
  = (WhiteSpace / MultiLineCommentNoLineTerminator)*

WhiteSpace "whitespace"
  = '\t'
  / '\v'
  / '\f'
  / ' '
  / '\u00A0'
  / '\uFEFF'

LineTerminator
  = [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
  = '\n'
  / '\r\n'
  / '\r'
  / '\u2028'
  / '\u2029'

Comment "comment"
  = MultiLineComment
  / SingleLineComment

MultiLineComment
  = '/*' (!'*/' .)* '*/'

MultiLineCommentNoLineTerminator
  = '/*' (!('*/' / LineTerminator) .)* '*/'

SingleLineComment
  = '//' (!LineTerminator .)*

EOF
  = !.

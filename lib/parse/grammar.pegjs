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

  function interpolate(s) {
    var re = /(?!\\)\$\{(.+?)\}/g
    var i = 0
    var m
    var tokens = []
    while((m = re.exec(s)) !== null) {
      tokens.push(s.slice(i, m.index))
      tokens.push({ type: 'variable', name: m[1] })
      i = re.lastIndex
    }
    if (!i) return s
    tokens.push(s.slice(i))
    return { type: 'value', tokens: tokens }
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
  = __ d:Doctype? __ s:Settings* __ r:Root? __ EOF {
    return pos({ type: 'root', doctype: d, settings: s, root: r })
  }

Doctype
 = '!doctype'i _ '{' name:$(!'}' .)* '}' { return name.trim() }


Settings
 = FontFace
 / Keyframes
 / Const

FontFace
 = '@font-face' decl:Block {
   return pos({ type: 'font', declarations: decl })
 }

Keyframes
  = '@keyframes' __ n:$([a-z]i [a-z0-9_-]i*) __ '{' __ f:Keyframe* __ '}' {
    return pos({ type: 'keyframes', name: n, frames: f })
  }

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

Variable "variable"
  = '$' name:$([a-z_]i [a-z0-9_-]i*) {
    return { type: 'variable', name: name }
  }

Root
  = Element
  / Reference
  / Mixin

Fragment
  = '{' __ c:Content* __ '}' {
    return { type: 'fragment', content: c }
  }

Mixin
  = '@mixin' __ decl:Block {
    return { type: 'mixin', declarations: decl }
  }

Element
  = tag:Tag cls:ElementClass? _ decl:Block {
    return pos({ type: 'element', tag: tag, class: cls, declarations: decl })
  }

Tag "tag"
  = $([a-z]i [a-z0-9]i*)
  / '<' _ exp:Exp _ '>' { return exp }

ElementClass "class"
  = '.' c:$([a-z0-9]i [a-z0-9_-]i*) { return c }


HtmlComment
  = '--{' text:$(!'}--' .)* '}--' {
    return { type: 'comment', text: interpolate(text.trim()) }
  }

Const
  = '@const' __ '{' __ decl:CssContent* '}' {
    return pos({ type: 'const', declarations: decl })
  }

CssContent
  = p:Property __ { return p }


Path "path"
  = $([a-z0-9_.-]i* '/' [a-z0-9_./-]i+)


Reference
  = p:Path _ decl:Block {
    return pos({ type: 'reference', path: options.resolveDependency(p), declarations: decl })
  }

Block
  = __ '{' __ c:BlockContent* '}' __ { return c }

BlockContent
  = d:Declaration __ { return d }

Declaration
  = Css
  / Sheet
  / Content
  / Attribute

CssBlock
  = __ '{' __ c:CssBlockContent* '}' __ { return c }

CssBlockContent = c:Css __ { return c }

Css
  = Property
  / Style
  / Media
  / Animation
  / Reference //mixins only

Content
  = SimpleExp
  / Element
  / Reference
  / HtmlComment
  / Directive

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
  = SimpleExp
  / ArrayLiteral
  / Element
  / Reference
  / Fragment

Property
  = name:PropertyName _ ':' __ value:PropertyValue+ (';' / &'}') {
    return pos({ type: 'declaration', property: name, value: value })
  }

PropertyName "property name"
  = $([a-z-]i [a-z0-9_-]i*)

PropertyValue
  = CssToken
  / (',' / WhiteSpace / MultiLineCommentNoLineTerminator)

CssToken
  = OpaqueCssToken
  / ParsedCssToken

ParsedCssToken
  = Function
  / Variable
  / $([()])

OpaqueCssToken
  = $(( !(ParsedCssToken/[,;})]) . )+)


Animation
  = '@animation' __ v:AnimationValue __ '{' __ f:Keyframe* __ '}' {
    return pos({
      type: 'animation',
      value: v.trim(),
      keyframes: pos({ type: 'keyframes', frames: f })
    })
  }

AnimationValue
  = $(!'{' .)*

FontFace
  = '@font-face' decl:Block {
    return pos({ type: 'font', declarations: decl })
  }

Media
  = '@media' __ mq:MediaQuery+ __ decl:CssBlock {
    return pos({ type: 'media', media: mq, declarations: decl })
  }

Sheet
  = '@sheet' __ name:PropertyName __ decl:CssBlock {
    return { type: 'media', media: 'sheet:'+name, sheet: name, declarations: decl }
  }

MediaQuery
  = Variable
  / $( !(Variable/'{') . )+

Style
 = sel:Selectors decl:Block {
   return pos({ type: 'style', selectors: sel, declarations: decl })
 }

Selectors
  = n:Selector m:(',' __ Selector)* { return list(n, m, 2) }

Selector "selector"
  = $(':' [a-z0-9():-]i+)
  / $('*' [a-z0-9():-]i*)
  / $('[' (!']')* ']')
  / '~' n:([1-9][0-9]*)? s:$([a-z0-9():-]i+) { return { adjacentSibling: parseFloat(n||1), selector: s } }
  / '.' s:$([a-z]i[a-z0-9_]i*)+ { return { state: s } }
  / '^' p:([1-9][0-9]*)? s:$(Selector) { return { parent: parseFloat(p||0), selector: s } }

Directive
  = Each
  / If

Each
  = '@each' __ v:Variable __ 'in' __ e:SimpleExp __ body:DirectiveContent {
    return { type: 'each', variable: v, expression: e, body: body }
  }

If
  = '@if' __ n:'not'? __ c:SimpleExp _ con:DirectiveContent __ alt:Else? {
    return { type: 'if', not: n, condition: c, consequent: con, alternate: alt }
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
  / HtmlComment
  / Directive

MemberExpression
  = o:(Variable / Function)
    m:( '.' p:Identifier { return { name: p } }
      / '[' __ p:Exp __ ']' { return { name: p, computed: true } }
    )+ {
    return tree(o, m, function(result, el) {
      return { type: 'member', object: result, property: el.name, computed: el.computed }
    })
  }

CallExpression
  = first:(
      callee:MemberExpression __ args:Arguments {
        return { type: 'call', callee: callee, arguments: args }
      }
    )
    rest:(
        __ args:Arguments {
          return { type: 'call', arguments: args }
        }
      / __ "[" __ property:Exp __ "]" {
          return {
            type: 'member',
            property: property,
            computed: true
          }
        }
      / __ "." __ property:Identifier {
          return {
            type: 'member',
            property: property,
            computed: false
          }
        }
    )* {
      return tree(first, rest, function(result, element) {
        if (element.type == 'call') element.callee = result
        else element.object = result
        return element
      })
    }

RangeExpression
  = s:DecimalLiteral '..' e:DecimalLiteral {
    return { type: 'function', name: 'range', arguments: [s, e] }
  }

Exp
  = TernaryExpression

SimpleExp
  = MemberExpression
  / RangeExpression
  / Group
  / Variable
  / Function
  / SimpleLiteral

Group
  = '(' exp:Exp ')' {
    return { type: 'group', expression: exp }
  }

TernaryExpression
  = exp:BinaryExpression __ '?' __ truthy:Exp __ ':' __ falsy:Exp {
    return { type: 'ternary', expression: exp, truthy: truthy, falsy: falsy }
  }
  / BinaryExpression

BinaryExpression
  = left:UnaryExpression __ op:BinaryOperator __ right:BinaryExpression {
    return { type: 'binary', op: op, left: left, right: right }
  }
  / UnaryExpression

UnaryExpression
  = CallExpression
  / op:UnaryOperator __ exp:PrimaryExpression {
    return { type: 'unary', op: op, expression: exp }
  }
  / PrimaryExpression

PrimaryExpression
  = SimpleExp
  / ComplexLiteral


UnaryOperator "operator"
  = $('+' !'=')
  / $('-' !'=')
  / '!'

BinaryOperator "operator"
  = $('*' !'=')
  / $('/' !'=')
  / $('%' !'=')
  / $('+' ![+=])
  / $('-' ![-=])
  / '=='
  / '<='
  / '>='
  / '!='
  / '||'
  / '&&'
  / '<'
  / '>'
  / '|'

Function "function"
  = name:FunctionName args:Arguments {
    return { type: 'function', name: name, arguments: args }
  }
  / p:Path args:Arguments {
    return { type: 'function', path: options.resolveDependency(p), arguments: args }
  }

FunctionName "function name"
  = $([a-z-]i [a-z0-9_-]i*)

Arguments
  = '(' __ args:ArgumentList __ ')' { return args }

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
  = '[' __ n:Exp? m:(__ ',' __ Exp)* __ ']' {
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
  = name:PropertyName __ ':' __ value:Exp {
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
  = DecimalIntegerLiteral '.' DecimalDigit+ {
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
  / "´" chars:TemplateStringCharacter* "´" {
    return interpolate(options.outdent(chars.join('')))
  }

DoubleStringCharacter
  = !('"' / '\\"' / LineTerminator) . { return text() }
  / '\\"'. { return '"' }

SingleStringCharacter
  = !("'" / "\\'" / LineTerminator) . { return text() }
  / "\\'" { return "'" }

TemplateStringCharacter
  = !('´' / '\\´') . { return text() }
  / '\\´'. { return '´' }


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

S
  = ![a-z0-9]i

EOF
  = !.

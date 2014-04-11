/* ---- Helper Functions ---- */

{
  function list(first, rest, index) {
    if (!first) return []
    if (!rest.length) return [first]
    if (typeof index == 'number') rest = rest.map(function(item) {
      return item[index]
    })
    return [first].concat(rest)
  }

  /**
   * Compute line/column numbers for the given offset
   */
  function location(offset) {
    var p = peg$computePosDetails(offset)
    return { line: p.line, column: p.column }
  }

  /**
   * Add a `position` object to node that is compatible with the CSS ast
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
  = __ d:Doctype? __ v:Assignment* __ r:Root? __ EOF {
    return { type: 'root', doctype: d, variables: v, root: r }
  }

Doctype
 = '!doctype'i _ '{' name:$(!'}' .)* '}' { return name.trim() }

Variable
  = '$' name:Identifier {
    return { type: 'variable', name: name }
  }

Assignment
  = a:AssignmentExpression EOS { return a }

Directive
  = For
  / If

For
  = '@for' _ c:Exp _ body:Content {
    return { type: 'for', expression: c, body: body }
  }

If
  = '@if' __ c:Exp _ con:Content alt:Else? {
    return { type: 'if', condition: c, consequent: con, alternate: alt }
  }

Else
  = '@else' __ alt:Content {
    return alt
  }

Root
  = Fragment
  / Element
  / Reference

Fragment
  = decl:Block {
    return { type: 'fragment', declarations: decl }
  }

Element
  = tag:Tag cls:ClassName? _ decl:Block {
    return { type: 'element', tag: tag, class: cls, declarations: decl }
  }

ClassName
  = '.' name:CssIdentifier { return name }

Reference
  = p:Path _ decl:Block {
    return { type: 'reference', path: p, declarations: decl }
  }

Path
  = $('.'? '/' [a-z0-9_./-]i+)

Tag
  = HtmlIdentifier
  / '<(' _ exp:Exp _ ')>' { return exp }

Block
  = __ '{' __ c:BlockContent* __ '}' __ { return c }

BlockContent
  = d:Declaration __ { return d }

Declaration
  = Property
  / Style
  / Media
  / Animation
  / Content
  / Attribute

Content
  = c:(SimpleExp / Element / Reference / Directive) {
    return { type: 'content', content: c }
  }

Attribute
  = name:HtmlIdentifier _ '=' __ value:AttributeValue {
    return { type: 'attribute', name: name, value: value }
  }
  / name:HtmlIdentifier {
    return { type: 'attribute', name: name, value: true }
  }

AttributeValue
  = Exp
  / Element
  / Reference
  / Fragment

Property
  = name:CssIdentifier _ ':' _ value:PropertyValue EOS? {
    return pos({ type: 'declaration', property: name, value: value })
  }

PropertyValue
  = (!EOS .)* { return text() }

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

Media
  = '@media' mq:MediaQuery decl:Block {
    return pos({ type: 'media', media: mq, declarations: decl })
  }

MediaQuery
  = (!'{' .)* { return text().trim() }

Style
 = sel:Selectors decl:Block {
   return pos({ type: 'style', selectors: sel, declarations: decl })
 }

Selectors
  = n:Selector m:(',' __ Selector)* { return list(n, m, 2) }

Selector
  = $(('.' / '::' / ':') CssIdentifier)
  / $('[' (!']')* ']')
  / p:('^'+) sel:Selector { return { parent: p.length, selector: sel } }



AssignmentExpression
  = left:Variable __ "=" !"=" __ right:Exp {
    return { type: 'assignment', variable: left.name, value: right }
  }

Exp
  = MemberExpression
  / TernaryExpression

SimpleExp
  = Group
  / Function
  / Variable
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
  = op:UnaryOperator __ exp:PrimaryExpression {
    return { type: 'unary', op: op, expression: exp }
  }
  / PrimaryExpression

PrimaryExpression
  = ComplexLiteral
  / Function
  / Variable
  / Group


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

Function
  = name:Identifier '(' args:ArgumentList ')' {
    return options.expand({ type: 'function', name: name, arguments: args })
  }

ArgumentList
  = n:Exp? m:(',' __ Exp)* { return list(n, m, 2) }

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
    return { type: 'array', items: list(n, m, 3) }
  }

ObjectLiteral
  = '{' __ p:ObjectProperties __ '}' {
    return { type: 'object', properties: p }
  }

ObjectProperties
  = n:ObjectProperty? m:(__ ',' __ ObjectProperty)* {
    return list(n, m, 3)
  }

ObjectProperty
  = name:Identifier __ ':' __ value:Exp {
    return { name: name, value: value }
  }

MemberExpression
  = o:(PrimaryExpression / Function)
    m:( __ '.' __ p:Identifier { return { name: p } }
      / __ '[' __ p:Exp __ ']' { return { name: p, computed: true } }
    ) {
    return { type: 'member', object: o, property: m.name, computed: m.computed }
  }

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

Identifier "identifier"
  = first:[a-z_]i rest:[a-z0-9_]i* { return first + rest.join('') }

HtmlIdentifier "identifier"
  = first:[a-z]i rest:[a-z0-9_-]* { return first + rest.join('') }

CssIdentifier "identifier"
  = first:[a-z-]i rest:[a-z0-9_-]* { return first + rest.join('') }

EOS
  = __ ';'
  / _ SingleLineComment? LineTerminatorSequence
  / _ &'}'
  / __ EOF

EOF
  = !.

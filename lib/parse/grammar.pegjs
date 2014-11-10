/* ---- Helper Functions ---- */

{

  var h = options.helpers
  var list = h.list
  var tree = h.tree
  var flatten = h.flatten

  function addContent(node, list) {
    var attr = []
    var children = []
    var decl = []

    list.forEach(function(d) {
      if (d.type == 'attribute') attr.push(d)
      else if (d.type == 'css') decl.push(d.css)
      else {
        if (d.type == 'path') d = { type: 'element', name: d }
        children.push(d)
      }
    })

    if (attr.length) node.attributes = attr
    if (children.length) node.children = children
    if (decl.length) node.declarations = decl
    return node
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
    if (!options.file) return node
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
  = __ d:Doctype? __ s:Setting* __ r:Root? __ EOF {
    var doc = { type: 'root', root: r }
    if (d) doc.doctype = d
    if (s.length) doc.settings = s
    return doc
  }

Doctype
 // TODO Change this to Exp / Identifer / Whitespace!
 = '@doctype' __ '{' name:$(!'}' .)* '}' { return name.trim() }

Root
  = Element
  / Mixin

Setting
 = s:(Keyframes / FontFace / Const) __ { return s }


Keyframes
  = '@keyframes' __ n:$([a-z]i [a-z0-9_-]i*) __ '{' __ f:Keyframe* __ '}' {
    return pos({ type: 'keyframes', name: n, frames: f })
  }

Keyframe
  = v:KeyframeValues decl:CssBlock {
    return { type: 'keyframe', values: v, declarations: decl }
  }

KeyframeValues
  = n: KeyframeValue m:(',' __ KeyframeValue)* { return list(n, m, 2) }

KeyframeValue
  = 'from'
  / 'to'
  / $([0-9]+ '%')

FontFace
  = '@font-face' __ decl:CssBlock {
    return pos({ type: 'font', declarations: decl })
  }


Const
  = '@const' __ decl:Declarations {
    return addContent({ type: 'const' }, decl)
  }

Mixin
  = '@mixin' __ decl:Declarations {
    return addContent({ type: 'mixin' }, decl )
  }

Element
  = name:(Exp / Identifier) cls:ClassName? __ decl:Declarations {
    var el = { type: 'element', name: name }
    if (cls) el.class = cls
    return addContent(el, decl)
  }

ClassName
  = '#' n:Identifier { return n }

Declarations
  = '{' __ decl:(d:Declaration EOS { return d })* '}' { return decl }

Declaration
  = Content
  / Css
  / Attribute

Attribute
  = name:Identifier __ '=' __ value:Content {
    return { type: 'attribute', name: name, value: value }
  }
  / name:Identifier {
    return { type: 'attribute', name: name, value: true }
  }

Css
  = css:(Property / Style / Media / Sheet / Animation / Element) {
    return { type: 'css', css: css }
  }

Property
  = n:PropertyName _ ':' __ v:PropertyValue {
    return { type: 'declaration', property: n, value: v }
  }

PropertyName "property name"
  = $([a-z-]i [a-z0-9_-]i*)

PropertyValue
  = (CssFunction / Variable / CssToken)+

CssFunction
  = n:Identifier __ '(' __ args:PropertyValue __ ')' {
    return { type: 'function', name: n, args: args }
  }

CssToken
  = $(! ([;(){}$] / WhiteSpace / LineTerminatorSequence) .)+
  / $( WhiteSpace / LineTerminatorSequence)+

Style
 = sel:Selectors __ decl:CssBlock {
   return pos({ type: 'style', selectors: sel, declarations: decl })
 }

Selectors
  = n:Selector m:(',' __ Selector)* { return list(n, m, 2) }

Selector "selector"
  = s:$(SelectorChars / WhiteSpace)* '&' { return { prefix: s } }
  / $(':' SelectorChars)
  / $('[' (!']' .)+ ']')
  / '~' n:([1-9][0-9]*)? s:SelectorChars { return { sibling: parseFloat(n||1), selector: s } }
  / '+' s:SelectorChars { return { adjacentSibling: s } }
  / '.' s:$([a-z]i[a-z0-9_]i*)+ { return { state: s } }
  / '^' p:([1-9][0-9]*)? s:SelectorChars? { return { parent: parseFloat(p||1), selector: s || '' } }
  / '>>' __ s:SelectorChars { return { descendant: s } }
  / '>' __ s:SelectorChars { return { child: s } }

SelectorChars
  = $([a-z0-9:._\[\]()*-]i+)

CssBlock
  = '{' __ d:CssDeclarations* '}' { return d }

CssDeclarations
  = d:Css EOS { return d.css }

Media
  = '@media' __ mq:MediaQuery __ decl:CssBlock {
    return pos({ type: 'media', media: flatten(mq), declarations: decl })
  }

MediaQuery
  = (__ MediaQueryToken)*

MediaQueryToken
  = '(' __ p:Property __ ')' {
    return [
      '('+p.property+':',
      p.value,
      ')'
    ]
  }
  / Exp
  / Identifier
  / ','

Sheet
  = '@sheet' __ name:Identifier __ decl:CssBlock {
    return { type: 'media', media: [ 'sheet:'+name ], sheet: name, declarations: decl }
  }

Animation
  = '@animation' __ v:PropertyValue __ '{' __ f:Keyframe* __ '}' {
    return pos({
      type: 'animation',
      value: v,
      keyframes: pos({ type: 'keyframes', frames: f })
    })
  }

Keyframes
  = '@keyframes' __ n:Identifier __ '{' __ f:Keyframe* __ '}' {
    return pos({ type: 'keyframes', name: n, frames: f })
  }

Keyframe
  = v:KeyframeValues __ decl:CssBlock __ {
    return { type: 'keyframe', values: v, declarations: decl }
  }

KeyframeValues
  = n: KeyframeValue m:(',' __ KeyframeValue)* { return list(n, m, 2) }

KeyframeValue
  = 'from'
  / 'to'
  / $([0-9]+ '%')

Content
  = Element
  / Block
  / Directive
  / Exp

Directive
  = Each
  / If

Each
  = '@each' __ v:Variable __ i:EachIndex? 'in' __ e:Exp __ body:Content {
    return { type: 'each', variable: v.name, index: i, expression: e, body: body }
  }

EachIndex
  = (','__ i:Variable __) { return i.name }

If
  = '@if' __ c:Exp _ con:Content __ alt:Else? {
    return { type: 'if', condition: c, consequent: con, alternate: alt }
  }

Else
  = '@else' __ alt:Content {
    return alt
  }

Block
  = '{' __ c:BlockContent* '}' {
    return addContent({ type: 'block' }, c)
  }

BlockContent
  = c:(Content / Attribute) __ { return c }

Exp
  = TernaryExpression
// = Element
  // Element
  // Block

TernaryExpression
  = exp:BinaryExpression __ '?' __ truthy:Exp __ ':' __ falsy:Exp {
    return { type: 'ternary', expression: exp, truthy: truthy, falsy: falsy }
  }
  / RangeExpression
  / BinaryExpression

RangeExpression "range"
  = s:BinaryExpression '..' e:BinaryExpression {
    return { type: 'range', start: s, end: e }
  }

BinaryExpression
  = left:UnaryExpression __ op:BinaryOperator __ right:BinaryExpression {
    return { type: 'binary', op: op.trim(), left: left, right: right }
  }
  / UnaryExpression

BinaryOperator "operator"
  = '*'
  / '/ '
  / '%'
  / '+'
  / '- '
  / '=='
  / '<='
  / '>='
  / '!='
  / '||'
  / '&&'
  / '<'
  / '>'

UnaryExpression
  = CallExpression
  / op:UnaryOperator __ exp:PrimaryExpression {
    return { type: 'unary', op: op, expression: exp }
  }
  / PrimaryExpression

UnaryOperator "operator"
  = '-'
  / '!'


CallExpression "call"
  = first:(
      callee:(MemberExpression / Identifier) __ args:Arguments {
        return { type: 'call', callee: callee, arguments: args }
      }
    )
    rest:(
        __ args:Arguments {
          return { type: 'call', arguments: args }
        }
      / __ '.' __ property:Identifier {
          return { type: 'member', property: property }
        }
      / __ '[' __ property:Exp __ ']' {
          return { type: 'member', property: property }
        }
    )*
    {
      return tree(first, rest, function(result, element) {
        if (element.type == 'call') element.callee = result
        else element.object = result
        return element
      })
    }
  / MemberExpression

Arguments
  = '(' __ args:ArgumentList __ ')' { return args }

ArgumentList
  = n:Argument? m:(__ ',' __ Argument)* { return list(n, m, 3) }

Argument
  = Exp
  / Identifier
  / Block

MemberExpression "member"
  = o:PrimaryExpression
    m:(
        __ '.' __ p:Identifier { return { name: p } }
      / __ '[' __ p:Exp __ ']' { return { name: p } }
    )+ {
    return tree(o, m, function(result, el) {
      return { type: 'member', object: result, property: el.name }
    })
  }
  / PrimaryExpression

PrimaryExpression
  = Variable
  / Literal
  / Group
  // Identifier

Identifier "identifier"
  = $('-'+ [a-z_]i / [a-z0-9_]i)+

Variable "variable"
  = '$' name:Identifier {
    return { type: 'variable', name: name }
  }

Group
  = '(' __ exp:Exp __ ')' {
    return { type: 'group', expression: exp }
  }

Literal
  = NullLiteral
  / BooleanLiteral
  / DecimalLiteral
  / StringLiteral
  / PathLiteral

PathLiteral "path"
  = [a-z0-9_.-]i* '/' [a-z0-9_./-]i+ {
    return { type: 'path', path: text() }
  }

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
  = '"' chars:DoubleStringCharacter* '"' {
    return chars.join('')
  }
  / "'" chars:SingleStringCharacter* "'" {
    return chars.join('')
  }
  / "´" tokens:TemplateStringToken* "´" {
    return { type: 'value', tokens: tokens }
  }

DoubleStringCharacter
  = !('"' / '\\"' / LineTerminator) . { return text() }
  / '\\"'. { return '"' }

SingleStringCharacter
  = !("'" / "\\'" / LineTerminator) . { return text() }
  / "\\'". { return "'" }

TemplateStringCharacter
  = !("´" / "\\´" / "\\{" / "{{") . { return text() }
  / "\\{" { return "\x7B" }
  / "\\´" { return "´" }

TemplateStringToken
  = TemplateStringCharacter+ { return text() }
  / '{{' _ e:Exp _ '}}' { return e }

EOS
  = (';' / WhiteSpace / LineTerminatorSequence / Comment)*

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

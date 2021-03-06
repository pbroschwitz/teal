/* ---- Helper Functions ---- */

{

  var h = options.helpers
  var list = h.list
  var tree = h.tree
  var flatten = h.flatten

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
  = __ d:Doctype? __ NoSettings* r:Root? __ EOF {
    var doc = { type: 'root', root: r }
    if (d) doc.doctype = d
    return doc
  }

NoSettings
  = s:(Keyframes / FontFace / Const) __ { error('ERROR: ' + s.type + ' directives are only allowed in files whoes name starts with an underscore.') }


/* Alternative start rule for _*.tl files */

StartSettings
  = __ s:Settings* EOF {
    return { type: 'root', settings: s }
  }

Settings
  = s:(Keyframes / FontFace / Const / DefaultStyle) __ { return s }

DefaultStyle
  = sel:DefaultSelectors __ decl:Block {
    return pos({ type: 'defaults', selectors: sel, declarations: decl })
  }

DefaultSelectors
  = n:DefaultSelector m:(',' __ DefaultSelector)* { return list(n, m, 2) }

DefaultSelector
  = ["a-z0-9*\[\]() =:-]+ { return text().trim() }

Const
  = '@const' __ decl:Declarations {
    return { type: 'const', declarations: decl }
  }

Doctype
 = '@doctype' __ '{' name:$(!'}' .)* '}' { return name.trim() }

Root
  = Mixin
  / Element

Mixin
  = '@mixin' __ c:Block {
    return { type: 'mixin', content: c }
  }

Element
  = name:Tag _ cls:ClassName? c:Block {
    var el = { type: 'element', name: name, content: c }
    if (cls) el.class = cls
    return pos(el)
  }

Tag
  = PathLiteral
  / Identifier
  / '@element' __ e:Exp __ {
    return e
  }

ClassName
  = '#' _ n:Identifier _ { return n }

Content
  = c:(
    Declaration
    / Style
    / Media
    / Sheet
    / Animation
    / Element
    / Exp
    / Attribute
  ) __ {
    return c.type == 'path' ? { type: 'element', name: c } : c
  }

Block = '{' __ c:Content* '}' {
    return c
  }

Attribute
  = name:Identifier _ '=' __ value:Exp {
    return { type: 'attribute', name: name, value: value }
  }
  / name:Identifier {
    return { type: 'attribute', name: name, value: true }
  }

Declarations = '{' __ d:Declaration* __ '}' {
    return d
  }

Declaration
  = n:PropertyName _ ':' __ v:PropertyValue __ {
    return pos({ type: 'declaration', property: n, value: v })
  }

PropertyName "property name"
  = $([a-z-]i [a-z0-9_-]i*)

PropertyValue
  = t:(CssFunction / CssToken / [()] )+ {
    return t.length < 2 ? t[0] : { type: 'tokens', tokens: t }
  }

CssToken
  = '-'
  / $(! ([{;}()] / WhiteSpace / LineTerminatorSequence) . )+
  / $( (WhiteSpace / LineTerminatorSequence)+ ! [{;}] )

CssFunction
  = n:Identifier '(' __ a:(CssFunction / CssToken / ';')+ __ ')' {
    var arg = a.length < 2 ? a[0] : { type: 'tokens', tokens: a }
    return { type: 'function', name: n, arg: arg }
  }

Style
 = sel:Selectors __ decl:Block {
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

Media
  = '@media' __ mq:PropertyValue __ decl:Block {
    return pos({ type: 'media', media: mq, declarations: decl })
  }

Sheet
  = '@sheet' __ name:Identifier __ decl:Block {
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
  = v:KeyframeValues __ decl:Declarations __ {
    return { type: 'keyframe', values: v, declarations: decl }
  }

KeyframeValues
  = n: KeyframeValue m:(',' __ KeyframeValue)* { return list(n, m, 2) }

KeyframeValue
  = 'from'
  / 'to'
  / $([0-9]+ '%')

FontFace
  = '@font-face' __ decl:Declarations {
    return pos({ type: 'font', declarations: decl })
  }

Variable "variable"
  = '$' name:Identifier {
    return { type: 'variable', name: name }
  }

Group
  = '(' __ exp:Exp __ ')' {
    return { type: 'group', expression: exp }
  }

Identifier "identifier"
  = $( [a-z_]i [a-z0-9_-]i* )


Exp
  = Element
  / BlockLiteral
  / If
  / Each
  / TernaryExpression

Each
  = '@each' __  v:Variable __  i:((','__ v:Variable __) { return v.name })?
    'in' __ e:Exp __ body:Exp {
      return { type: 'each', variable: v.name, index: i, expression: e, body: body }
  }

If
  = '@if' __ c:Group _ con:Exp __ alt:('@else' __ e:Exp { return e })? {
    return { type: 'if', condition: c.expression, consequent: con, alternate: alt }
  }

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
  / op:UnaryOperator __ exp:UnaryExpression {
    return { type: 'unary', op: op, expression: exp }
  }
  / PrimaryExpression

UnaryOperator "operator"
  = '-'
  / '!'


CallExpression "call"
  = first:(
      callee:(MemberExpression / Identifier) _ args:Arguments {
        return { type: 'call', callee: callee, arguments: args }
      }
    )
    rest:(
        args:Arguments {
          return { type: 'call', arguments: args }
        }
      / '.' __ property:Identifier {
          return { type: 'member', property: property }
        }
      / '[' __ property:Exp __ ']' {
          return { type: 'member', property: property, dynamic: true }
        }
    )*
    {
      // mark member as method, as hint for runtimes like PHP where the
      // syntax for accessing members is different from array access
      if (first.callee.type == 'member') first.callee.method = true

      return tree(first, rest, function(result, element) {
        if (element.type == 'call') {
          element.callee = result
          if (result.type == 'member') result.method = true
        }
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

MemberExpression "member"
  = o:PrimaryExpression
    m:(
        '.' __ p:Identifier { return { name: p } }
      / '[' __ p:Exp __ ']' { return { name: p, dynamic: true } }
    )+ {
    return tree(o, m, function(result, el) {
      var e = { type: 'member', object: result, property: el.name }
      if (el.dynamic) e.dynamic = true
      return e
    })
  }
  / PrimaryExpression

PrimaryExpression
  = Variable
  / Literal
  / Group

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

BlockLiteral
  = '{' __ content:BlockItem* '}' {
    return { type: 'block', content: content }
  }

BlockItem
  = item:(Exp / Attribute) __ { return item }

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

__ "whitespace"
  = (WhiteSpace / LineTerminatorSequence / Comment / ';')*

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

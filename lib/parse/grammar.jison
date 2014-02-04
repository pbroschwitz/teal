%lex

IDENT \w[\w_-]*
PATH ([\w_-]|\.)*\/[\w/_-]+

%s squot dquot
%x media tag line

%%

/***************** Double-quoted strings ****/
<dquot>\\\"        yytext = '"'; this.more()
<dquot>\"          this.popState(); yytext=yytext.slice(0, -1); return 'STRING'
<dquot>.           this.more()
\"                 this.begin('dquot');

/***************** Single-quoted strings ****/
<squot>\\\'        yytext = "'"; this.more()
<squot>\'          this.popState(); yytext=yytext.slice(0, -1); return 'STRING'
<squot>.           this.more()
\'                 this.begin('squot')

/***************** TOKENS ****/
<line>\\\n         yytext = '\n'; this.more()
/* FIX FOR JISON OFF-BY-ONE BUG: */
<line>[;\n}]       this.popState(); var fix = yytext.slice(-2,-1); this.less(yyleng-1); yytext += fix; return 'TOKEN'
<line>.            this.more()

<media>[^\{]+      return 'TOKEN'
<media>\{\s*       this.popState(); return '{'

/***************** $var ****/
\${IDENT}?         yytext = yytext.slice(1); return 'VAR'

/***************** property: ****/
[\w-]+[ \t]*\:     this.begin('line'); yytext=yytext.slice(0, -1).trim(); return 'PROP'

/***************** .class ****/
\.{IDENT}          return 'CLASS'

/***************** :pseudo ****/
\:\:?{IDENT}       return 'PSEUDO'

/***************** [attr] ****/
\[[^\]]+\]         return 'ATTR'

/***************** foo/bar ****/
{PATH}             return 'PATH'

{IDENT}\.          this.begin('tag'); yytext = yytext.slice(0, -1); return 'IDENT'
<tag>{IDENT}       this.popState(); return 'CLASSNAME'

\-?\d+             return 'NUMBER'
{IDENT}(?=\()      return 'FUNC'
{IDENT}            return 'IDENT'

"--"               return '--'
","                return ','
"("                return '('
")"                return ')'
"{"                return '{'
"}"                return '}'

"-"                return '-'
"+"                return '+'
"*"                return '*'
"/"                return '/'
"%"                return '%'

"!="               return '!='
"!"                return '!'
"=="               return '=='
">="               return '>='
">"                return '>'
"<="               return '<='
"<"                return '<'
"("                return '('
")"                return ')'
"&&"               return '&&'
"||"               return '||'
"="                return '='
"?"                return '?'
":"                return ':'

"@if"              return 'IF'
"@else"            return 'ELSE'
"@each"            return 'EACH'

\@media\s+         this.begin('media'); return 'MEDIA'

[\s;]+             /* ignore */
<<EOF>>            return 'EOF'
/lex

/* --- Parser -------------------------------------------------------------- */

%ebnf

%left '?' '==' '!=' '<=' '<' '>=' '>'
%left '||' '&&' '!'
%left '+' '-'
%left '*' '/' '%'

%right THEN ELSE

%start Root
%%

Root
  : Assignment* Element? EOF {
    $2.class = yy.class
    return {
      type: 'root',
      variables: $1,
      root: $2,
      file: yy.file,
      deps: yy.deps
    }
  };

Assignment
  : Variable '=' Exp -> { type: 'assignment', variable: $1.name, value: $3 }
  ;

Exp
  : STRING
  | NUMBER
  | Variable
  | Macro
  | Exp '+' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '-' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '*' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '/' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '%' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '>' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '<' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '>=' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '<=' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '==' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '!=' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '||' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '&&' Exp -> { type: $2, left: $1, right: $3 }
  | Exp '?' Exp ':' Exp -> { type: 'ternary', expression: $1, truthy: $3, falsy: $5 }
  | '!' Exp -> { type: 'not', expression: $2 }
  | '(' Exp ')' -> { type: 'group', expression: $2 }
  ;

Fragment
  : Declarations -> yy.pos({ type: 'fragment', content: $1 }, @1, @1)
  ;

Element
  : IDENT CLASSNAME? '{' Declaration* '}'
    -> yy.pos({ type: 'element', tag: $1, class: $2, declarations: $4}, @1, @5)
  | Reference
  ;

Reference
  : PATH '{' Declaration* '}' {
    $$ = yy.pos({
      type: 'reference',
      path: yy.dep($1),
      declarations: $3,
      params: yy.grep($3, 'attribute'),
      content: yy.pluck(yy.grep($3, 'content'), 'content')
    }, @1, @4)
  };

Attribute
  : IDENT '=' Exp -> { type: 'attribute', name: $1, value: $3 }
  | IDENT         -> { type: 'attribute', name: $1, value: $1 }
  ;

Declaration
  : Style
  | Content -> yy.pos({ type: 'content', content: $1 }, @1, @1)
  | Directive
  | Property
  | Attribute
  | Media
  ;

StyleDeclarations
  : '{' Property* '}' -> $2
  ;

Style
  : (Selector ',')* Selector StyleDeclarations {
    var sel = $1.concat($2)
    var states = sel
      .filter(function(s) { return s[0] == '.' })
      .map(function(s) { return s.slice(1) })

    $$ = yy.pos({
      type: 'style',
      selectors: sel,
      states: states,
      declarations: $3
    }, @1, @3)
  };

Selector
  : CLASS
  | PSEUDO
  | ATTR
  ;

Content
  : Exp
  | Element
  | Comment
  ;

Comment
  : '--' Exp -> { type: 'comment', text: $2 }
  ;

Variable
  : VAR -> { type: 'var', name: $1 }
  ;

Property
  : PROP TOKEN -> yy.pos({ type: 'property', name: $1, value: $2.trim() }, @1, @2)
  ;

Macro
  : FUNC '(' (Exp ',')* Exp? ')'
    -> $$ = yy.expand($1, $3.concat($4))
  ;

Directive
  : If
  | Each
  ;

If
  : IF '(' Exp ')' Action %prec THEN
    -> $$ = { type: 'if', condition: $3, then: $5 }
  | IF '(' Exp ')' Action ELSE Action
    -> $$ = { type: 'if', condition: $3, then: $5, else: $7 }
  ;

Each
  : EACH Exp Action
    -> { type: 'each', expression: $2, body: { type: 'content', content: $3 }}
  ;

Action
  : Content
  | Directive
  ;

Media
  : MEDIA TOKEN StyleDeclarations
    -> $$ = yy.pos({ type: 'media', media: $2, declarations: $3 }, @1, @3)
  ;

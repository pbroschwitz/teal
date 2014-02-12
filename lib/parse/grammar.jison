%lex

IDENT \w[\w_-]*
VAR \w[\w_\.]*
PATH ([\w_-]|\.)*\/[\w/_-]+
ANY [\s\S]

%x squot dquot media tag line

%%

/***************** strings ****/
\"                 this.begin('dquot')
\'                 this.begin('squot')
<dquot>\\\"        yytext = '"'; this.more()
<squot>\\\'        yytext = "'"; this.more()
<dquot>\"          this.popState(); yytext=yytext.slice(0, -1); return 'STRING'
<squot>\'          this.popState(); yytext=yytext.slice(0, -1); return 'STRING'
<squot,dquot>\\\n  yytext=yytext.slice(0, -2); this.more()
<squot,dquot>{ANY} this.more()

\/\*{ANY}*?\*\/    /* multi-line comment */

/***************** tokens ****/
<line>\\\n         yytext = '\n'; this.more()
/* FIX FOR JISON OFF-BY-ONE BUG: */
<line>[;\n}]       this.popState(); var fix = yytext.slice(-2,-1); this.less(yyleng-1); yytext += fix; return 'TOKEN'
<line>.            this.more()

<media>[^\{]+      return 'TOKEN'
<media>\{\s*       this.popState(); return '{'

/***************** $var ****/
\${VAR}?           yytext = yytext.slice(1); return 'VAR'

/***************** property: ****/
[\w-]+[ \t]*\:     this.begin('line'); yytext=yytext.slice(0, -1).trim(); return 'PROP'

/***************** .class ****/
\.{IDENT}          return 'CLASS'

/***************** :[attr] ****/
\:\[[^\]]+\]       return 'ATTR'

/***************** :pseudo ****/
\:(\:|{IDENT})+    return 'PSEUDO'

/***************** ^^^ ****/
\^+                return 'PARENT'

/***************** ./foo() ****/
{PATH}(?=\()       return 'MODULE'

/***************** foo/bar ****/
{PATH}             return 'PATH'

"true"             return 'TRUE'
"false"            return 'FALSE'

{IDENT}\.          this.begin('tag'); yytext = yytext.slice(0, -1); return 'IDENT'
<tag>{IDENT}       this.popState(); return 'CLASSNAME'

\-?\d+             return 'NUMBER'
{IDENT}(?=\()      return 'FUNC'
{IDENT}            return 'IDENT'

"--"               return '--'
","                return ','
"("                return '('
")"                return ')'
"["                return '['
"]"                return ']'
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
"|"                return '|'
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

%left '?' '==' '!=' '<=' '<' '>=' '>' '|'
%left '||' '&&' '!'
%left '+' '-'
%left '*' '/' '%'

%right THEN ELSE

%start Root
%%

Root
  : Assignment* (Element|Fragment)? EOF {
    return {
      type: 'root',
      variables: $1,
      root: $2,
    }
  };

Assignment
  : Variable '=' Exp -> { type: 'assignment', variable: $1.name, value: $3 }
  ;

Values
  : Exp -> [$1]
  | Exp ',' Values -> [$1].concat($3)
  ;

Exp
  : Variable
  | Macro
  | STRING
  | NUMBER
  | TRUE -> true
  | FALSE -> false
  | '[' Values ']' -> { type: 'array', items: $2 }
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
  | Exp '|' Exp -> { type: 'default', expression: $1, default: $3 }
  | '!' Exp -> { type: 'not', expression: $2 }
  | '(' Exp ')' -> { type: 'group', expression: $2 }
  ;

Fragment
  : Declarations -> yy.pos({ type: 'fragment', content: $1 }, @1, @1)
  ;

Element
  : IDENT CLASSNAME? Declarations
    -> yy.pos({ type: 'element', tag: $1, class: $2, declarations: $3 }, @1, @3)
  | Reference
  | Module
  ;

Module
  : MODULE '(' Values? ')' -> { type: 'module', path: $1, arguments: $3 }
  ;

Reference
  : PATH Declarations?
    -> yy.pos({ type: 'reference', path: $1, declarations: $2 }, @1, @2)
  ;

Attribute
  : IDENT '=' (Exp|Fragment) -> { type: 'attribute', name: $1, value: $3 }
  | IDENT         -> { type: 'attribute', name: $1, value: true }
  ;

Declarations
  : '{' Declaration* '}' -> $2
  ;

Declaration
  : Style
  | Content
  | Directive
  | Property
  | Attribute
  | Media
  ;

StyleDeclarations
  : '{' (Property|Style)* '}' -> $2
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
  | PARENT Selector -> { parent: $1.length, selector: $2 }
  ;

Content
  : (Exp|Element|Comment) -> yy.pos({ type: 'content', content: $1 }, @1, @1)
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
  : FUNC '(' Values? ')' -> yy.expand($1, $3)
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
    -> { type: 'each', expression: $2, body: $3 }
  ;

Action
  : Content
  | Directive
  ;

Media
  : MEDIA TOKEN StyleDeclarations
    -> $$ = yy.pos({ type: 'media', media: $2, declarations: $3 }, @1, @3)
  ;

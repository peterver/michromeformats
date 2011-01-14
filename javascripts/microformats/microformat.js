// Generic Microformat Parser v0.1 Dan Webb (dan@danwebb.net)
// Licenced under the MIT Licence
// 
// var people = HCard.discover();
// people[0].fn => 'Dan Webb'
// people[0].urlList => ['http://danwebb.net', 'http://eventwax.com']
//
// TODO
//
// Fix _propFor to work with old safari
// Find and use unit testing framework on microformats.org test cases
// isue with hcard email?
// More formats: HFeed, HEntry, HAtom, RelTag, XFN?

Microformat = {
  define: function (name, spec) {
    var mf = function (node, data) {
      Microformat.extend(this, data);
    };
    mf.container = name;
    mf.format = spec;
    mf.prototype = Microformat.Base;
    return Microformat.extend(mf, Microformat.SingletonMethods);
  },
  SingletonMethods: {
    discover: function (context) {
      return Microformat.$$(this.container, context).map(function (node) {
        return new this(node, this._parse(this.format, node));
      }, this);
    },
    _parse: function (format, node) {
      var data = {};
      this._process(data, format.one, node, true);
      this._process(data, format.many, node);
      return data;
    },
    _process: function (data, format, context, firstOnly) {
      var selection, first;
      format = format || [];
      format.forEach(function (item) {
        if (typeof item == 'string') {
          selection = Microformat.$$(item, context);
          if (firstOnly && (first = selection[0])) {
            data[this._propFor(item)] = this._extractData(first, 'simple', data);
          } else if (selection.length > 0) {
            data[this._propFor(item)] = selection.map(function (node) {
              return this._extractData(node, 'simple', data);
            }, this);
          }
        } else {
          for (var cls in item) {
            selection = Microformat.$$(cls, context);
            if (firstOnly && (first = selection[0])) {
              data[this._propFor(cls)] = this._extractData(first, item[cls], data);
            } else if (selection.length > 0) {
              data[this._propFor(cls)] = selection.map(function (node) {
                return this._extractData(node, item[cls], data);
              }, this);
            }
          }
        }
      }, this);
      return data;
    },
    _extractData: function (node, dataType, data) {
      if (dataType._parse) return dataType._parse(dataType.format, node);
      if (typeof dataType == 'function') return dataType.call(this, node, data);
      var values = Microformat.$$('value', node);
      if (values.length > 0) return this._extractClassValues(node, values);
      switch (dataType) {
      case 'simple':
        return this._extractSimple(node);
      case 'url':
        return this._extractURL(node);
      }
      return this._parse(dataType, node);
    },
    _extractURL: function (node) {
      var href;
      switch (node.nodeName.toLowerCase()) {
      case 'img':
        href = node.src;
        break;
      case 'area':
      case 'a':
        href = node.href;
        break;
      case 'object':
        href = node.data;
      }
      if (href) {
        if (href.indexOf('mailto:') == 0) href = href.replace(/^mailto:/, '').replace(/\?.*$/, '');
        return sanitize(href).xss();
      }
      return this._coerce(this._getText(node));
    },
    _extractSimple: function (node) {
      switch (node.nodeName.toLowerCase()) {
      case 'abbr':
        return this._coerce(node.title);
      case 'img':
        return this._coerce(node.alt);
      }
      return this._coerce(this._getText(node));
    },
    _extractClassValues: function (node, values) {
      var value = new String(values.map(function (value) {
        return this._extractSimple(value);
      }, this).join(''));
      var types = Microformat.$$('type', node);
      var t = types.map(function (type) {
        return this._extractSimple(type);
      }, this);
      value.types = t;
      return value;
    },
    _getText: function (node) {
      if (node.textContent || node.textContent == "") return node.textContent;
      return node.childNodes.map(function (node) {
        if (node.nodeType == 3) return node.nodeValue;
        else return this._getText(node);
      }, this).join('').replace(/\s+/g, ' ').replace(/(^\s+)|(\s+)$/g, '');
    },
    _coerce: function (value) {
      var date, number;
      if (value == 'true') return true;
      if (value == 'false') return false;
      return String(value);
    },
    _propFor: function (name) {
      this.__propCache = this.__propCache || {};
      if (prop = this.__propCache[name]) return prop;
      return this.__propCache[name] = name;
    },
    _handle: function (prop, item, data) {
      if (this.handlers[prop]) this.handlers[prop].call(this, item, data);
    }
  },
  $$: function (className, context) {
    context = context || document;
    var nodeList;
    if (context == document || context.nodeType == 1) {
      if (typeof document.evaluate == 'function') {
        var xpath = document.evaluate(".//*[contains(concat(' ', @class, ' '), ' " + className + " ')]", context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var els = [];
        for (var i = 0, l = xpath.snapshotLength; i < l; i++)
        els.push(xpath.snapshotItem(i));
        return els;
      } else nodeList = context.getElementsByTagName('*');
    } else nodeList = context;
    var re = new RegExp('(^|\\s)' + className + '(\\s|$)');
    return Array.filter(nodeList, function (node) {
      return node.className.match(re);
    });
  },
  extend: function (dest, source) {
    for (var prop in source) dest[prop] = source[prop];
    return dest;
  },
  Base: {}
};

/*
 * Copyright (c) 2010 Chris O'Hara <cohara87@gmail.com>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
(function(h){var k={"&nbsp;":"\u00a0","&iexcl;":"\u00a1","&cent;":"\u00a2","&pound;":"\u00a3","&curren;":"\u20ac","&yen;":"\u00a5","&brvbar;":"\u0160","&sect;":"\u00a7","&uml;":"\u0161","&copy;":"\u00a9","&ordf;":"\u00aa","&laquo;":"\u00ab","&not;":"\u00ac","&shy;":"\u00ad","&reg;":"\u00ae","&macr;":"\u00af","&deg;":"\u00b0","&plusmn;":"\u00b1","&sup2;":"\u00b2","&sup3;":"\u00b3","&acute;":"\u017d","&micro;":"\u00b5","&para;":"\u00b6","&middot;":"\u00b7","&cedil;":"\u017e","&sup1;":"\u00b9","&ordm;":"\u00ba","&raquo;":"\u00bb","&frac14;":"\u0152","&frac12;":"\u0153","&frac34;":"\u0178","&iquest;":"\u00bf","&Agrave;":"\u00c0","&Aacute;":"\u00c1","&Acirc;":"\u00c2","&Atilde;":"\u00c3","&Auml;":"\u00c4","&Aring;":"\u00c5","&AElig;":"\u00c6","&Ccedil;":"\u00c7","&Egrave;":"\u00c8","&Eacute;":"\u00c9","&Ecirc;":"\u00ca","&Euml;":"\u00cb","&Igrave;":"\u00cc","&Iacute;":"\u00cd","&Icirc;":"\u00ce","&Iuml;":"\u00cf","&ETH;":"\u00d0","&Ntilde;":"\u00d1","&Ograve;":"\u00d2","&Oacute;":"\u00d3","&Ocirc;":"\u00d4","&Otilde;":"\u00d5","&Ouml;":"\u00d6","&times;":"\u00d7","&Oslash;":"\u00d8","&Ugrave;":"\u00d9","&Uacute;":"\u00da","&Ucirc;":"\u00db","&Uuml;":"\u00dc","&Yacute;":"\u00dd","&THORN;":"\u00de","&szlig;":"\u00df","&agrave;":"\u00e0","&aacute;":"\u00e1","&acirc;":"\u00e2","&atilde;":"\u00e3","&auml;":"\u00e4","&aring;":"\u00e5","&aelig;":"\u00e6","&ccedil;":"\u00e7","&egrave;":"\u00e8","&eacute;":"\u00e9","&ecirc;":"\u00ea","&euml;":"\u00eb","&igrave;":"\u00ec","&iacute;":"\u00ed","&icirc;":"\u00ee","&iuml;":"\u00ef","&eth;":"\u00f0","&ntilde;":"\u00f1","&ograve;":"\u00f2","&oacute;":"\u00f3","&ocirc;":"\u00f4","&otilde;":"\u00f5","&ouml;":"\u00f6","&divide;":"\u00f7","&oslash;":"\u00f8","&ugrave;":"\u00f9","&uacute;":"\u00fa","&ucirc;":"\u00fb","&uuml;":"\u00fc","&yacute;":"\u00fd","&thorn;":"\u00fe","&yuml;":"\u00ff","&quot;":"\u0022","&lt;":"\u003c","&gt;":"\u003e","&apos;":"\u0027","&minus;":"\u2212","&circ;":"\u02c6","&tilde;":"\u02dc","&Scaron;":"\u0160","&lsaquo;":"\u2039","&OElig;":"\u0152","&lsquo;":"\u2018","&rsquo;":"\u2019","&ldquo;":"\u201c","&rdquo;":"\u201d","&bull;":"\u2022","&ndash;":"\u2013","&mdash;":"\u2014","&trade;":"\u2122","&scaron;":"\u0161","&rsaquo;":"\u203a","&oelig;":"\u0153","&Yuml;":"\u0178","&fnof;":"\u0192","&Alpha;":"\u0391","&Beta;":"\u0392","&Gamma;":"\u0393","&Delta;":"\u0394","&Epsilon;":"\u0395","&Zeta;":"\u0396","&Eta;":"\u0397","&Theta;":"\u0398","&Iota;":"\u0399","&Kappa;":"\u039a","&Lambda;":"\u039b","&Mu;":"\u039c","&Nu;":"\u039d","&Xi;":"\u039e","&Omicron;":"\u039f","&Pi;":"\u03a0","&Rho;":"\u03a1","&Sigma;":"\u03a3","&Tau;":"\u03a4","&Upsilon;":"\u03a5","&Phi;":"\u03a6","&Chi;":"\u03a7","&Psi;":"\u03a8","&Omega;":"\u03a9","&alpha;":"\u03b1","&beta;":"\u03b2","&gamma;":"\u03b3","&delta;":"\u03b4","&epsilon;":"\u03b5","&zeta;":"\u03b6","&eta;":"\u03b7","&theta;":"\u03b8","&iota;":"\u03b9","&kappa;":"\u03ba","&lambda;":"\u03bb","&mu;":"\u03bc","&nu;":"\u03bd","&xi;":"\u03be","&omicron;":"\u03bf","&pi;":"\u03c0","&rho;":"\u03c1","&sigmaf;":"\u03c2","&sigma;":"\u03c3","&tau;":"\u03c4","&upsilon;":"\u03c5","&phi;":"\u03c6","&chi;":"\u03c7","&psi;":"\u03c8","&omega;":"\u03c9","&thetasym;":"\u03d1","&upsih;":"\u03d2","&piv;":"\u03d6","&ensp;":"\u2002","&emsp;":"\u2003","&thinsp;":"\u2009","&zwnj;":"\u200c","&zwj;":"\u200d","&lrm;":"\u200e","&rlm;":"\u200f","&sbquo;":"\u201a","&bdquo;":"\u201e","&dagger;":"\u2020","&Dagger;":"\u2021","&hellip;":"\u2026","&permil;":"\u2030","&prime;":"\u2032","&Prime;":"\u2033","&oline;":"\u203e","&frasl;":"\u2044","&euro;":"\u20ac","&image;":"\u2111","&weierp;":"\u2118","&real;":"\u211c","&alefsym;":"\u2135","&larr;":"\u2190","&uarr;":"\u2191","&rarr;":"\u2192","&darr;":"\u2193","&harr;":"\u2194","&crarr;":"\u21b5","&lArr;":"\u21d0","&uArr;":"\u21d1","&rArr;":"\u21d2","&dArr;":"\u21d3","&hArr;":"\u21d4","&forall;":"\u2200","&part;":"\u2202","&exist;":"\u2203","&empty;":"\u2205","&nabla;":"\u2207","&isin;":"\u2208","&notin;":"\u2209","&ni;":"\u220b","&prod;":"\u220f","&sum;":"\u2211","&lowast;":"\u2217","&radic;":"\u221a","&prop;":"\u221d","&infin;":"\u221e","&ang;":"\u2220","&and;":"\u2227","&or;":"\u2228","&cap;":"\u2229","&cup;":"\u222a","&int;":"\u222b","&there4;":"\u2234","&sim;":"\u223c","&cong;":"\u2245","&asymp;":"\u2248","&ne;":"\u2260","&equiv;":"\u2261","&le;":"\u2264","&ge;":"\u2265","&sub;":"\u2282","&sup;":"\u2283","&nsub;":"\u2284","&sube;":"\u2286","&supe;":"\u2287","&oplus;":"\u2295","&otimes;":"\u2297","&perp;":"\u22a5","&sdot;":"\u22c5","&lceil;":"\u2308","&rceil;":"\u2309","&lfloor;":"\u230a","&rfloor;":"\u230b","&lang;":"\u2329","&rang;":"\u232a","&loz;":"\u25ca","&spades;":"\u2660","&clubs;":"\u2663","&hearts;":"\u2665","&diams;":"\u2666"};var a=function(q){if(!~q.indexOf("&")){return q}for(var p in k){q=q.replace(new RegExp(p,"g"),k[p])}q=q.replace(/&#x(0*[0-9a-f]{2,5});?/gi,function(r,s){return String.fromCharCode(parseInt(+s,16))});q=q.replace(/&#([0-9]{2,4});?/gi,function(r,s){return String.fromCharCode(+s)});q=q.replace(/&amp;/g,"&");return q};var l=function(q){q=q.replace(/&/g,"&amp;");for(var p in k){q=q.replace(new RegExp(k[p],"g"),p)}return q};h.entities={encode:l,decode:a};var g={"document.cookie":"[removed]","document.write":"[removed]",".parentNode":"[removed]",".innerHTML":"[removed]","window.location":"[removed]","-moz-binding":"[removed]","<!--":"&lt;!--","-->":"--&gt;","<![CDATA[":"&lt;![CDATA["};var m={"javascript\\s*:":"[removed]","expression\\s*(\\(|&\\#40;)":"[removed]","vbscript\\s*:":"[removed]","Redirect\\s+302":"[removed]"};var o=[/%0[0-8bcef]/g,/%1[0-9a-f]/g,/[\x00-\x08]/g,/\x0b/g,/\x0c/g,/[\x0e-\x1f]/g];var i=["javascript","expression","vbscript","script","applet","alert","document","write","cookie","window"];h.xssClean=function(u,p){if(typeof u==="array"||typeof u==="object"){for(var r in u){u[r]=xssClean(u[r])}return u}u=j(u);u=u.replace(/\&([a-z\_0-9]+)\=([a-z\_0-9]+)/i,f()+"$1=$2");u=u.replace(/(&\#?[0-9a-z]{2,})([\x00-\x20])*;?/i,"$1;$2");u=u.replace(/(&\#x?)([0-9A-F]+);?/i,"$1;$2");u=u.replace(f(),"&");u=decodeURIComponent(u);u=u.replace(/[a-z]+=([\'\"]).*?\\1/gi,function(v,w){return v.replace(w,d(w))});u=u.replace(/<\w+.*?(?=>|<|$)/gi,function(v,w){});u=j(u);u=u.replace("\t"," ");var t=u;for(var r in g){u=u.replace(r,g[r])}for(var r in m){u=u.replace(new RegExp(r,"i"),m[r])}for(var r in i){var s=i[r].split("").join("\\s*")+"\\s*";u=u.replace(new RegExp("("+s+")(\\W)","ig"),function(v,w,x){return w.replace(/\s+/g,"")+x})}do{var q=u;if(u.match(/<a/i)){u=u.replace(/<a\\s+([^>]*?)(>|$)/gi,function(v,w,x){w=n(w.replace("<","").replace(">",""));return v.replace(w,w.replace(/href=.*?(alert\(|alert&\#40;|javascript\:|charset\=|window\.|document\.|\.cookie|<script|<xss|base64\\s*,)/gi,""))})}if(u.match(/<img/i)){u=u.replace(/<img\\s+([^>]*?)(\\s?\/?>|$)/gi,function(v,w,x){w=n(w.replace("<","").replace(">",""));return v.replace(w,w.replace(/src=.*?(alert\(|alert&\#40;|javascript\:|charset\=|window\.|document\.|\.cookie|<script|<xss|base64\\s*,)/gi,""))})}if(u.match(/script/i)||u.match(/xss/i)){u=u.replace(/<(\/*)(script|xss)(.*?)\>/gi,"[removed]")}}while(q!=u);event_handlers=["[^a-z_-]onw*"];if(!p){event_handlers.push("xmlns")}u=u.replace(new RegExp("<([^><]+?)("+event_handlers.join("|")+")(\\s*=\\s*[^><]*)([><]*)","i"),"<$1$4");naughty="alert|applet|audio|basefont|base|behavior|bgsound|blink|body|embed|expression|form|frameset|frame|head|html|ilayer|iframe|input|isindex|layer|link|meta|object|plaintext|style|script|textarea|title|video|xml|xss";u=u.replace(new RegExp("<(/*\\s*)("+naughty+")([^><]*)([><]*)","gi"),function(w,x,v,z,y){return"&lt;"+x+v+z+y.replace(">","&gt;").replace("<","&lt;")});u=u.replace(/(alert|cmd|passthru|eval|exec|expression|system|fopen|fsockopen|file|file_get_contents|readfile|unlink)(\\s*)\((.*?)\)/gi,"$1$2&#40;$3&#41;");for(var r in g){u=u.replace(r,g[r])}for(var r in m){u=u.replace(new RegExp(r,"i"),m[r])}if(p&&u!==t){throw"Image may contain XSS"}return u};function j(q){for(var p in o){q=q.replace(o[p],"")}return q}function f(){return"!*$^#(@*#&"}function d(p){return p.replace(">","&gt;").replace("<","&lt;").replace("\\","\\\\")}function n(p){out="";p.replace(/\\s*[a-z\-]+\\s*=\\s*(?:\042|\047)(?:[^\\1]*?)\\1/gi,function(q){$out+=q.replace(/\/\*.*?\*\//g,"")});return out}var e=h.Validator=function(){};e.prototype.check=function(p,q){this.str=String(p||"");this.msg=q;return this};e.prototype.validate=e.prototype.check;e.prototype.assert=e.prototype.check;e.prototype.error=function(p){throw p};e.prototype.isEmail=function(){if(!this.str.match(/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/)){this.error(this.msg||"Invalid email")}return this};e.prototype.isUrl=function(){if(!this.str.match(/^(?:(?:ht|f)tp(?:s?)\:\/\/|~\/|\/)?(?:\w+:\w+@)?((?:(?:[-\w\d{1-3}]+\.)+(?:com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|edu|co\.uk|ac\.uk|it|fr|tv|museum|asia|local|travel|[a-z]{2}))|((\b25[0-5]\b|\b[2][0-4][0-9]\b|\b[0-1]?[0-9]?[0-9]\b)(\.(\b25[0-5]\b|\b[2][0-4][0-9]\b|\b[0-1]?[0-9]?[0-9]\b)){3}))(?::[\d]{1,5})?(?:(?:(?:\/(?:[-\w~!$+|.,=]|%[a-f\d]{2})+)+|\/)+|\?|#)?(?:(?:\?(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)(?:&(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)*)*(?:#(?:[-\w~!$ |\/.,*:;=]|%[a-f\d]{2})*)?$/)){this.error(this.msg||"Invalid URL")}return this};e.prototype.isIP=function(){if(!this.str.match(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)){this.error(this.msg||"Invalid IP")}return this};e.prototype.isAlpha=function(){if(!this.str.match(/^[a-zA-Z]+$/)){this.error(this.msg||"Invalid characters")}return this};e.prototype.isAlphanumeric=function(){if(!this.str.match(/^[a-zA-Z0-9]+$/)){this.error(this.msg||"Invalid characters")}return this};e.prototype.isNumeric=function(){if(!this.str.match(/^-?[0-9]+$/)){this.error(this.msg||"Invalid number")}return this};e.prototype.isLowercase=function(){if(!this.str.match(/^[a-z0-9]+$/)){this.error(this.msg||"Invalid characters")}return this};e.prototype.isUppercase=function(){if(!this.str.match(/^[A-Z0-9]+$/)){this.error(this.msg||"Invalid characters")}return this};e.prototype.isInt=function(){if(!this.str.match(/^(?:-?(?:0|[1-9][0-9]*))$/)){this.error(this.msg||"Invalid integer")}return this};e.prototype.isDecimal=function(){if(!this.str.match(/^(?:-?(?:0|[1-9][0-9]*))?(?:\.[0-9]*)?$/)){this.error(this.msg||"Invalid decimal")}return this};e.prototype.isFloat=function(){return this.isDecimal()};e.prototype.notNull=function(){if(this.str===""){this.error(this.msg||"Invalid characters")}return this};e.prototype.isNull=function(){if(this.str!==""){this.error(this.msg||"Invalid characters")}return this};e.prototype.notEmpty=function(){if(this.str.match(/^[\s\t\r\n]*$/)){this.error(this.msg||"String is whitespace")}return this};e.prototype.equals=function(p){if(this.str!=p){this.error(this.msg||"Not equal")}return this};e.prototype.contains=function(p){if(this.str.indexOf(p)===-1){this.error(this.msg||"Invalid characters")}return this};e.prototype.notContains=function(p){if(this.str.indexOf(p)>=0){this.error(this.msg||"Invalid characters")}return this};e.prototype.regex=e.prototype.is=function(q,p){if(typeof q!=="function"){q=new RegExp(q,p)}if(!this.str.match(q)){this.error(this.msg||"Invalid characters")}return this};e.prototype.notRegex=e.prototype.not=function(q,p){if(typeof q!=="function"){q=new RegExp(q,p)}if(this.str.match(q)){this.error(this.msg||"Invalid characters")}return this};e.prototype.len=function(q,p){if(this.str.length<q){this.error(this.msg||"String is too small")}if(typeof p!==undefined&&this.str.length>p){this.error(this.msg||"String is too large")}return this};var c=h.Filter=function(){};var b="\\r\\n\\t\\s";c.prototype.modify=function(p){this.str=p};c.prototype.convert=c.prototype.sanitize=function(p){this.str=p;return this};c.prototype.xss=function(p){this.modify(xssClean(this.str,p));return this.str};c.prototype.entityDecode=function(){this.modify(a(this.str));return this.str};c.prototype.entityEncode=function(){this.modify(l(this.str));return this.str};c.prototype.ltrim=function(p){p=p||b;this.modify(this.str.replace(new RegExp("^["+p+"]+","g"),""));return this.str};c.prototype.rtrim=function(p){p=p||b;this.modify(this.str.replace(new RegExp("["+p+"]+$","g"),""));return this.str};c.prototype.trim=function(p){p=p||b;this.modify(this.str.replace(new RegExp("^["+p+"]+|["+p+"]+$","g"),""));return this.str};c.prototype.ifNull=function(p){if(!this.str||this.str===""){this.modify(p)}return this.str};c.prototype.toFloat=function(){this.modify(parseFloat(this.str));return this.str};c.prototype.toInt=function(){this.modify(parseInt(this.str));return this.str};c.prototype.toBoolean=function(){if(!this.str||this.str=="0"||this.str=="false"||this.str==""){this.modify(false)}else{this.modify(true)}return this.str};c.prototype.toBooleanStrict=function(){if(this.str=="1"||this.str=="true"){this.modify(true)}else{this.modify(false)}return this.str};h.sanitize=h.convert=function(q){var p=new h.Filter();return p.sanitize(q)};h.check=h.validate=h.assert=function(q,r){var p=new h.Validator();return p.check(q,r)}})(this);

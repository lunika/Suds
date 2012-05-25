/**
* Suds: A Lightweight JavaScript SOAP Client
* Copyright: 2009 Kevin Whinnery (http://www.kevinwhinnery.com)
* License: http://www.apache.org/licenses/LICENSE-2.0.html
* Source: http://github.com/kwhinnery/Suds
*/
function SudsClient(_options) {
  function isBrowserEnvironment() {
    try {
      if (window && window.navigator) {
        return true;
      } else {
        return false;
      }
    } catch(e) {
      return false;
    }
  }

  function isAppceleratorTitanium() {
    try {
      if (Titanium) {
        return true;
      } else {
        return false;
      }
    } catch(e) {
      return false;
    }
  }
  //A generic extend function - thanks MooTools
  function extend(original, extended) {
    extended = extended || {};
    for (var key in extended) {
      if (extended.hasOwnProperty(key)) {
        original[key] = extended[key];
      }
    }
    return original;
  }

  //Check if an object is an array
  function isArray(obj) {
    return Object.prototype.toString.call(obj) == '[object Array]';
  }

  //Grab an XMLHTTPRequest Object
  function getXHR() {
    var xhr;
    if (isBrowserEnvironment()) {
      if (window.XMLHttpRequest) {
        xhr = new XMLHttpRequest();
      }
      else {
        xhr = new ActiveXObject("Microsoft.XMLHTTP");
      }
    }
    else if (isAppceleratorTitanium()) {
      xhr = Titanium.Network.createHTTPClient();
    }
    return xhr;
  }

  //Parse a string and create an XML DOM object
  function xmlDomFromString(_xml) {
    var xmlDoc = null;
    if (isBrowserEnvironment()) {
      if (window.DOMParser) {
        parser = new DOMParser();
        xmlDoc = parser.parseFromString(_xml,"text/xml");
      }
      else {
        xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(_xml);
      }
    }
    else if (isAppceleratorTitanium()) {
      xmlDoc = Titanium.XML.parseString(_xml);
    }
    return xmlDoc;
  }

  // Convert a JavaScript object to an XML string - takes either an
  function convertToXml(_obj) {
    var xml = '';
    if (isArray(_obj)) {
      for (var i = 0; i < _obj.length; i++) {
        xml += convertToXml(_obj[i]);
      }
    } else {
      //For now assuming we either have an array or an object graph
      for (var key in _obj) {
        xml += '<'+key+'>';
        if (isArray(_obj[key]) || (typeof _obj[key] == 'object' && _obj[key] != null)) {
          xml += convertToXml(_obj[key]);
        }
        else {
          xml += _obj[key];
        }
        xml += '</'+key+'>';
      }
    }
    return xml;
  }

  // Client Configuration
  var config = extend({
    endpoint:'http://localhost',
    targetNamespace: 'http://localhost',
    envelopeBegin: '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:ns0="PLACEHOLDER" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    headerBegin: '<soap:Header>',
    headerNode:'head',
    headerEnd: '</soap:Header>',
    bodyBegin:'<soap:Body>',
    envelopeEnd: '</soap:Body></soap:Envelope>',
    timeout: 5000,
    responseType: 'object',
    contentType : 'text/xml'
  },_options);

  // Invoke a web service
  //this.invoke = function({
  //	soapAction : 'method of the webservice'
  //	body : { }
  //	success : function(){} callback function on success
  //	error : function(){} callback function onerror
  //	header
  //}) {
  this.invoke = function(params) {
    //Build request body

    var opt = {
    	soapAction : '',
    	body : '',
    	success : function(){},
    	error : function(){},
    	header : false
    }

    opt = extend(opt, params);

    var body = opt.body;
    var header = opt.header;



    //Allow straight string input for XML body - if not, build from object
    if (typeof body !== 'string') {
      body = '<'+opt.soapAction+' xmlns="'+config.targetNamespace+'">';
      body += convertToXml(opt.body);
      body += '</'+opt.soapAction+'>';
    }

    var ebegin = config.envelopeBegin;
    config.envelopeBegin = ebegin.replace('PLACEHOLDER', config.targetNamespace);

    //Build Soapaction header - if no trailing slash in namespace, need to splice one in for soap action
    var soapAction = '';
    if (config.targetNamespace.lastIndexOf('/') != config.targetNamespace.length - 1) {
      soapAction = config.targetNamespace+'/'+opt.soapAction;
    }
    else {
      soapAction = config.targetNamespace+opt.soapAction;
    }

    //POST XML document to service endpoint
    var xhr = getXHR();
    xhr.onload = function() {
      opt.success.call(this, config.responseType == 'object' ? xmlDomFromString(this.responseText) : this.responseText );
    };
    xhr.onerror = function(error) {
      opt.error.call(this,error);
    }
    xhr.setTimeout(config.timeout);
    var sendXML = '';
    if(!header) {
        sendXML = config.envelopeBegin+config.bodyBegin+body+config.envelopeEnd;
    } else {
        //Allow straight string input for XML body - if not, build from object
        if (typeof opt.header !== 'string') {
          header = '<'+opt.soapAction+' xmlns="'+config.targetNamespace+'">';
          header += convertToXml(opt.header);
          header += '</'+opt.soapAction+'>';
        }
        sendXML = config.envelopeBegin+config.headerBegin+header+config.headerEnd+config.bodyBegin+body+config.envelopeEnd;
    }
    xhr.open('POST',config.endpoint);
    xhr.setRequestHeader('Content-Type', config.contentType);
    //xhr.setRequestHeader('Content-Length', sendXML.length);
    xhr.setRequestHeader('SOAPAction', soapAction);
    if (config.authorization !== undefined) {
		xhr.setRequestHeader('Authorization', 'Basic ' + config.authorization);
	}
    xhr.send(sendXML);
  };
}

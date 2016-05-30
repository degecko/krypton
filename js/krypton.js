var ls = localStorage;
var Krypton = {};

Krypton.o				= {};
Krypton.history			= {};
Krypton.inputs			= $('.code-block textarea').not('.disabled');
Krypton.btnExecute		= $('#execute');
Krypton.focusedInput	= Krypton.inputs.eq(0);
Krypton.plain			= $('#plain');
Krypton.settings		= $('#settings');
Krypton.realtime		= false;

Krypton.ciphersMap = {
	hex: 		1,
	base64: 	1,
	ascii: 		1,
	url: 		1,
	caesar: 	1,
	morse: 		1,
	binary: 	1,
	rot13: 		1,
	aes: 		1,
	tripledes: 	1,
	rabbit: 	1,
	rc4: 		1
};

Krypton.init = function ()
{
	this.setupCustomScroll();
	this.handleInputs();
	this.handleInputTools();
	this.handleExecuteButton();
	this.initializeTooltips();
	this.initializeShortcuts();
	this.handleSettings();
	this.handleRealtimeEncoding();
	this.applyMainColor();
	this.handleHashesSelection();
}

Krypton.setupCustomScroll = function ()
{
	this.inputs.niceScroll({
		cursorcolor: '#555',
		cursorborder: 'none',
		cursorborderradius: 'none',
		scrollspeed: 0,
		autohidemode: false,
		smoothscroll: false
	});

	$('.nicescroll-rails > div, .nicescroll-rails').mousedown(function () {
		var id = $(this).attr('id') ? $(this).attr('id') : $(this).parent().attr('id');
		var id = id.replace(/^ascrail2/, '5');

		$('textarea[tabindex="' + id + '"]').focus();
	});

	$('.code-block.hashes table').niceScroll({
		cursorcolor: '#555',
		cursorborder: 'none',
		cursorborderradius: 'none',
		scrollspeed: 0,
		autohidemode: false,
		smoothscroll: false
	});
}

Krypton.initializeShortcuts = function ()
{
	$(document).hotKey({ key: 'x', modifier: 'alt' }, function() {
		Krypton.btnExecute.trigger('click');
	});
}

Krypton.handleInputs = function ()
{
	this.inputs.focus(function () {

		var input = $(this);
		var id = input.attr('tabindex').replace(/^5/, '2');
		var elem = $('#ascrail' + id);

		// Apply a class to the custom scroll so the color can be changed
		elem.addClass('focused');
		input.next('.block-tools').addClass('focused');

		// Store the focused input
		Krypton.focusedInput = input;

	}).blur(function () {

		// Remove the 'focused' class from all the input on blur
		$('.nicescroll-rails').removeClass('focused');
		Krypton.inputs.next('.block-tools').removeClass('focused');

	}).keyup(function () {

		var id = $(this).attr('id');
		var input = $(this)[0];

		// Initialize the history of this input if necessary
		if (!Krypton.history[id] || !Krypton.history[id].height)
		{
			Krypton.history[id] = {};
			Krypton.history[id].height = input.scrollHeight;
		}
		
		// If the height of the input has changed
		if (Krypton.history[id].height != input.scrollHeight)
		{
			// Reload the niceScroll plugin
			$(this).getNiceScroll().resize();
		
			// Update the history of this input
			Krypton.history[id].height = input.scrollHeight;
		}

	});

	// Focus the related input when a key input is focused
	$('input.key').focus(function () {
		Krypton.focusedInput = $(this).prev('textarea');
	});

	// Focus the related input when a key input is focused
	$('.code-block.hashes .key').unbind('focus').focus(function () {
		Krypton.focusedInput = Krypton.plain;
	});
}

Krypton.handleInputTools = function ()
{
	// Focus the relative textarea when a button is pressed
	$('.block-tools li').click(function () {
		var input = $(this).parent().parent().find('textarea');
		input.focus();
	});

	// Reverse button
	$('.block-tools li.reverse').click(function () {
		var input = $(this).parent().parent().find('textarea');
		var content = input.val();

		input.val(
			Krypton.reverseString(content)
		);
	});

	// Remove spaces button
	$('.block-tools li.remove-spaces').click(function () {
		var input = $(this).parent().parent().find('textarea');
		var content = input.val();

		if (content.match(/\s/))
			input.val(
				Krypton.removeSpaces(content)
			);
	});

	// Commas button
	$('.block-tools li.commas').click(function () {
		var input = $(this).parent().parent().find('textarea');
		var content = input.val();

		input.val(
			Krypton.handleCommas(content)
		);
	});

	// Commas button
	$('.block-tools li.remove-duplicated-lines').click(function () {
		var input = $(this).parent().parent().find('textarea');
		var content = input.val();

		input.val(
			Krypton.removeDuplicatedLines(content)
		);
	});
}

Krypton.execute = function ()
{
	this.btnExecute.attr('disabled', 'disabled');
	this.process(function () {
		Krypton.btnExecute.removeAttr('disabled');
	});
}

Krypton.handleExecuteButton = function ()
{
	this.btnExecute.click(function () {
		// Disable the Execute button until the encoding is done
		Krypton.execute();
	});
}

Krypton.process = function (callback)
{
	var input  = Krypton.focusedInput;
	var value  = input.val();
	var cipher = input.attr('id');
	var key;

	if (cipher == 'plain')
		this.encodeAll();
	else
	{
		this.o = {
			content: value,
			cipher: cipher
		};

		if (input.hasKey())
		{
			key = input.next('input.key').val();
			this.o.key = typeof key !== 'undefined' && key.length ? key : '';
		}

		Krypton.decode(function (data) {
			Krypton.plain.val(data);
			Krypton.encodeAll();
		});
	}

	callback();
}

Krypton.encode = function (callback)
{
	if (!this.o.content || !this.o.content.length)
		this.o.content = '';

	if (!this.o.cipher || !this.o.cipher.length)
	{
		console.error('You must provide the cipher to be used when decoding the content.');
		return;
	}

	this.o.usage = this.getUsage(this.o.cipher, 'encode');
	callback(this.applyCipher(this.o));
}

Krypton.decode = function (callback)
{
	if (!this.o.content || !this.o.content.length)
		this.o.content = '';

	if (!this.o.cipher || !this.o.cipher.length)
	{
		console.error('You must provide the cipher to be used when decoding the content.');
		return;
	}

	this.o.usage = this.getUsage(this.o.cipher, 'decode');
	callback(this.applyCipher(this.o));
}

Krypton.encodeAll = function ()
{
	var remoteCiphers = [];
	var content = this.plain.val();

	this.inputs.not('#plain').not(this.focusedInput).each(function () {
		var input  = $(this);
		var cipher = input.attr('id');

		// Update input status
		input.val('Loading...');

		if (typeof Krypton.ciphersMap[cipher] !== 'undefined')
		{
			Krypton.o = {
				content: content,
				cipher: cipher
			};

			if (input.hasKey())
			{
				Krypton.o.key = input.next('input.key').val();
				Krypton.o.key = typeof Krypton.o.key !== 'undefined' && Krypton.o.key.length ? Krypton.o.key : '';
			}

			Krypton.encode(function (data) {
				input.val(data);
			});
		}
		else
			console.error('The cipher "' + cipher + '" is not recognized.');
	});

	// Hash to everything
	this.o.key = $('.code-block.hashes .key').val();
	var hash, hasher;

	for (var i in this.ciphers.hash)
	{
		hasher = this.ciphers.hash[i];
		hash   = i;

		$('.code-block.hashes #' + hash).text(hasher);
	}
}

Krypton.initializeTooltips = function ()
{
	$('.block-tools li').not('.block-label').tooltip();
	$('#execute').tooltip();
}

Krypton.applyCipher = function (o)
{
	return this.ciphers[this.o.usage][this.o.cipher];
}

Krypton.utf8_encode =  function (string)
{
	string = string.replace(/\r\n/g, "\n");
	var utftext = "";

	for (var n = 0; n < string.length; n++)
	{
		var c = string.charCodeAt(n);

		if (c < 128)
			utftext += String.fromCharCode(c);
		else if ((c > 127) && (c < 2048))
		{
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		}
		else
		{
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}
	}

	return utftext;
}

Krypton.utf8_decode = function (utftext) {
	var string = "";
	var i = 0;
	var c = c1 = c2 = 0;

	while (i < utftext.length)
	{
		c = utftext.charCodeAt(i);

		if (c < 128)
		{
			string += String.fromCharCode(c);
			i++;
		}
		else if ((c > 191) && (c < 224))
		{
			c2 = utftext.charCodeAt(i+1);
			string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
			i += 2;
		}
		else
		{
			c2 = utftext.charCodeAt(i+1);
			c3 = utftext.charCodeAt(i+2);
			string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
			i += 3;
		}
	}

	return string;
}

Krypton.getUsage = function (searchCipher, prefferedUsage)
{
	var usage, ciphers, cipher;

	for (var i in this.ciphers)
	{
		ciphers = this.ciphers[i];
		usage   = i;

		for (var j in ciphers)
		{
			cipher = j;

			if (cipher == searchCipher && !this.ciphers[prefferedUsage][cipher])
				return usage;
		}
	}

	return prefferedUsage;
}

Krypton.reverseString = function (string)
{
	var res = '';

	for (var i = string.length - 1; i >= 0; i--)
		res += string[i];

	return res;
}

Krypton.removeSpaces = function (string)
{
	return string.replace(/\s/g, '');
}

Krypton.handleCommas = function (string)
{
	if (string.match(/,/))
		return string.replace(/[^0-9a-f]+/g, ' ');
	else
		return string.replace(/\s+/g, ', ');
}

Krypton.handleSettings = function ()
{
	// Enable/disable ciphers
	if (!ls.deactivatedCiphers)
		ls.deactivatedCiphers = "[]";
	else
	{
		var deactivatedCiphers = JSON.parse(ls.deactivatedCiphers);

		for (var i = 0; i < deactivatedCiphers.length; i++)
		{
			$('#' + deactivatedCiphers[i]).parent().addClass('disabled');
			this.settings.find('.active-ciphers > li[data-handle="' + deactivatedCiphers[i] + '"]').removeClass('enabled').addClass('disabled');
		}
	}

	// Enable/disable real time encoding
	if (!ls.realtimeEncoding)
		ls.realtimeEncoding = 0;
	else
	{
		if (ls.realtimeEncoding == 1)
		{
			Krypton.realtime = true;
			$('#realtime-encoding').addClass('enabled');
		}
	}

	// Initialize main color
	if (!ls.color)
		ls.color = '1C90E4';
	else
	{
		var liTemp = this.settings.find('.color-list li[data-color="' + ls.color + '"]');
		liTemp.addClass('checked');
	}

	// Deactivation of ciphers
	this.settings.find('.active-ciphers > li').click(function () {
		var li = $(this);
		var cipher = li.data('handle');
		var deactivatedCiphers = JSON.parse(ls.deactivatedCiphers);
		var indexof = deactivatedCiphers.indexOf(cipher);

		if (indexof > -1)
		{
			deactivatedCiphers.splice(indexof, 1);
			$('#' + cipher).parent().removeClass('disabled');
			li.addClass('enabled');
		}
		else
		{
			deactivatedCiphers.push(cipher);
			$('#' + cipher).parent().addClass('disabled');
			li.removeClass('enabled');
		}

		ls.deactivatedCiphers = JSON.stringify(deactivatedCiphers);
		Krypton.reloadInputs();
		Krypton.inputs.getNiceScroll().resize();
		$('.code-block.hashes table').getNiceScroll().resize();
	});

	// Close button
	this.settings.find('> .close').click(function () {
		var settingsWrapper = Krypton.settings.parent();

		settingsWrapper.fadeOut(200);
		Krypton.focusedInput.focus();
	});

	// Close the settings window when clicked outside of it
	Krypton.settings.parent().mouseup(function (e) {
		var settings = Krypton.settings;

		if (!settings.is(e.target) && settings.has(e.target).length === 0)
		{
			$(this).fadeOut(200);
			Krypton.focusedInput.focus();
		}
	});

	// Open settings
	$('.buttons-block #settings-btn').click(function () {
		var settingsWrapper = Krypton.settings.parent();

		settingsWrapper.fadeIn(200);
	});

	// Enable/disable realtime encoding
	$('#realtime-encoding').click(function () {
		var li = $(this);

		if (li.hasClass('enabled'))
		{
			li.removeClass('enabled');
			Krypton.realtime = false;
			ls.realtimeEncoding = 0;
		}
		else
		{
			li.addClass('enabled');
			Krypton.realtime = true;
			ls.realtimeEncoding = 1;
		}
	});

	// Change main color
	this.settings.find('.color-list li').click(function () {
		var color = $(this).data('color');

		if (color != ls.color)
		{
			ls.color = color;
			Krypton.applyMainColor();
			Krypton.settings.find('.color-list li').removeClass('checked');
			$(this).addClass('checked');
		}
	});
}

Krypton.reloadInputs = function ()
{
	Krypton.inputs = $('.code-block textarea').not('.disabled');
}

Krypton.handleRealtimeEncoding = function ()
{
	this.inputs.on('input', function () {
		if (Krypton.realtime)
			Krypton.execute();
	});
}

Krypton.applyMainColor = function ()
{
	var color = '#' + ls.color;

	$('style#override').html('::selection { background: ' + color + ' } ::-moz-selection { background: ' + color + ' } .nicescroll-rails.focused > div { background-color: ' + color + ' !important; } #settings h4 { border-color: ' + color + ' } .btn-primary, .btn-primary:hover { background-color: ' + color + ' } .code-block input:focus, .code-block textarea:focus, .logo-block a { color: ' + color + ' }');
}

Krypton.handleHashesSelection = function ()
{
	$('.code-block.hashes tbody td').click(function () {
		var id = $(this).parent().find('code').attr('id');
		var el = document.getElementById(id);
		var range = document.createRange();
		var sel = window.getSelection();
		
		range.selectNodeContents(el);
		sel.removeAllRanges();
		sel.addRange(range);
	});
}

Krypton.removeDuplicatedLines = function (string)
{
	var lines = string.split(/(\n|\r\n|\r)/);
	var unique = [];

	for (var i = 0; i < lines.length; i++)
	{
		lines[i] = lines[i].toString();

		if (unique.indexOf(lines[i]) === -1)
			unique.push(lines[i]);
	}

	return unique.join('\n').replace(/[\r\n]+/, '\n');
}

$.fn.hasKey = function ()
{
	return $(this).next('input.key');
}

Krypton.ciphers = {
	encode: {
		binary: function () {
			var st, i, j, d;
			var arr = [];
			var len = Krypton.o.content.length;

			for (i = 1; i <= len; i++)
			{
				d = Krypton.o.content.charCodeAt(len - i);
				arr.push(' ');

				for (j = 0; j < 8; j++)
				{
					arr.push(d % 2);
					d = Math.floor(d / 2);
				}
			}

			return arr.reverse().join("").trim();
		},
		hex: function () {
			var string = Krypton.o.content.toLowerCase();
			var str = '', i = 0, c;

			for (; i < string.length; i++)
			{
				c = string.charCodeAt(i);
				str += c.toString(16) + ' ';
			}

			return str.trim();
		},
		ascii: function () {
			var s = '', string = Krypton.o.content;

			for (var i = 0; i < string.length; i++)
				s += string[i].charCodeAt(0) + ' ';

			return s.trim();
		},
		base64: function () {
			var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
			var output = "";
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;

			string = Krypton.utf8_encode(Krypton.o.content);

			while (i < string.length)
			{
				chr1 = string.charCodeAt(i++);
				chr2 = string.charCodeAt(i++);
				chr3 = string.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2))
					enc3 = enc4 = 64;
				else if (isNaN(chr3))
					enc4 = 64;

				output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
			}

			return output;
		},
		morse: function () {
			var res = '', chr;
			var string = Krypton.o.content;
			var cset = { a: '._', b: '_...', c: '_._.', d: '_..', e: '.', f: '.._.', g: '__.', h: '....', i: '..', j: '.___', k: '_._', l: '._..', m: '__', n: '_.', o: '___', p: '.__.', q: '__._', r: '._.', s: '...', t: '_', u: '.._', v: '..._', w: '.__', x: '_.._', y: '_.__', z: '__..', 1: '.____', 2: '..___', 3: '...__', 4: '...._', 5: '.....', 6: '_....', 7: '__...', 8: '___..', 9: '____.', 0: '_____' };

			for (var i = 0; i < string.length; i++)
			{
				chr = string[i].toLowerCase();
				
				if (cset[chr])
					res += cset[chr] + ' ';
			}

			return res.trim();
		},
		url: function () {
			var string = Krypton.o.content;

			string = encodeURIComponent(string);
			string = string.replace(/'/g, '%27');

			return string;
		},
		aes: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.AES.encrypt(string, key).toString();
		},
		tripledes: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.TripleDES.encrypt(string, key).toString();
		},
		rabbit: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.Rabbit.encrypt(string, key).toString();
		},
		rc4: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.RC4.encrypt(string, key).toString();
		}
	},
	decode: {
		binary: function () {
			var res = '';
			var string = Krypton.o.content.replace(/[^01]/g, '');
			string = string.match(/.{1,8}/g);

			for (var i = 0; i < string.length; i++)
				res += String.fromCharCode(parseInt(string[i], 2));
			
			return res;
		},
		hex: function () {
			var string = Krypton.o.content.toLowerCase().replace(/[^0-9abcdef]/g, '');

			var str = '', i = 0, c;
			var arr = string.match(/.{1,2}/g);

			for (; i < (arr !== null ? arr.length : 0); i++)
			{
				c = String.fromCharCode(parseInt(arr[i], 16));
				str += c;
			}

			return str;
		},
		ascii: function () {
			var res = '', string = Krypton.o.content;
			string = string.replace(/[^\d\s]/g, ' ');
			string = string.replace(/\s+/g, ' ');
			var ascii = string.split(' ');

			for (var i = 0; i < ascii.length; i++)
				res += String.fromCharCode(parseInt(ascii[i]));

			return res;
		},
		base64: function () {
			var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;

			string = Krypton.o.content.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			while (i < string.length)
			{
				enc1 = keyStr.indexOf(string.charAt(i++));
				enc2 = keyStr.indexOf(string.charAt(i++));
				enc3 = keyStr.indexOf(string.charAt(i++));
				enc4 = keyStr.indexOf(string.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64)
					output = output + String.fromCharCode(chr2);

				if (enc4 != 64)
					output = output + String.fromCharCode(chr3);

			}

			output = Krypton.utf8_decode(output);

			return output;
		},
		morse: function () {
			var res = '', chr;
			var string = Krypton.o.content.trim().split(' ');
			var cset = { '._': 'a','_...': 'b','_._.': 'c','_..': 'd','.': 'e','.._.': 'f','__.': 'g','....': 'h','..': 'i','.___': 'j','_._': 'k','._..': 'l','__': 'm','_.': 'n','___': 'o','.__.': 'p','__._': 'q','._.': 'r','...': 's','_': 't','.._': 'u','..._': 'v','.__': 'w','_.._': 'x','_.__': 'y','__..': 'z','.____': '1','..___': '2','...__': '3','...._': '4','.....': '5','_....': '6','__...': '7','___..': '8','____.': '9','_____': '0' };

			for (var i = 0; i < string.length; i++)
			{
				chr = string[i].toLowerCase();
				
				if (cset[chr])
					res += cset[chr];
			}

			return res;
		},
		url: function () {
			var string = Krypton.o.content;

			return decodeURIComponent(string);
		},
		aes: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.AES.decrypt(string, key).toString(CryptoJS.enc.Latin1);
		},
		tripledes: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.TripleDES.decrypt(string, key).toString(CryptoJS.enc.Latin1);
		},
		rabbit: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.Rabbit.decrypt(string, key).toString(CryptoJS.enc.Latin1);
		},
		rc4: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.RC4.decrypt(string, key).toString(CryptoJS.enc.Latin1);
		}
	},
	misc: {
		caesar: function () {
			var res = '', chr, string = Krypton.o.content, key;

			key = Krypton.o.key ? parseInt(Krypton.o.key) : 0;
			key = !isNaN(key) ? key : 0;

			if (Krypton.focusedInput.attr('id') == 'caesar')
				key = 26 - key;

			for (var i = 0; i < string.length; i++)
			{
				chr = string.charCodeAt(i);

				if (chr >= 65 && chr <=  90) 
					res += String.fromCharCode((chr - 65 + key) % 26 + 65);  
				else if (chr >= 97 && chr <= 122) 
					res += String.fromCharCode((chr - 97 + key) % 26 + 97);  
				else   
					res += string.charAt(i);   
			}

			return res;
		},
		rot13: function () {
			var res = '', chr, string = Krypton.o.content;

			for (var i = 0; i < string.length; i++)
			{
				chr = string.charCodeAt(i);

				if (chr >= 65 && chr <=  90) 
					res += String.fromCharCode((chr - 65 + 13) % 26 + 65);  
				else if (chr >= 97 && chr <= 122) 
					res += String.fromCharCode((chr - 97 + 13) % 26 + 97);  
				else   
					res += string.charAt(i);   
			}

			return res;
		}
	},
	hash: {
		md5: function () {
			var string = Krypton.o.content;
			return CryptoJS.MD5(string).toString();
		},
		sha1: function () {
			var string = Krypton.o.content;
			return CryptoJS.SHA1(string).toString();
		},
		sha256: function () {
			var string = Krypton.o.content;
			return CryptoJS.SHA256(string).toString();
		},
		sha512: function () {
			var string = Krypton.o.content;
			return CryptoJS.SHA512(string).toString();
		},
		sha3_224: function () {
			var string = Krypton.o.content;
			return CryptoJS.SHA3(string, { outputLength: 224 }).toString();
		},
		sha3_256: function () {
			var string = Krypton.o.content;
			return CryptoJS.SHA3(string, { outputLength: 256 }).toString();
		},
		sha3_384: function () {
			var string = Krypton.o.content;
			return CryptoJS.SHA3(string, { outputLength: 384 }).toString();
		},
		sha3_512: function () {
			var string = Krypton.o.content;
			return CryptoJS.SHA3(string, { outputLength: 512 }).toString();
		},
		ripemd160: function () {
			var string = Krypton.o.content;
			return CryptoJS.RIPEMD160(string).toString();
		},
		hmac_md5: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.HmacMD5(string, key).toString();
		},
		hmac_sha1: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.HmacSHA1(string, key).toString();
		},
		hmac_sha256: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.HmacSHA256(string, key).toString();
		},
		hmac_sha512: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.HmacSHA512(string, key).toString();
		},
		hmac_pbkdf2_128: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.PBKDF2(string, key, { keySize: 128 / 32 }).toString();
		},
		hmac_pbkdf2_256: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.PBKDF2(string, key, { keySize: 256 / 32 }).toString();
		},
		hmac_pbkdf2_512: function () {
			var string = Krypton.o.content;
			var key = Krypton.o.key ? Krypton.o.key : '';
			return CryptoJS.PBKDF2(string, key, { keySize: 512 / 32 }).toString();
		}
	}
};
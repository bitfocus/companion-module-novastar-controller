// NovaStar-Controller

var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

// Brightness
instance.prototype.CHOICES_BRIGHTNESS = [
    { id: '0', label: '3%' },
    { id: '1', label: '5%' },
    { id: '2', label: '8%' },
    { id: '3', label: '10%' },
    { id: '4', label: '15%' },
    { id: '5', label: '20%' },
    { id: '6', label: '25%' },
    { id: '7', label: '30%' },
    { id: '8', label: '35%' },
    { id: '9', label: '40%' },
    { id: '10', label: '45%' },
    { id: '11', label: '50%' },
    { id: '12', label: '55%' },
    { id: '13', label: '60%' },
    { id: '14', label: '65%' },
    { id: '15', label: '70%' },
    { id: '16', label: '75%' },
    { id: '17', label: '80%' },
    { id: '18', label: '85%' },
    { id: '19', label: '90%' },
    { id: '20', label: '95%' },
    { id: '21', label: '100%' }
];

// Test Patterns
instance.prototype.CHOICES_TESTPATTERNS = [
    { id: '0', label: 'Red' },
    { id: '1', label: 'Green' },
    { id: '2', label: 'Blue' },
    { id: '3', label: 'White' },
    { id: '4', label: 'Horizontal' },
    { id: '5', label: 'Vertical' },
    { id: '6', label: 'Diagonal' },
    { id: '7', label: 'Gray-Scale' },
    { id: '8', label: 'Aging-All' }
];

// Display Modes
instance.prototype.CHOICES_DISPLAYMODE = [
	{ id: '0', label: 'Normal' },
	{ id: '1', label: 'Freeze' },
	{ id: '2', label: 'Black' },
];

// MCTRL4K Inputs
instance.prototype.CHOICES_INPUTS_MCTRL4K = [
	{ id: '0', label: 'DVI' },
	{ id: '1', label: 'HDMI' },
	{ id: '2', label: 'Display Port' }
];

// VX4S Inputs
instance.prototype.CHOICES_INPUTS_VX4S = [
	{ id: '0', label: 'DVI' },
	{ id: '1', label: 'HDMI' },
	{ id: '2', label: 'VGA 1' },
	{ id: '3', label: 'VGA 2' },
	{ id: '4', label: 'CVBS 1' },
	{ id: '5', label: 'CVBS 2' },
	{ id: '6', label: 'SDI' },
	{ id: '7', label: 'Display Port' }
];

// VX6S Inputs
instance.prototype.CHOICES_INPUTS_VX6S = [
	{ id: '0', label: 'DVI' },
	{ id: '1', label: 'HDMI' },
	{ id: '2', label: 'VGA 1' },
	{ id: '3', label: 'VGA 2' },
	{ id: '4', label: 'CVBS 1' },
	{ id: '5', label: 'CVBS 2' },
	{ id: '6', label: 'SDI' },
	{ id: '7', label: 'Display Port' }
];

// VX6S Presets
instance.prototype.CHOICES_PRESETS_VX6S = [
    { id: '0', label: 'Preset-1' },
    { id: '1', label: 'Preset-2' },
    { id: '2', label: 'Preset-3' },
    { id: '3', label: 'Preset-4' },
    { id: '4', label: 'Preset-5' },
    { id: '5', label: 'Preset-6' },
    { id: '6', label: 'Preset-7' },
    { id: '7', label: 'Preset-8' },
    { id: '8', label: 'Preset-9' },
    { id: '9', label: 'Preset-10' },
    { id: '10', label: 'Preset-11' },
    { id: '11', label: 'Preset-12' },
    { id: '12', label: 'Preset-13' },
    { id: '13', label: 'Preset-14' },
    { id: '14', label: 'Preset-15' },
    { id: '15', label: 'Preset-16' }

// NovaProHD Inputs
instance.prototype.CHOICES_INPUTS_NOVAPROHD = [
	{ id: '0', label: 'SDI' },
	{ id: '1', label: 'DVI' },
	{ id: '2', label: 'HDMI' },
	{ id: '3', label: 'Display Port' },
	{ id: '4', label: 'VGA' },
	{ id: '5', label: 'CVBS' }
];

//Scaling Options - VX4S, VX6S, NovaProHD only
instance.prototype.CHOICES_SCALING = [
	{ id: '0', label: 'Disable' },
	{ id: '1', label: 'Custom' },
	{ id: '2', label: 'Auto' }
];

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;
	self.init_tcp();
}

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.init_tcp();
}

instance.prototype.init_tcp = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.port === undefined) {
		self.config.port = 5200;
	}

	if (self.config.host) {
		self.socket = new tcp(self.config.host, self.config.port);

		self.socket.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.socket.on('error', function (err) {
			debug('Network error', err);
			self.log('error','Network error: ' + err.message);
		});

		self.socket.on('connect', function () {
			let cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x02,0x00,0x00,0x00,0x02,0x00,0x57,0x56]);
			self.socket.send(cmd);
			debug('Connected');
		});

		// if we get any data, display it to stdout
		self.socket.on('data', function(buffer) {
			//var indata = buffer.toString('hex');
			//future feedback can be added here
			//console.log(indata);
			console.log('Buffer:', buffer);
		});

	}
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will connect to a NovaStar MCTRL4K, VX4S, VX6S, or NovaProHD LED Processor.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address',
			width: 6,
			default: '192.168.1.11',
			regex: self.REGEX_IP
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
	}

	debug('destroy', self.id);
}

instance.prototype.actions = function() {
	var self = this;

	self.system.emit('instance_actions', self.id, {
		// Change Brightness for eberything
		'change_brightness': {
			label: 'Change Brightness',
			options:
			[
				{
					type: 'dropdown',
					label: 'Brightness',
					id: 'brightness',
					default: '0',
					choices: self.CHOICES_BRIGHTNESS
				}
			]
		},

		// Test patterns
		'change_TP': {
			 label: 'Change Test Patterns',
			 options:
			 [
				 {
					 type: 'dropdown',
					 label: 'Test Patterns',
					 id: 'tp',
					 default: '0',
					 choices: self.CHOICES_TESTPATTERNS
				}
			]
		},

	  	//Display Mode
		'change_display_mode': {
			label: 'Change Display Mode',
			options:
			[
			  {
				type: 'dropdown',
					label: 'Display Mode',
					id: 'display_mode',
					default: '0',
					choices: self.CHOICES_DISPLAY_MODESVX4S
				}
			]
		},


		//MCTRL4k INPUTs selection
		 'change_mctrl4kinputs': {
			label: 'Change Input',
			options:
			[
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: '0',
					choices: self.CHOICES_INPUTS
				}
			]
		},

	});
}

instance.prototype.action = function(action) {

	var self = this;
	var cmd;
	var options = action.options;

	var lf = '\u000a';

	switch(action.action) {

		// Change Brightness
		case 'change_brightness':
			switch(options.brightness) {
				case '0':
					//3%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00    08   5D   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x08,0x5D,0x5A]);
					break;
				case '1':
					//5%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00    0D   62   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x0D,0x62,0x5A]);
					break;
				case '2':
					//8%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00    20   75   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x14,0x69,0x5A]);
					break;
				case '3':
					//10%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   1A   6F   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x1A,0x6F,0x5A]);
					break;
				case '4':
					//15%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   27   7C   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x27,0x7C,0x5A]);
					break;
				case '5':
					//20%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   33   88   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x33,0x88,0x5A]);
					break;
				case '6':
					//25%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   40   95   5a
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x40,0x95,0x5A]);
					break;
				case '7':
					//30%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   4D   A2   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x4D,0xA2,0x5A]);
					break;
				case '8':
					//35%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   5A   AF   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x5A,0xAF,0x5A]);
					break;
			 	case '9':
					//40%:               55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00  66   BB   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x66,0xBB,0x5A]);
					break;
			 	case '10':
					//45%:             55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00    73   C8   5A
					cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x73,0xC8,0x5A]);
					break;
			 	case '11':
					 //50%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   80   D5   5A
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x80,0xD5,0x5A]);
					break;
				case '12':
					 //55%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   8D   E2   5A
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x8D,0xE2,0x5A]);
					break;
			 	case '13':
					 //60%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   9A   EF   5A
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x9A,0xEF,0x5A]);
					break;
			 	case '14':
					 //65%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   A6   FB   5A
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0xA6,0xFB,0x5A]);
					break;
			 	case '15':
					 //70%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   B3   08   5B
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0xB3,0x08,0x5B]);
					break;
				case '16':
					 //75%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   C0   15   5B
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0xC0,0x15,0x5B]);
					break;
				case '17':
					 //80%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   CD   22   5B
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0xCD,0x22,0x5B]);
					break;
				case '18':
					//85%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   DA   2F   5B
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0xDA,0x2F,0x5B]);
					break;
				case '19':
					 //90%:              55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   E6   3B   5B
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0xE6,0x3B,0x5B]);
					 break;
				case '20':
					 //95%:               55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00  F3   48   5B
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0xF3,0x48,0x5B]);
					 break;
				case '21':
					 //100%:             55   AA   00   00   FE   FF   01   FF   FF   FF   01   00   01   00   00   02   01   00   FF   54   5B
					 cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0xFF,0x54,0x5B]);
					 break;
		  	}
			break;

	// Change Test Pattern
	case 'change_TP':
		switch(options.tp) {
				case '0':
					//Red               55   AA   00   80   FE   00   01   00   FF   FF   01   00   01   01   00   02   01   00   02   DA   58
					cmd = new Buffer([0x55,0xAA,0x00,0x80,0xFE,0x00,0x01,0x00,0xFF,0xFF,0x01,0x00,0x01,0x01,0x00,0x02,0x01,0x00,0x02,0xDA,0x58]);
					break;
				case '1':
				 //Green             55   AA   00   80   FE   00   01   00   FF   FF   01   00   01   01   00   02   01   00   04   DC   58
					cmd = new Buffer([0x55,0xAA,0x00,0x80,0xFE,0x00,0x01,0x00,0xFF,0xFF,0x01,0x00,0x01,0x01,0x00,0x02,0x01,0x00,0x04,0xDC,0x58]);
					break;
				case '2':
					//Blue             55   AA   00   80   FE   00   01   00   FF   FF   01   00   01   01   00   02   01   00   03   DB   58
					cmd = new Buffer([0x55,0xAA,0x00,0x80,0xFE,0x00,0x01,0x00,0xFF,0xFF,0x01,0x00,0x01,0x01,0x00,0x02,0x01,0x00,0x03,0xDB,0x58]);
					break;
				case '3':
					//White             55   AA   00   80   FE   00   01   00   FF   FF   01   00   01   01   00   02   01   00   05   DD   58
					cmd = new Buffer([0x55,0xAA,0x00,0x80,0xFE,0x00,0x01,0x00,0xFF,0xFF,0x01,0x00,0x01,0x01,0x00,0x02,0x01,0x00,0x05,0xDD,0x58]);
					break;
				case '4':
					//Horizontal        55   AA   00   80   FE   00   01   00   FF   FF   01   00   01   01   00   02   01   00   06   DE   58
					cmd = new Buffer([0x55,0xAA,0x00,0x80,0xFE,0x00,0x01,0x00,0xFF,0xFF,0x01,0x00,0x01,0x01,0x00,0x02,0x01,0x00,0x06,0xDE,0x58]);
					break;
				case '5':
					//Vertical          55   AA   00   80   FE   00   01   00   FF   FF   01   00   01   01   00   02   01   00   07   DF   58
					cmd = new Buffer([0x55,0xAA,0x00,0x80,0xFE,0x00,0x01,0x00,0xFF,0xFF,0x01,0x00,0x01,0x01,0x00,0x02,0x01,0x00,0x07,0xDF,0x58]);
					break;
				case '6':
					//incline           55   AA   00   80   FE   00   01   00   FF   FF   01   00   01   01   00   02   01   00   08   E0   58
					cmd = new Buffer([0x55,0xAA,0x00,0x80,0xFE,0x00,0x01,0x00,0xFF,0xFF,0x01,0x00,0x01,0x01,0x00,0x02,0x01,0x00,0x08,0xE0,0x58]);
					break;
				case '7':
					//Gray Scale             55   AA   00   80   FE   00   01   00   FF   FF   01   00   01   01   00   02   01   00   09   E1   58
					cmd = new Buffer([0x55,0xAA,0x00,0x80,0xFE,0x00,0x01,0x00,0xFF,0xFF,0x01,0x00,0x01,0x01,0x00,0x02,0x01,0x00,0x09,0xE1,0x58]);
					break;
				case '8':
					//Aging             55   AA   00   80   FE   00   01   00   FF   FF   01   00   01   01   00   02   01   00   0A   E2   58
					cmd = new Buffer([0x55,0xAA,0x00,0x80,0xFE,0x00,0x01,0x00,0xFF,0xFF,0x01,0x00,0x01,0x01,0x00,0x02,0x01,0x00,0x0A,0xE2,0x58]);
					break;
		  	}
			break;

	// Change Display mode
	case 'change_display_mode':
		switch(options.display_mode) {
			case '0':
				//Normal            55   aa   00   00   fe   00   00   00   00   00   01   00   50   00   20   02   01   00   00   c7   56
				cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0x00,0x00,0x00,0x00,0x00,0x01,0x00,0x50,0x00,0x20,0x02,0x01,0x00,0x00,0xC7,0x56]);
				break;
			case '1':
				//Freeze            55   aa   00   00   fe   00   00   00   00   00   01   00   50   00   20   02   01   00   01   c8   56
				cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0x00,0x00,0x00,0x00,0x00,0x01,0x00,0x50,0x00,0x20,0x02,0x01,0x00,0x01,0xC8,0x56]);
				break;
			case '2':
				//Black             55   aa   00   00   fe   00   00   00   00   00   01   00   50   00   20   02   01   00   02   c9   56
				cmd = new Buffer([0x55,0xAA,0x00,0x00,0xFE,0x00,0x00,0x00,0x00,0x00,0x01,0x00,0x50,0x00,0x20,0x02,0x01,0x00,0x02,0xC9,0x56]);
				break;

			}
		break;

	// Change Inputs
	case 'change_inputs':
		switch(options.inputs) {
			case '0':
				//DVI               55   AA   00   3E   FE   FF   00   00   00   00   01   00   23   00   00   02   01   00   61   18  58
				cmd = new Buffer([0x55,0xAA,0x00,0x3E,0xFE,0xFF,0x00,0x00,0x00,0x00,0x01,0x00,0x23,0x00,0x00,0x02,0x01,0x00,0x61,0x18,0x58]);
				break;
			case '1':
				//HDMI               55   AA  00   8A   FE   FF   00   00   00   00   01   00   23   00   00   02   01   00   05   08   58
				cmd = new Buffer([0x55,0xAA,0x00,0x8A,0xFE,0xFF,0x00,0x00,0x00,0x00,0x01,0x00,0x23,0x00,0x00,0x02,0x01,0x00,0x05,0x08,0x58]);
				break;
			case '2':
				//DP                55   AA   00   9D   FE   FF   00   00   00   00   01   00   23   00   00   02   01   00   5F   75   58
				cmd = new Buffer([0x55,0xAA,0x00,0x9D,0xFE,0xFF,0x00,0x00,0x00,0x00,0x01,0x00,0x23,0x00,0x00,0x02,0x01,0x00,0x5F,0x75,0x58]);
				break;
			}
		break;
	}

	if (cmd !== undefined) {
		if (self.socket !== undefined && self.socket.connected) {
			self.socket.send(cmd);
		} else {
			debug('Socket not connected :(');
		}

	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;

// NovaStar-Controller
const { InstanceBase, TCPHelper, runEntrypoint } = require('@companion-module/base')
const actions = require('./actions');
const nova_config = require('./config');

class NovaStarInstance extends InstanceBase {

	constructor(internal) {
		super(internal);

		// map the choices model to the internal config data object
		this.CHOICES_MODEL = Object.values(nova_config.CONFIG_MODEL);
		
		// Sort config model alphabetically
		this.CHOICES_MODEL.sort(function(a, b){
			var x = a.label.toLowerCase();
			var y = b.label.toLowerCase();
			if (x < y) {return -1;}
			if (x > y) {return 1;}
			return 0;
		});
	}

	updateActions() {
		this.log('debug','loading up the actions...');
		this.setActionDefinitions(actions.getActions(this));
	}

	// Return config fields for web config
	getConfigFields() {
		this.log("getting the fields....");
		return [
			{
				type: 'static-text',
				id:   'info',
				width: 12,
				label: 'Information',
				value: 'This module will connect to a NovaStar MCTRL4K, VX4S, VX6S, NovaProHD, or NovaPro UHD Jr,VX1000, VX600, VX16S & J6 LED Processor.'
			},
			{
				type:     'textinput',
				id:       'host',
				label:    'IP Address',
				width:    6,
				default: '192.168.1.11',
				regex:   this.REGEX_IP
			},
			{
				type:    'dropdown',
				id:      'modelID',
				label:   'Model',
				width:   6,
				choices: this.CHOICES_MODEL,
				default: 'j6'
			}
		]
	}

	// When module gets deleted
	async destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy();
		}

		this.log('destroy', this.id);
	}

	async init(config) {
		this.config = config;

		if (this.config.modelID !== undefined){
			this.model = nova_config.CONFIG_MODEL[this.config.modelID];
		}
		else {
			this.config.modelID = 'vx4s';
			this.model = nova_config.CONFIG_MODEL['vx4s'];
		}

		// this is not called by Companion directly, so we need to call this to load the actions into Companion
		this.updateActions();

		// start up the TCP socket and attmept to get connected to the NovaStar device
		this.initTCP();
	}

	initTCP() {
		if (this.socket !== undefined) {
			// clean up the socket and keep Companion connection status up to date in the event that the socket ceases to exist
			this.socket.destroy();
			delete this.socket;
			this.updateStatus('disconnected');
		}

		if (this.config.port === undefined) {
			// use TCP port 5200 by default
			this.config.port = 5200;
		}

		if (this.config.host) {
			// create a TCPHelper instance to use as our TCP socket
			this.socket = new TCPHelper(this.config.host, this.config.port);

			this.updateStatus('connecting');

			this.socket.on('status_change', (status, message) => {
				this.log('debug', message);
			});

			this.socket.on('error', (err) => {
				// make sure that we log and update Companion connection status for a network failure
				this.log('Network error', err);
				this.log('error','Network error: ' + err.message);
				this.updateStatus('connection_failure');
			});

			this.socket.on('connect', () => {
				let cmd = Buffer.from([0x55,0xAA,0x00,0x00,0xFE,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x02,0x00,0x00,0x00,0x02,0x00,0x57,0x56]);
				this.socket.send(cmd);
				this.log('debug', 'Connected');
				this.updateStatus('ok');
			});

			// if we get any data, display it to stdout
			this.socket.on('data', (buffer) => {
				//var indata = buffer.toString('hex');
				//future feedback can be added here
				//console.log(indata);
				this.log('debug', 'Buffer:' + buffer);
			});

		}
	}

	configUpdated(config) {
		// handle if the connection needs to be reset (ex. if the user changes the IP address, and we need to re-connect the socket to the new address)
		var resetConnection = false;

		if (this.config.host != config.host)
		{
			resetConnection = true;
		}

		this.config = config;

		if (resetConnection === true || this.socket === undefined) {
			this.initTCP();
		}
	}
}

runEntrypoint(NovaStarInstance, []);
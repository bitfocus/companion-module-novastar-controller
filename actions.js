exports.getActions = function() {

	let actions = {};

 //Brightness

	// VX6s, VX4S, NovaProHD, MCTRL4k, NovaPro UHD, NovaPro UHD Jr , VX1000, VX 600, VX16S
    if (this.config.modelID == 'vx4s' || this.config.modelID == 'vx6s' ||this.config.modelID == 'MCTRL4k' || this.config.modelID == 'novaProHD'|| this.config.modelID == 'novaProUHD' || this.config.modelID == 'novaProUHDJr' || this.config.modelID == 'vx1000'|| this.config.modelID == 'vx600'|| this.config.modelID == 'vx16s')
	actions['change_brightness'] = {
		name: 'Change Brightness',
		options: [
			{
				type: 'dropdown',
				name: 'Brightness',
				id: 'brightness',
				default: '0',
				choices: this.model.brightness
			}
		]
	};
//Change Input
	// VX6s, VX4S, NovaProHD, MCTRL4k, VX1000, VX600
	
    if (this.config.modelID == 'vx4s' || this.config.modelID == 'vx6s' ||this.config.modelID == 'MCTRL4k'||this.config.modelID == 'vx1000' || this.config.modelID == 'novaProHD'|| this.config.modelID == 'vx600')
        actions['change_input'] = {
		name: 'Change Input',
		options: [
			{
				type: 'dropdown',
				name: 'Input',
				id: 'input',
				default: '0',
				choices: this.model.inputs
			}
		]
    }

//Change Test patterns
	// All models
	actions['change_test_pattern'] = {
		name: 'Change Test Patterns',
		options: [
			{
				type: 'dropdown',
				name: 'Test Patterns',
				id: 'pattern',
				default: '0',
				choices: this.CHOICES_TESTPATTERNS
			}
		]
	};

//Change Display mode
	// all models
	actions['change_display_mode'] = {
		name: 'Change Display Mode',
		options: [
			{
				type: 'dropdown',
				name: 'Display Mode',
				id: 'display_mode',
				default: '0',
				choices: this.model.displayModes
			}
		]
	};

//Working mode
	// VX6s & J6
	if (this.config.modelID == 'vx6s' || this.config.modelID == 'j6') {
		actions['change_working_mode'] = {
			name: 'Change Working Mode',
			options: [
				{
					type: 'dropdown',
					name: 'Working Mode',
					id: 'working_mode',
					default: '0',
					choices: this.model.workingModes
				}
			]
		};
	}

    //PIP
	// VX4S, NovaProHD
	if (this.config.modelID == 'vx4s' || this.config.modelID == 'novaProHD') {
		actions['pip_onoff'] = {
			name: 'PIP On/Off',
			options: [
				{
					type: 'dropdown',
					name: 'On/Off',
					id: 'value',
					default: '0',
					choices: this.model.piponoffs
				}
			]
		};
	}

	//PIP
	// VX1000 only
	if (this.config.modelID == 'vx1000') {
		actions['pip_onoff_vx1000'] = {
			name: 'PIP On/Off VX1000',
			options: [
				{
					type: 'dropdown',
					name: 'On/Off',
					id: 'enabled',
					default: '0',
					choices: this.model.pipOnOffs
				},
				{
					type: 'dropdown',
					name: 'PIP Layer Number',
					id: 'piplayernumber',
					default: '0',
					choices: this.model.pipLayers
				},
				{
					type: 'dropdown',
					name: 'PIP Card Number',
					id: 'pipcardnumber',
					default: '0',
					choices: this.model.pipCardNo
				},
				{
					type: 'dropdown',
					name: 'PIP Layer Priority',
					id: 'piplayerpriority',
					default: '0',
					choices: this.model.pipLayerPriority
				},
				{
					type: 'dropdown',
					name: 'PIP Video Connector',
					id: 'pipconnectorcode',
					default: '0',
					choices: this.model.pipConnectorCode
				},
				{
					type: 'number',
					name: 'Opacity (0 - 100)',
					id: 'opacity',
					default: '100'
				},
				{
					type: 'number',
					name: 'Initial X',
					id: 'initialx',
					default: '550'
				},
				{
					type: 'number',
					name: 'Initial Y',
					id: 'initialy',
					default: '0'
				},
				{
					type: 'number',
					name: 'H Width',
					id: 'hwidth',
					default: '1307'
				},
				{
					type: 'number',
					name: 'V Height',
					id: 'vheight',
					default: '640'
				} 
			]
		};
	}

//Scaling
	// VX4S, NovaProHD
	if (this.config.modelID == 'vx4s' || this.config.modelID == 'novaProHD') {
		actions['change_scaling'] = {
			name: 'Change Scaling',
			options: [
				{
					type: 'dropdown',
					name: 'Scale',
					id: 'scale',
					default: '0',
					choices: this.CHOICES_SCALING
				}
			]
		}
	}

// LOAD PRESETS
    //VX4S, NovaPro UHD Jr,vx1000
	if (this.config.modelID == 'vx4s' || this.config.modelID == 'novaProUHDJr'|| this.config.modelID == 'vx1000'|| this.config.modelID == 'vx600'|| this.config.modelID == 'vx16s' || this.config.modelID == 'j6') {
		actions['load_preset'] = {
			name: 'Recall Preset',
			options: [
				{
					type: 'dropdown',
					name: 'Preset',
					id: 'preset',
					default: '0',
					choices: this.model.presets
				}
			]
		};
	}

	// VX6s
	if (this.config.modelID == 'vx6s') {
		actions['load_preset'] = {
			name: 'Load Preset to Preview',
			options: [
				{
					type: 'dropdown',
					name: 'Preset',
					id: 'preset',
					default: '0',
					choices: this.model.presets
				}
			]
		};

		actions['take'] = {
			name: 'Take Preview to Program'
		};
	}

	return actions
}

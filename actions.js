exports.getActions  = function() {

	let actions = {};

 //Brightness

	// VX6s, VX4S, NovaProHD, MCTRL4k, NovaPro UHD, NovaPro UHD Jr , VX1000, VX 600, VX16S
    if (this.config.modelID == 'vx4s' || this.config.modelID == 'vx6s' ||this.config.modelID == 'MCTRL4k' || this.config.modelID == 'novaProHD'|| this.config.modelID == 'novaProUHD' || this.config.modelID == 'novaProUHDJr' || this.config.modelID == 'vx1000'|| this.config.modelID == 'vx600'|| this.config.modelID == 'vx16s')
	actions['change_brightness'] = {
		label: 'Change Brightness',
		options: [
			{
				type: 'dropdown',
				label: 'Brightness',
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
		label: 'Change Input',
		options: [
			{
				type: 'dropdown',
				label: 'Input',
				id: 'input',
				default: '0',
				choices: this.model.inputs
			}
		]
    }

//Change Test patterns
	// All models
	actions['change_test_pattern'] = {
		label: 'Change Test Patterns',
		options: [
			{
				type: 'dropdown',
				label: 'Test Patterns',
				id: 'pattern',
				default: '0',
				choices: this.CHOICES_TESTPATTERNS
			}
		]
	};

//Change Display mode
	// all models
	actions['change_display_mode'] = {
		label: 'Change Display Mode',
		options: [
			{
				type: 'dropdown',
				label: 'Display Mode',
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
			label: 'Change Working Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Working Mode',
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
			label: 'PIP On/Off',
			options: [
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'value',
					default: '0',
					choices: this.model.piponoffs
				}
			]
		};
	}

//Scaling
	// VX4S, NovaProHD
	if (this.config.modelID == 'vx4s' || this.config.modelID == 'novaProHD') {
		actions['change_scaling'] = {
			label: 'Change Scaling',
			options: [
				{
					type: 'dropdown',
					label: 'Scale',
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
			label: 'Recall Preset',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
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
			label: 'Load Preset to Preview',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'preset',
					default: '0',
					choices: this.model.presets
				}
			]
		};

		actions['take'] = {
			label: 'Take Preview to Program'
		};
	}

	return actions
}

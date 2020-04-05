exports.getActions  = function() {

	let actions = {};

	// VX6s, VX4S, NovaProHD, MCTRL4k
	actions['change_brightness'] = {
		label: 'Change Brightness',
		options: [
			{
				type: 'dropdown',
				label: 'Brightness',
				id: 'brightness',
				default: '0',
				choices: this.CHOICES_BRIGHTNESS
			}
		]
	};

	// VX6s, VX4S, NovaProHD, MCTRL4k
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

	// VX6s, VX4S, NovaProHD, MCTRL4k
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

	// VX6s, VX4S, NovaProHD, MCTRL4k
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

	// VX6s
	if (this.config.modelID == 'vx6s') {
		actions['change_working_mode'] = {
			label: 'Change Working Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Working Mode',
					id: 'working_mode',
					default: '0',
					choices: this.CHOICES_WORKINGMODE_VX6S
				}
			]
		};
	}

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
					choices: this.CHOICES_PIP_ONOFF
				}
			]
		};
	}

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
					choices: this.CHOICES_PRESETS_VX6S
				}
			]
		};

		actions['take'] = {
			label: 'Take Preview to Program'
		};
	}

	return actions
}

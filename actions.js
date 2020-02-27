exports.getActions  = function() {

	let actions = {}

	// Brightness
	let CHOICES_BRIGHTNESS = [
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
	]

	// Test Patterns
	let CHOICES_TESTPATTERNS = [
			{ id: '0', label: 'Red' },
			{ id: '1', label: 'Green' },
			{ id: '2', label: 'Blue' },
			{ id: '3', label: 'White' },
			{ id: '4', label: 'Horizontal' },
			{ id: '5', label: 'Vertical' },
			{ id: '6', label: 'Diagonal' },
			{ id: '7', label: 'Gray-Scale' },
			{ id: '8', label: 'Aging-All' }
	]

	// Display Modes
	let CHOICES_DISPLAYMODE = [
		{ id: '0', label: 'Normal' },
		{ id: '1', label: 'Freeze' },
		{ id: '2', label: 'Black' },
	]

	// MCTRL4K Inputs
	let CHOICES_INPUTS_MCTRL4K = [
		{ id: '0', label: 'DVI' },
		{ id: '1', label: 'HDMI' },
		{ id: '2', label: 'Display Port' }
	]

	// VX4S Inputs
	let CHOICES_INPUTS_VX4S = [
		{ id: '0', label: 'DVI' },
		{ id: '1', label: 'HDMI' },
		{ id: '2', label: 'VGA 1' },
		{ id: '3', label: 'VGA 2' },
		{ id: '4', label: 'CVBS 1' },
		{ id: '5', label: 'CVBS 2' },
		{ id: '6', label: 'SDI' },
		{ id: '7', label: 'Display Port' }
	]

	// VX6S Inputs
	let CHOICES_INPUTS_VX6S = [
		{ id: '0', label: 'DVI' },
		{ id: '1', label: 'HDMI' },
		{ id: '2', label: 'VGA 1' },
		{ id: '3', label: 'VGA 2' },
		{ id: '4', label: 'CVBS 1' },
		{ id: '5', label: 'CVBS 2' },
		{ id: '6', label: 'SDI' },
		{ id: '7', label: 'Display Port' }
	]

	// VX6S Presets
	let CHOICES_PRESETS_VX6S = [
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
	]
	// NovaProHD Inputs
	let CHOICES_INPUTS_NOVAPROHD = [
		{ id: '0', label: 'SDI' },
		{ id: '1', label: 'DVI' },
		{ id: '2', label: 'HDMI' },
		{ id: '3', label: 'Display Port' },
		{ id: '4', label: 'VGA' },
		{ id: '5', label: 'CVBS' }
	]

	//Scaling Options - VX4S, VX6S, NovaProHD only
	let CHOICES_SCALING = [
		{ id: '0', label: 'Disable' },
		{ id: '1', label: 'Custom' },
		{ id: '2', label: 'Auto' }
	]

	// Change Brightness for eberything
	actions['change_brightness'] = {
		label: 'Change Brightness',
		options:
		[
			{
				type: 'dropdown',
				label: 'Brightness',
				id: 'brightness',
				default: '0',
				choices: CHOICES_BRIGHTNESS
			}
		]
	},

	// Test patterns
	actions['change_TP'] = {
		label: 'Change Test Patterns',
		options:
		[
			{
				type: 'dropdown',
				label: 'Test Patterns',
				id: 'tp',
				default: '0',
				choices: CHOICES_TESTPATTERNS
			}
		]
	}

	//Display Mode
	actions['change_display_mode'] = {
		label: 'Change Display Mode',
		options:
		[
			{
			type: 'dropdown',
				label: 'Display Mode',
				id: 'display_mode',
				default: '0'
			}
		]
	}

	//MCTRL4k INPUTs selection
	actions['change_mctrl4kinputs'] = {
		label: 'Change Input',
		options:
		[
			{
				type: 'dropdown',
				label: 'Input',
				id: 'input',
				default: '0',
				choices: CHOICES_INPUTS_VX4S
			}
		]
	}

	return actions
}

import { combineRgb } from '@companion-module/base'

/**
 * Build feedback definitions based on the selected processor model.
 * Feedbacks allow buttons to change appearance based on current device state.
 */
export function getFeedbacks(instance) {
	const feedbacks = {}
	const model = instance.model

	if (!model) return feedbacks

	// ======================== BRIGHTNESS MATCH ========================
	// Highlights when current brightness matches the button's value

	if (model.brightness) {
		feedbacks['brightness_match'] = {
			type: 'boolean',
			name: 'Brightness matches value',
			description: 'Change button style when brightness matches the specified percentage',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'number',
					label: 'Brightness %',
					id: 'brightness',
					default: 100,
					min: 0,
					max: 100,
				},
			],
			callback: (feedback) => {
				return Math.round(instance.state.brightness) === feedback.options.brightness
			},
		}
	}

	// ======================== DISPLAY MODE MATCH ========================
	// Highlights when current display mode matches

	if (model.displayModes) {
		feedbacks['display_mode_match'] = {
			type: 'boolean',
			name: 'Display mode active',
			description: 'Change button style when the specified display mode is active',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Display Mode',
					id: 'display_mode',
					default: '0',
					choices: model.displayModes,
				},
			],
			callback: (feedback) => {
				return instance.state.displayMode === feedback.options.display_mode
			},
		}
	}

	// ======================== INPUT MATCH ========================
	// Highlights when current input matches

	if (model.inputs) {
		feedbacks['input_match'] = {
			type: 'boolean',
			name: 'Input active',
			description: 'Change button style when the specified input is active',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: '0',
					choices: model.inputs,
				},
			],
			callback: (feedback) => {
				return instance.state.activeInput === feedback.options.input
			},
		}
	}

	// ======================== PRESET MATCH ========================
	// Highlights when current preset matches

	if (model.presets) {
		feedbacks['preset_match'] = {
			type: 'boolean',
			name: 'Preset active',
			description: 'Change button style when the specified preset is loaded',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'preset',
					default: '0',
					choices: model.presets,
				},
			],
			callback: (feedback) => {
				return instance.state.activePreset === feedback.options.preset
			},
		}
	}

	// ======================== WORKING MODE MATCH ========================

	if (model.workingModes) {
		feedbacks['working_mode_match'] = {
			type: 'boolean',
			name: 'Working mode active',
			description: 'Change button style when the specified working mode is active',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Working Mode',
					id: 'working_mode',
					default: '0',
					choices: model.workingModes,
				},
			],
			callback: (feedback) => {
				return instance.state.workingMode === feedback.options.working_mode
			},
		}
	}

	return feedbacks
}

export function compileVariableDefinitions() {
	return [
		{
			name: 'Controller ID',
			variableId: 'ctrl_id',
		},
		{
			name: 'Controller Type',
			variableId: 'ctrl_type',
		},
		{
			name: 'Controller Firmware Version',
			variableId: 'ctrl_fw',
		},
		// {
		// 	name: 'LED Panel Firmware Version',
		// 	variableId: 'led_fw',
		// },
		{
			name: 'Global Brightness',
			variableId: 'brite',
		},
		{
			name: 'Active Input',
			variableId: 'active_input',
		},
		{
			name: 'Display Mode',
			variableId: 'display_mode',
		},
		{
			name: 'Active Preset',
			variableId: 'active_preset',
		},
	]
}

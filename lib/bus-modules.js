const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

const modules = {
	ABG  : 0xA4, // Airbag
	AHL  : 0x66, // Adaptive headlight unit
	ANZV : 0xE7, // Display group
	ASC  : 0x56, // Anti-lock braking system with ASC
	ASST : 0xCA, // BMW Assist
	BMBT : 0xF0, // On board monitor control panel
	CCM  : 0x30, // Check control messages
	CDC  : 0x18, // CD changer
	CDCD : 0x76, // CD changer (DIN size)
	CID  : 0x46, // Center information display
	CSU  : 0xF5, // Centre switch control unit
	CVM  : 0x52, // Cabrio folding top module
	DIA  : 0x3F, // Diagnostic
	DME  : 0x12, // Digital Motor Electronics
	DME2 : 0xB8, // DME (K2000 protocol)
	DSP  : 0x6A, // Digital sound processor amplifier
	DSPC : 0xEA, // Digital sound processor controller
	EGS  : 0x32, // Electronic gearbox control
	EHC  : 0xAC, // Electronic height control
	EKM  : 0x02, // Electronic body module
	EKP  : 0x65, // Electronic fuel pump
	EWS  : 0x44, // EWS immobilizer
	FBZV : 0x40, // Key fob (only older E38)
	FHK  : 0xA7, // Automatic climate control, rear
	FID  : 0xA0, // Multi-information display, rear
	FMBT : 0x47, // Rear monitor controls
	GLO  : 0xBF, // Global
	GM   : 0x00, // General module
	GR   : 0xA6, // Cruise control
	GT   : 0x3B, // Navigation
	GTF  : 0x43, // Navigation, rear
	HAC  : 0x9A, // Headlight aim control
	HKM  : 0x24, // Boot lid control unit
	IHKA : 0x5B, // Automatic climate control
	IKE  : 0x80, // Cluster
	IRIS : 0xE0, // Integrated radio information system
	LCM  : 0xD0, // Light/check module
	LOC  : 0xFF, // Local
	LWS  : 0x57, // Steering angle sensor
	MFL  : 0x50, // Multi function lever
	MID  : 0xC0, // Multi-information display
	MID1 : 0x01, // Multi-information display (1st generation)
	MM3  : 0x9C, // Mirror memory 3
	MML  : 0x51, // Mirror memory, left
	MMR  : 0x9B, // Mirror memory, right
	NAVC : 0xA8, // Navigation China
	NAVE : 0x7F, // Navigation Europe
	NAVJ : 0xBB, // Navigation Japan
	PDC  : 0x60, // Park distance control
	PIC  : 0xF1, // Programmable controller (custom unit)
	RAD  : 0x68, // Radio
	RCC  : 0x28, // Radio controlled clock
	RCSC : 0x81, // Revolution counter/steering column
	RDC  : 0x70, // Tire pressure control
	RLS  : 0xE8, // Rain/light sensor
	SDRS : 0x73, // Sirius sat radio
	SES  : 0xB0, // Handfree/speech input
	SHD  : 0x08, // Sunroof module
	SM   : 0x72, // Seat memory
	SMAD : 0xDA, // Seat memory assistant driver
	SOR  : 0x74, // Seat occupancy recognition unit
	STH  : 0x6B, // Standing heat
	TCU  : 0xCA, // Telematics control unit
	TEL  : 0xC8, // Telephone
	VID  : 0xED, // Video input/TV tuner
};

// Short array of modules to always query status on powerup
const modules_check = [
	'CCM',
	'CDC',
	'DSP',
	'DSPC',
	'GM',
	'IHKA',
	'IKE',
	'LCM',
	'MID',
	'RAD',
	'RLS',
];

module.exports = {
	modules       : modules,
	modules_check : modules_check,

	// 0x80 -> IKE
	h2n : (hex) => {
		for (let name in modules) {
			if (modules[name] === hex) return name;
		}

		// Didn't find it
		return 'unk';
	},

	// IKE -> 0x80
	n2h : (name) => {
		if (typeof modules[name] !== 'undefined' && modules[name]) return modules[name];

		// Didn't find it
		return 0x00;
	},
};

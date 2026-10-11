export type RectifierTopology = 'diode' | 'thyristor';
export type PhaseMode = '1phase' | '3phase';

export type ProbeComponentId =
  | 'load_total'
  | 'resistor_R'
  | 'inductor_L'
  | 'back_emf_E'
  | 'ac_source'
  | 'switch_1'
  | 'switch_2'
  | 'switch_3'
  | 'switch_4'
  | 'switch_5'
  | 'switch_6'
  | 'freewheeling';

export interface SimulationParams {
  topology: RectifierTopology;
  phaseMode: PhaseMode;
  vRms: number;          // RMS Phase Voltage (1-phase) or Line-to-Neutral RMS Voltage (3-phase) in Volts
  frequency: number;     // Supply frequency in Hz (50 or 60)
  alphaDeg: number;      // Thyristor firing angle in degrees (0 to 180 for 1-ph, 0 to 150 for 3-ph)
  resistanceR: number;   // Load resistance R in Ohms
  inductanceMH: number;  // Load inductance L in milliHenries (0 = purely resistive/back-EMF)
  backEmfE: number;      // Load DC back-EMF E in Volts
  freewheelingDiode: boolean; // Optional freewheeling diode across R-L-E load
}

export interface WaveformPoint {
  thetaDeg: number;      // Electrical angle in degrees [0..720] (two full cycles)
  timeMs: number;        // Time in milliseconds
  // AC Supply Voltages
  vSupplyA: number;      // 1-ph: v_s | 3-ph: v_an
  vSupplyB: number;      // 3-ph: v_bn (0 in 1-ph)
  vSupplyC: number;      // 3-ph: v_cn (0 in 1-ph)
  vLineAB: number;       // 1-ph: v_s | 3-ph: v_ab
  vLineBC: number;       // 3-ph: v_bc
  vLineCA: number;       // 3-ph: v_ca
  // AC Supply Currents
  iSupplyA: number;      // 1-ph: i_s | 3-ph: i_a
  iSupplyB: number;      // 3-ph: i_b
  iSupplyC: number;      // 3-ph: i_c
  // Load Branch Quantities
  vLoadTotal: number;    // Total rectifier terminal output voltage v_out (across R + L + E)
  iLoad: number;         // Load current i_out
  vResistorR: number;    // Voltage across Resistor R: v_R = i_out * R
  vInductorL: number;    // Voltage across Inductor L: v_L = L * di_out/dt
  vBackEmfE: number;     // Voltage across Back-EMF source E: v_E = E
  // Individual Bridge Switches (D1..D6 or T1..T6)
  vSwitch: [number, number, number, number, number, number]; // Anode-to-Cathode voltage v_AK
  iSwitch: [number, number, number, number, number, number]; // Switch current i_AK
  gSwitch: [number, number, number, number, number, number]; // Gate trigger pulse (0 or 1)
  // Freewheeling Diode
  vFreewheeling: number; // Anode-to-Cathode voltage across D_fw (-vLoadTotal)
  iFreewheeling: number; // Current through freewheeling diode D_fw
  // Conduction status string for instant HUD readout
  activeDevices: string;
}

export interface TelemetryMetrics {
  vDcAvg: number;        // Average DC output voltage V_dc (V)
  vOutRms: number;       // RMS output voltage V_rms (V)
  iDcAvg: number;        // Average DC load current I_dc (A)
  iOutRms: number;       // RMS load current I_rms (A)
  vResistorAvg: number;  // Average voltage across R (V)
  vInductorAvg: number;  // Average voltage across L (V, ~0 in steady state)
  vInductorRms: number;  // RMS voltage across L (V)
  pLoadActive: number;   // Active power delivered to load (W)
  pResistor: number;     // Power dissipated in R: I_rms^2 * R (W)
  pBackEmf: number;      // Power absorbed by Back-EMF E: I_dc * E (W)
  formFactor: number;    // V_rms / |V_dc|
  rippleFactor: number;  // sqrt(FF^2 - 1)
  currentRippleRatio: number; // (I_max - I_min) / I_dc
  conductionMode: 'CCM' | 'DCM' | 'Cut-Off';
  conductionAngleDeg: number; // Total conduction degrees per cycle
  extinctionAngleDeg: number; // Angle beta where load current reaches 0 (in DCM)
  minFiringAngleDeg: number;  // Minimum angle theta_1 where source exceeds E
  pivVolts: number;      // Peak Inverse Voltage across a bridge switch (V)
  powerFactor: number;   // Input AC supply power factor
  // Selected Component specific metrics
  probeVAvg: number;
  probeVRms: number;
  probeVPeakMax: number;
  probeVPeakMin: number;
  probeIAvg: number;
  probeIRms: number;
  probeIPeak: number;
  probePowerAvg: number;
}

export interface ProbeMetadata {
  id: ProbeComponentId;
  shortLabel: string;
  fullName: string;
  symbol: string;
  voltageSymbol: string;
  currentSymbol: string;
  formula: string;
  description: string;
  category: 'load' | 'source' | 'bridge';
}

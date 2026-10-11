import {
  ProbeComponentId,
  ProbeMetadata,
  SimulationParams,
  TelemetryMetrics,
  WaveformPoint,
} from '../types/simulation';

export function getProbeMetadataList(
  phaseMode: '1phase' | '3phase',
  topology: 'diode' | 'thyristor'
): ProbeMetadata[] {
  const devPrefix = topology === 'diode' ? 'D' : 'T';
  const devName = topology === 'diode' ? 'Diode' : 'Thyristor (SCR)';

  const baseItems: ProbeMetadata[] = [
    {
      id: 'load_total',
      shortLabel: 'Total R-L-E Load (V_out)',
      fullName: 'Rectifier Output Across Full R-L-E Load',
      symbol: 'Z_load',
      voltageSymbol: 'v_out(t)',
      currentSymbol: 'i_out(t)',
      formula: 'v_out(t) = v_R(t) + v_L(t) + E = R·i_o(t) + L·(di_o/dt) + E',
      description:
        'Total rectified terminal voltage and load current across the series R-L-E branch.',
      category: 'load',
    },
    {
      id: 'resistor_R',
      shortLabel: 'Resistor (R)',
      fullName: 'Load Resistor R Component Drop',
      symbol: 'R',
      voltageSymbol: 'v_R(t)',
      currentSymbol: 'i_R(t)',
      formula: 'v_R(t) = R · i_out(t)',
      description:
        'Purely resistive voltage drop proportional to instantaneous load current i_out(t).',
      category: 'load',
    },
    {
      id: 'inductor_L',
      shortLabel: 'Inductor (L)',
      fullName: 'Smoothing / Load Inductor L Voltage',
      symbol: 'L',
      voltageSymbol: 'v_L(t)',
      currentSymbol: 'i_L(t)',
      formula: 'v_L(t) = L · di_out(t)/dt = v_out(t) - R·i_out(t) - E',
      description:
        'Induced EMF across inductance L. Stores magnetic energy when v_L > 0 and releases it after source reversal when v_L < 0 (volt-second balance <v_L> = 0).',
      category: 'load',
    },
    {
      id: 'back_emf_E',
      shortLabel: 'Back-EMF Source (E)',
      fullName: 'DC Counter-EMF / Battery / Motor Armature E',
      symbol: 'E',
      voltageSymbol: 'v_E(t)',
      currentSymbol: 'i_out(t)',
      formula: 'v_E(t) = E (constant DC counter-potential)',
      description:
        'Constant DC counter-voltage representing a DC motor back-EMF or battery bank being charged.',
      category: 'load',
    },
    {
      id: 'ac_source',
      shortLabel: phaseMode === '1phase' ? 'AC Supply (v_s)' : '3-Phase AC Supply (v_ab, i_a)',
      fullName:
        phaseMode === '1phase'
          ? 'Single-Phase AC Utility Supply'
          : 'Three-Phase Balanced AC Supply',
      symbol: phaseMode === '1phase' ? 'V_s' : 'V_ABC',
      voltageSymbol: phaseMode === '1phase' ? 'v_s(t)' : 'v_ab(t)',
      currentSymbol: phaseMode === '1phase' ? 'i_s(t)' : 'i_a(t)',
      formula:
        phaseMode === '1phase'
          ? 'v_s(ωt) = √2 · V_rms · sin(ωt)'
          : 'v_ab(ωt) = √6 · V_LN,rms · sin(ωt + 30°)',
      description:
        phaseMode === '1phase'
          ? 'Input sinusoidal voltage and alternating line current drawn from the single-phase source.'
          : 'Three-phase line-to-line supply voltage v_ab and Phase-A alternating line current i_a.',
      category: 'source',
    },
    {
      id: 'switch_1',
      shortLabel: `${devPrefix}1 (${phaseMode === '1phase' ? 'Upper-Left' : 'Phase A+'})`,
      fullName: `Bridge ${devName} ${devPrefix}1`,
      symbol: `${devPrefix}1`,
      voltageSymbol: `v_${devPrefix}1(t)`,
      currentSymbol: `i_${devPrefix}1(t)`,
      formula:
        phaseMode === '1phase'
          ? `v_${devPrefix}1 = v_AK across ${devPrefix}1 (0V when conducting)`
          : `v_${devPrefix}1 = v_an(t) - v_dc+(t)`,
      description: `Anode-to-cathode forward/reverse blocking voltage and conduction current through ${devName} ${devPrefix}1.`,
      category: 'bridge',
    },
    {
      id: 'switch_2',
      shortLabel: `${devPrefix}2 (${phaseMode === '1phase' ? 'Lower-Right' : 'Phase C-'})`,
      fullName: `Bridge ${devName} ${devPrefix}2`,
      symbol: `${devPrefix}2`,
      voltageSymbol: `v_${devPrefix}2(t)`,
      currentSymbol: `i_${devPrefix}2(t)`,
      formula:
        phaseMode === '1phase'
          ? `v_${devPrefix}2 = v_AK across ${devPrefix}2 (paired with ${devPrefix}1)`
          : `v_${devPrefix}2 = v_dc-(t) - v_cn(t)`,
      description: `Anode-to-cathode blocking voltage and current through ${devName} ${devPrefix}2.`,
      category: 'bridge',
    },
    {
      id: 'switch_3',
      shortLabel: `${devPrefix}3 (${phaseMode === '1phase' ? 'Upper-Right' : 'Phase B+'})`,
      fullName: `Bridge ${devName} ${devPrefix}3`,
      symbol: `${devPrefix}3`,
      voltageSymbol: `v_${devPrefix}3(t)`,
      currentSymbol: `i_${devPrefix}3(t)`,
      formula:
        phaseMode === '1phase'
          ? `v_${devPrefix}3 = v_AK across ${devPrefix}3 (negative half-cycle)`
          : `v_${devPrefix}3 = v_bn(t) - v_dc+(t)`,
      description: `Anode-to-cathode blocking voltage and current through ${devName} ${devPrefix}3.`,
      category: 'bridge',
    },
    {
      id: 'switch_4',
      shortLabel: `${devPrefix}4 (${phaseMode === '1phase' ? 'Lower-Left' : 'Phase A-'})`,
      fullName: `Bridge ${devName} ${devPrefix}4`,
      symbol: `${devPrefix}4`,
      voltageSymbol: `v_${devPrefix}4(t)`,
      currentSymbol: `i_${devPrefix}4(t)`,
      formula:
        phaseMode === '1phase'
          ? `v_${devPrefix}4 = v_AK across ${devPrefix}4 (paired with ${devPrefix}3)`
          : `v_${devPrefix}4 = v_dc-(t) - v_an(t)`,
      description: `Anode-to-cathode blocking voltage and current through ${devName} ${devPrefix}4.`,
      category: 'bridge',
    },
  ];

  if (phaseMode === '3phase') {
    baseItems.push(
      {
        id: 'switch_5',
        shortLabel: `${devPrefix}5 (Phase C+)`,
        fullName: `Bridge ${devName} ${devPrefix}5`,
        symbol: `${devPrefix}5`,
        voltageSymbol: `v_${devPrefix}5(t)`,
        currentSymbol: `i_${devPrefix}5(t)`,
        formula: `v_${devPrefix}5 = v_cn(t) - v_dc+(t)`,
        description: `Upper Phase-C ${devName} ${devPrefix}5 voltage and conduction current.`,
        category: 'bridge',
      },
      {
        id: 'switch_6',
        shortLabel: `${devPrefix}6 (Phase B-)`,
        fullName: `Bridge ${devName} ${devPrefix}6`,
        symbol: `${devPrefix}6`,
        voltageSymbol: `v_${devPrefix}6(t)`,
        currentSymbol: `i_${devPrefix}6(t)`,
        formula: `v_${devPrefix}6 = v_dc-(t) - v_bn(t)`,
        description: `Lower Phase-B ${devName} ${devPrefix}6 voltage and conduction current.`,
        category: 'bridge',
      }
    );
  }

  baseItems.push({
    id: 'freewheeling',
    shortLabel: 'Freewheeling Diode (D_fw)',
    fullName: 'Shunt Freewheeling Diode Across Load',
    symbol: 'D_fw',
    voltageSymbol: 'v_fw(t)',
    currentSymbol: 'i_fw(t)',
    formula: 'v_fw(t) = -v_out(t), conducts when v_bridge < 0',
    description:
      'Clamps negative load voltage excursions by circulating inductive load current when AC bridge voltage reverses.',
    category: 'bridge',
  });

  return baseItems;
}

export function extractProbeSignal(
  point: WaveformPoint,
  probeId: ProbeComponentId
): { voltage: number; current: number } {
  switch (probeId) {
    case 'load_total':
      return { voltage: point.vLoadTotal, current: point.iLoad };
    case 'resistor_R':
      return { voltage: point.vResistorR, current: point.iLoad };
    case 'inductor_L':
      return { voltage: point.vInductorL, current: point.iLoad };
    case 'back_emf_E':
      return { voltage: point.vBackEmfE, current: point.iLoad };
    case 'ac_source':
      return { voltage: point.vLineAB, current: point.iSupplyA };
    case 'switch_1':
      return { voltage: point.vSwitch[0], current: point.iSwitch[0] };
    case 'switch_2':
      return { voltage: point.vSwitch[1], current: point.iSwitch[1] };
    case 'switch_3':
      return { voltage: point.vSwitch[2], current: point.iSwitch[2] };
    case 'switch_4':
      return { voltage: point.vSwitch[3], current: point.iSwitch[3] };
    case 'switch_5':
      return { voltage: point.vSwitch[4], current: point.iSwitch[4] };
    case 'switch_6':
      return { voltage: point.vSwitch[5], current: point.iSwitch[5] };
    case 'freewheeling':
      return { voltage: point.vFreewheeling, current: point.iFreewheeling };
  }
}

/**
 * Solves steady-state waveforms for 1-Phase and 3-Phase Diode and Thyristor Bridge Rectifiers
 * with general R-L-E loads and optional Freewheeling Diode.
 * Simulates multiple pre-cycles so inductor current reaches its exact periodic steady-state limit cycle,
 * then records 2 full cycles (0° to 720°) at 1° resolution for display and telemetry analysis.
 */
export function runRectifierSimulation(
  params: SimulationParams,
  selectedProbe: ProbeComponentId
): {
  points: WaveformPoint[];
  metrics: TelemetryMetrics;
} {
  const {
    topology,
    phaseMode,
    vRms,
    frequency,
    alphaDeg,
    resistanceR,
    inductanceMH,
    backEmfE,
    freewheelingDiode,
  } = params;

  const alpha = topology === 'diode' ? 0 : Math.max(0, Math.min(phaseMode === '3phase' ? 150 : 175, alphaDeg));
  const R = Math.max(0.5, resistanceR);
  const L = Math.max(0, inductanceMH) * 1e-3; // Convert mH to Henries
  const E = Math.max(0, backEmfE);
  const omega = 2 * Math.PI * frequency;
  const vPeak = Math.SQRT2 * vRms;
  const devPrefix = topology === 'diode' ? 'D' : 'T';

  // High-resolution simulation step: 0.25 degrees per integration step
  const dThetaDeg = 0.25;
  const dThetaRad = (dThetaDeg * Math.PI) / 180;
  const dt = dThetaRad / omega;

  // Run 5 warmup cycles if L > 0 so CCM/DCM transient settles to exact steady state, then record 2 full cycles (720 deg)
  const warmupCycles = L > 0 ? Math.min(8, Math.max(3, Math.ceil((omega * L) / R))) : 1;
  const totalCycles = warmupCycles + 2;
  const stepsPerCycle = Math.round(360 / dThetaDeg); // 1440 steps per cycle
  const recordStartStep = warmupCycles * stepsPerCycle;
  const totalSteps = totalCycles * stepsPerCycle;

  const points: WaveformPoint[] = [];

  if (phaseMode === '1phase') {
    // 1-Phase State: 0 = NONE (DCM), 1 = PAIR_12 (T1,T2), 2 = PAIR_34 (T3,T4), 3 = FREEWHEEL (D_fw)
    let state: 0 | 1 | 2 | 3 = 0;
    let iLoad = 0;

    for (let step = 0; step <= totalSteps; step++) {
      const totalDeg = step * dThetaDeg;
      const modDeg = ((totalDeg % 360) + 360) % 360;
      const thetaRad = (modDeg * Math.PI) / 180;

      const vs = vPeak * Math.sin(thetaRad);

      // Gate pulses (carrier window [alpha, 180) for T1,T2 and [180+alpha, 360) for T3,T4)
      const gate12Window = topology === 'diode' ? modDeg >= 0 && modDeg <= 180 : modDeg >= alpha && modDeg < 180;
      const gate34Window =
        topology === 'diode' ? modDeg >= 180 && modDeg <= 360 : modDeg >= 180 + alpha && modDeg < 360;

      // Visual gate pulse indicator (15-degree pulse at firing instant)
      const g12Pulse =
        topology === 'thyristor' && modDeg >= alpha && modDeg <= Math.min(180, alpha + 14) ? 1 : 0;
      const g34Pulse =
        topology === 'thyristor' && modDeg >= 180 + alpha && modDeg <= Math.min(360, 180 + alpha + 14)
          ? 1
          : 0;

      // State transitions / Commutation logic
      if (state === 0) {
        if (gate12Window && vs > E) {
          state = 1;
        } else if (gate34Window && -vs > E) {
          state = 2;
        }
      } else if (state === 1) {
        if (gate34Window && -vs > vs) {
          state = 2; // Natural line commutation from (1,2) to (3,4)
        } else if (freewheelingDiode && vs < 0) {
          state = 3; // Commutation to freewheeling diode
        }
      } else if (state === 2) {
        if (gate12Window && vs > -vs) {
          state = 1; // Natural line commutation from (3,4) to (1,2)
        } else if (freewheelingDiode && -vs < 0) {
          state = 3; // Commutation to freewheeling diode
        }
      } else if (state === 3) {
        if (gate12Window && vs > 0) {
          state = 1;
        } else if (gate34Window && -vs > 0) {
          state = 2;
        }
      }

      // Compute instantaneous voltages and evolve load current
      let vOut = E;
      let vR = 0;
      let vL = 0;

      if (state !== 0) {
        const vApplied = state === 1 ? vs : state === 2 ? -vs : 0;

        if (L > 1e-6) {
          const diDt = (vApplied - R * iLoad - E) / L;
          const iNext = iLoad + diDt * dt;

          if (iNext <= 0) {
            iLoad = 0;
            state = 0;
            vOut = E;
            vR = 0;
            vL = 0;
          } else {
            iLoad = iNext;
            vOut = vApplied;
            vR = iLoad * R;
            vL = vOut - vR - E;
          }
        } else {
          // Purely resistive or R-E load (L = 0)
          if (vApplied > E) {
            iLoad = (vApplied - E) / R;
            vOut = vApplied;
            vR = iLoad * R;
            vL = 0;
          } else {
            iLoad = 0;
            state = 0;
            vOut = E;
            vR = 0;
            vL = 0;
          }
        }
      } else {
        iLoad = 0;
        vOut = E;
        vR = 0;
        vL = 0;
      }

      // Record points every 1.0 degree (every 4 sub-steps) during the final 2 cycles
      if (step >= recordStartStep && (step - recordStartStep) % 4 === 0) {
        const recDeg = (step - recordStartStep) * dThetaDeg; // 0 to 720
        const timeMs = (recDeg / 360) * (1000 / frequency);

        // Individual switch voltages & currents (exact KVL)
        let vT1 = 0,
          vT2 = 0,
          vT3 = 0,
          vT4 = 0;
        let iT1 = 0,
          iT2 = 0,
          iT3 = 0,
          iT4 = 0;
        let iFw = 0;
        let iSupply = 0;
        let activeDevices = 'None (Blocked)';

        if (state === 1) {
          // T1, T2 conducting
          vT1 = 0;
          vT2 = 0;
          vT3 = -vs;
          vT4 = -vs;
          iT1 = iLoad;
          iT2 = iLoad;
          iSupply = iLoad;
          activeDevices = `${devPrefix}1, ${devPrefix}2`;
        } else if (state === 2) {
          // T3, T4 conducting
          vT3 = 0;
          vT4 = 0;
          vT1 = vs;
          vT2 = vs;
          iT3 = iLoad;
          iT4 = iLoad;
          iSupply = -iLoad;
          activeDevices = `${devPrefix}3, ${devPrefix}4`;
        } else if (state === 3) {
          // Freewheeling diode conducting (vOut = 0)
          vT1 = vs * 0.5;
          vT2 = vs * 0.5;
          vT3 = -vs * 0.5;
          vT4 = -vs * 0.5;
          iFw = iLoad;
          iSupply = 0;
          activeDevices = 'D_fw (Freewheeling)';
        } else {
          // All switches blocked (vOut = E)
          vT1 = (vs - E) * 0.5;
          vT2 = (vs - E) * 0.5;
          vT3 = (-vs - E) * 0.5;
          vT4 = (-vs - E) * 0.5;
          iSupply = 0;
          activeDevices = 'None (DCM Cut-Off)';
        }

        points.push({
          thetaDeg: recDeg,
          timeMs,
          vSupplyA: vs,
          vSupplyB: 0,
          vSupplyC: 0,
          vLineAB: vs,
          vLineBC: 0,
          vLineCA: 0,
          iSupplyA: iSupply,
          iSupplyB: 0,
          iSupplyC: 0,
          vLoadTotal: vOut,
          iLoad,
          vResistorR: vR,
          vInductorL: vL,
          vBackEmfE: E,
          vSwitch: [vT1, vT2, vT3, vT4, 0, 0],
          iSwitch: [iT1, iT2, iT3, iT4, 0, 0],
          gSwitch: [g12Pulse, g12Pulse, g34Pulse, g34Pulse, 0, 0],
          vFreewheeling: -vOut,
          iFreewheeling: iFw,
          activeDevices,
        });
      }
    }
  } else {
    // 3-PHASE 6-PULSE FULL BRIDGE SIMULATION
    // Upper switches: T1 (Phase A, idx 0), T3 (Phase B, idx 2), T5 (Phase C, idx 4)
    // Lower switches: T2 (Phase C, idx 1), T4 (Phase A, idx 3), T6 (Phase B, idx 5)
    // Conduction state: upperIdx in {0, 2, 4} | -1 (none/fw), lowerIdx in {1, 3, 5} | -1 (none/fw)
    let activeUpper: -1 | 0 | 2 | 4 = -1;
    let activeLower: -1 | 1 | 3 | 5 = -1;
    let isFreewheeling = false;
    let iLoad = 0;

    // Natural commutation angles for T1..T6:
    // T1: 30°, T2: 90°, T3: 150°, T4: 210°, T5: 270°, T6: 330°
    const natAngles = [30, 90, 150, 210, 270, 330];

    const isSwitchGated = (swIdx: number, modDeg: number): boolean => {
      if (topology === 'diode') return true;
      const fireAngle = (natAngles[swIdx] + alpha) % 360;
      const rel = ((modDeg - fireAngle) % 360 + 360) % 360;
      // Double-pulsing / wide gate window up to 150 deg ensures 6-pulse startup and commutation
      return rel >= 0 && rel < 150;
    };

    const isGatePulseVisual = (swIdx: number, modDeg: number): number => {
      if (topology === 'diode') return 0;
      const fire1 = (natAngles[swIdx] + alpha) % 360;
      const fire2 = (natAngles[swIdx] + alpha + 60) % 360; // Standard double-pulse for 6-pulse SCR bridge
      const rel1 = ((modDeg - fire1) % 360 + 360) % 360;
      const rel2 = ((modDeg - fire2) % 360 + 360) % 360;
      return rel1 <= 10 || rel2 <= 8 ? 1 : 0;
    };

    const upperPhaseMap: Record<0 | 2 | 4, 0 | 1 | 2> = { 0: 0, 2: 1, 4: 2 }; // T1->A, T3->B, T5->C
    const lowerPhaseMap: Record<1 | 3 | 5, 0 | 1 | 2> = { 3: 0, 5: 1, 1: 2 }; // T4->A, T6->B, T2->C

    for (let step = 0; step <= totalSteps; step++) {
      const totalDeg = step * dThetaDeg;
      const modDeg = ((totalDeg % 360) + 360) % 360;
      const thetaRad = (modDeg * Math.PI) / 180;

      const van = vPeak * Math.sin(thetaRad);
      const vbn = vPeak * Math.sin(thetaRad - (2 * Math.PI) / 3);
      const vcn = vPeak * Math.sin(thetaRad - (4 * Math.PI) / 3);
      const vPhases = [van, vbn, vcn];

      const vab = van - vbn;
      const vbc = vbn - vcn;
      const vca = vcn - van;

      // Find best available (gated) upper+lower switch pair with highest line-to-line voltage
      let bestU: -1 | 0 | 2 | 4 = -1;
      let bestL: -1 | 1 | 3 | 5 = -1;
      let bestVll = -Infinity;

      const uppers: (0 | 2 | 4)[] = [0, 2, 4];
      const lowers: (1 | 3 | 5)[] = [1, 3, 5];

      for (const u of uppers) {
        if (!isSwitchGated(u, modDeg)) continue;
        for (const l of lowers) {
          if (!isSwitchGated(l, modDeg)) continue;
          const pU = upperPhaseMap[u];
          const pL = lowerPhaseMap[l];
          if (pU === pL) continue;
          const vll = vPhases[pU] - vPhases[pL];
          if (vll > bestVll) {
            bestVll = vll;
            bestU = u;
            bestL = l;
          }
        }
      }

      // Also check single-side commutation if bridge is already conducting
      if (activeUpper !== -1 && activeLower !== -1) {
        // Check if a newly gated upper switch has higher phase voltage than current upper switch
        for (const u of uppers) {
          if (isSwitchGated(u, modDeg)) {
            const pU = upperPhaseMap[u];
            const pCurU = upperPhaseMap[activeUpper];
            if (vPhases[pU] > vPhases[pCurU] && pU !== lowerPhaseMap[activeLower]) {
              activeUpper = u;
            }
          }
        }
        // Check if a newly gated lower switch has lower phase voltage than current lower switch
        for (const l of lowers) {
          if (isSwitchGated(l, modDeg)) {
            const pL = lowerPhaseMap[l];
            const pCurL = lowerPhaseMap[activeLower];
            if (vPhases[pL] < vPhases[pCurL] && pL !== upperPhaseMap[activeUpper]) {
              activeLower = l;
            }
          }
        }
      }

      // Check full pair commutation or startup from DCM
      if (activeUpper === -1 && !isFreewheeling) {
        if (bestU !== -1 && bestL !== -1 && bestVll > E) {
          activeUpper = bestU;
          activeLower = bestL;
        }
      } else if (isFreewheeling) {
        if (bestU !== -1 && bestL !== -1 && bestVll > 0) {
          activeUpper = bestU;
          activeLower = bestL;
          isFreewheeling = false;
        }
      } else if (activeUpper !== -1 && activeLower !== -1) {
        const curVll = vPhases[upperPhaseMap[activeUpper]] - vPhases[lowerPhaseMap[activeLower]];
        if (bestU !== -1 && bestL !== -1 && bestVll > curVll) {
          activeUpper = bestU;
          activeLower = bestL;
        }
        const updatedVll = vPhases[upperPhaseMap[activeUpper]] - vPhases[lowerPhaseMap[activeLower]];
        if (freewheelingDiode && updatedVll < 0) {
          isFreewheeling = true;
          activeUpper = -1;
          activeLower = -1;
        }
      }

      // Evolve load current
      let vOut = E;
      let vR = 0;
      let vL = 0;

      const isConducting = (activeUpper !== -1 && activeLower !== -1) || isFreewheeling;
      if (isConducting) {
        const vApplied = isFreewheeling
          ? 0
          : vPhases[upperPhaseMap[activeUpper as 0 | 2 | 4]] -
            vPhases[lowerPhaseMap[activeLower as 1 | 3 | 5]];

        if (L > 1e-6) {
          const diDt = (vApplied - R * iLoad - E) / L;
          const iNext = iLoad + diDt * dt;
          if (iNext <= 0) {
            iLoad = 0;
            activeUpper = -1;
            activeLower = -1;
            isFreewheeling = false;
            vOut = E;
            vR = 0;
            vL = 0;
          } else {
            iLoad = iNext;
            vOut = vApplied;
            vR = iLoad * R;
            vL = vOut - vR - E;
          }
        } else {
          if (vApplied > E) {
            iLoad = (vApplied - E) / R;
            vOut = vApplied;
            vR = iLoad * R;
            vL = 0;
          } else {
            iLoad = 0;
            activeUpper = -1;
            activeLower = -1;
            isFreewheeling = false;
            vOut = E;
            vR = 0;
            vL = 0;
          }
        }
      } else {
        iLoad = 0;
        vOut = E;
        vR = 0;
        vL = 0;
      }

      // Record points every 1.0 degree during the final 2 cycles
      if (step >= recordStartStep && (step - recordStartStep) % 4 === 0) {
        const recDeg = (step - recordStartStep) * dThetaDeg;
        const timeMs = (recDeg / 360) * (1000 / frequency);

        let vDcPlus = E * 0.5;
        let vDcMinus = -E * 0.5;
        if (activeUpper !== -1 && activeLower !== -1) {
          vDcPlus = vPhases[upperPhaseMap[activeUpper]];
          vDcMinus = vPhases[lowerPhaseMap[activeLower]];
        } else if (isFreewheeling) {
          vDcPlus = 0;
          vDcMinus = 0;
        }

        // Exact switch voltages v_AK for T1..T6
        const vSw: [number, number, number, number, number, number] = [
          van - vDcPlus, // T1 (Upper A)
          vDcMinus - vcn, // T2 (Lower C)
          vbn - vDcPlus, // T3 (Upper B)
          vDcMinus - van, // T4 (Lower A)
          vcn - vDcPlus, // T5 (Upper C)
          vDcMinus - vbn, // T6 (Lower B)
        ];

        const iSw: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
        if (activeUpper !== -1 && activeLower !== -1) {
          vSw[activeUpper] = 0;
          vSw[activeLower] = 0;
          iSw[activeUpper] = iLoad;
          iSw[activeLower] = iLoad;
        }

        const gSw: [number, number, number, number, number, number] = [
          isGatePulseVisual(0, modDeg),
          isGatePulseVisual(1, modDeg),
          isGatePulseVisual(2, modDeg),
          isGatePulseVisual(3, modDeg),
          isGatePulseVisual(4, modDeg),
          isGatePulseVisual(5, modDeg),
        ];

        const ia = iSw[0] - iSw[3];
        const ib = iSw[2] - iSw[5];
        const ic = iSw[4] - iSw[1];

        let activeDevices = 'None (DCM Cut-Off)';
        if (activeUpper !== -1 && activeLower !== -1) {
          activeDevices = `${devPrefix}${activeUpper + 1}, ${devPrefix}${activeLower + 1}`;
        } else if (isFreewheeling) {
          activeDevices = 'D_fw (Freewheeling)';
        }

        points.push({
          thetaDeg: recDeg,
          timeMs,
          vSupplyA: van,
          vSupplyB: vbn,
          vSupplyC: vcn,
          vLineAB: vab,
          vLineBC: vbc,
          vLineCA: vca,
          iSupplyA: ia,
          iSupplyB: ib,
          iSupplyC: ic,
          vLoadTotal: vOut,
          iLoad,
          vResistorR: vR,
          vInductorL: vL,
          vBackEmfE: E,
          vSwitch: vSw,
          iSwitch: iSw,
          gSwitch: gSw,
          vFreewheeling: -vOut,
          iFreewheeling: isFreewheeling ? iLoad : 0,
          activeDevices,
        });
      }
    }
  }

  // Compute Telemetry Metrics over one full 360-degree fundamental cycle (points[0..359])
  const cyclePoints = points.slice(0, 360);
  const N = cyclePoints.length;

  let sumVOut = 0,
    sumVOutSq = 0,
    sumILoad = 0,
    sumILoadSq = 0;
  let sumVR = 0,
    sumVL = 0,
    sumVLSq = 0;
  let sumPLoad = 0,
    sumISupplyASq = 0;
  let maxILoad = -Infinity,
    minILoad = Infinity;
  let conductingCount = 0;
  let lastExtinctionDeg = 0;
  let maxSwitchInverseV = 0;

  let sumProbeV = 0,
    sumProbeVSq = 0,
    maxProbeV = -Infinity,
    minProbeV = Infinity;
  let sumProbeI = 0,
    sumProbeISq = 0,
    maxProbeI = 0,
    sumProbeP = 0;

  for (let i = 0; i < N; i++) {
    const pt = cyclePoints[i];
    sumVOut += pt.vLoadTotal;
    sumVOutSq += pt.vLoadTotal * pt.vLoadTotal;
    sumILoad += pt.iLoad;
    sumILoadSq += pt.iLoad * pt.iLoad;
    sumVR += pt.vResistorR;
    sumVL += pt.vInductorL;
    sumVLSq += pt.vInductorL * pt.vInductorL;
    sumPLoad += pt.vLoadTotal * pt.iLoad;
    sumISupplyASq += pt.iSupplyA * pt.iSupplyA;

    if (pt.iLoad > maxILoad) maxILoad = pt.iLoad;
    if (pt.iLoad < minILoad) minILoad = pt.iLoad;

    if (pt.iLoad > 1e-3) {
      conductingCount++;
      if (i > 0 && cyclePoints[(i + 1) % N].iLoad <= 1e-3) {
        lastExtinctionDeg = pt.thetaDeg;
      }
    }

    for (const vSw of pt.vSwitch) {
      if (-vSw > maxSwitchInverseV) {
        maxSwitchInverseV = -vSw;
      }
    }

    const pr = extractProbeSignal(pt, selectedProbe);
    sumProbeV += pr.voltage;
    sumProbeVSq += pr.voltage * pr.voltage;
    if (pr.voltage > maxProbeV) maxProbeV = pr.voltage;
    if (pr.voltage < minProbeV) minProbeV = pr.voltage;
    sumProbeI += pr.current;
    sumProbeISq += pr.current * pr.current;
    if (Math.abs(pr.current) > maxProbeI) maxProbeI = Math.abs(pr.current);
    sumProbeP += pr.voltage * pr.current;
  }

  const vDcAvg = sumVOut / N;
  const vOutRms = Math.sqrt(sumVOutSq / N);
  const iDcAvg = sumILoad / N;
  const iOutRms = Math.sqrt(sumILoadSq / N);
  const vResistorAvg = sumVR / N;
  const vInductorAvg = sumVL / N;
  const vInductorRms = Math.sqrt(sumVLSq / N);
  const pLoadActive = sumPLoad / N;
  const pResistor = iOutRms * iOutRms * R;
  const pBackEmf = iDcAvg * E;

  const formFactor = Math.abs(vDcAvg) > 1e-2 ? vOutRms / Math.abs(vDcAvg) : 1;
  const rippleFactor = formFactor > 1 ? Math.sqrt(formFactor * formFactor - 1) : 0;
  const currentRippleRatio = iDcAvg > 1e-2 ? (maxILoad - minILoad) / iDcAvg : 0;

  let conductionMode: 'CCM' | 'DCM' | 'Cut-Off' = 'DCM';
  if (conductingCount === 0) {
    conductionMode = 'Cut-Off';
  } else if (conductingCount >= N - 2 && minILoad > 1e-2) {
    conductionMode = 'CCM';
  } else {
    conductionMode = 'DCM';
  }

  const conductionAngleDeg = (conductingCount / N) * 360;
  const peakSupplyV = phaseMode === '1phase' ? vPeak : Math.SQRT2 * Math.sqrt(3) * vRms;
  const minFiringAngleDeg =
    E >= peakSupplyV ? 90 : (Math.asin(Math.min(1, E / peakSupplyV)) * 180) / Math.PI;

  const iSupplyRms = Math.sqrt(sumISupplyASq / N);
  const sApparent =
    phaseMode === '1phase' ? vRms * iSupplyRms : 3 * vRms * iSupplyRms;
  const powerFactor = sApparent > 1e-2 ? Math.min(1, Math.max(0, pLoadActive / sApparent)) : 0;

  const metrics: TelemetryMetrics = {
    vDcAvg,
    vOutRms,
    iDcAvg,
    iOutRms,
    vResistorAvg,
    vInductorAvg,
    vInductorRms,
    pLoadActive,
    pResistor,
    pBackEmf,
    formFactor,
    rippleFactor,
    currentRippleRatio,
    conductionMode,
    conductionAngleDeg,
    extinctionAngleDeg: conductionMode === 'CCM' ? 360 : lastExtinctionDeg,
    minFiringAngleDeg,
    pivVolts: Math.max(maxSwitchInverseV, peakSupplyV),
    powerFactor,
    probeVAvg: sumProbeV / N,
    probeVRms: Math.sqrt(sumProbeVSq / N),
    probeVPeakMax: maxProbeV,
    probeVPeakMin: minProbeV,
    probeIAvg: sumProbeI / N,
    probeIRms: Math.sqrt(sumProbeISq / N),
    probeIPeak: maxProbeI,
    probePowerAvg: sumProbeP / N,
  };

  return { points, metrics };
}

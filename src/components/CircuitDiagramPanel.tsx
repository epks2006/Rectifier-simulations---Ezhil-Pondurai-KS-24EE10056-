import React from 'react';
import {
  ProbeComponentId,
  ProbeMetadata,
  SimulationParams,
  WaveformPoint,
} from '../types/simulation';
import { extractProbeSignal } from '../engine/rectifierSolver';

interface CircuitDiagramPanelProps {
  params: SimulationParams;
  activePoint: WaveformPoint;
  selectedProbe: ProbeComponentId;
  probeMeta: ProbeMetadata;
  onSelectProbe: (id: ProbeComponentId) => void;
}

export const CircuitDiagramPanel: React.FC<CircuitDiagramPanelProps> = ({
  params,
  activePoint,
  selectedProbe,
  probeMeta,
  onSelectProbe,
}) => {
  const isSCR = params.topology === 'thyristor';
  const devPrefix = isSCR ? 'T' : 'D';
  const activeSig = extractProbeSignal(activePoint, selectedProbe);

  // Reusable vertical Diode / Thyristor SVG symbol (points UP or DOWN)
  // In standard rectifier bridges, vertical leg switches point UP (Anode at bottom, Cathode at top)
  const renderSwitchSymbol = (
    x: number,
    y: number,
    index: number, // 0..5 for switch_1..switch_6
    probeId: ProbeComponentId,
    subLabel: string
  ) => {
    const isProbed = selectedProbe === probeId;
    const isConducting = activePoint.iSwitch[index] > 1e-2;
    const isGated = activePoint.gSwitch[index] > 0;
    const vAk = activePoint.vSwitch[index];
    const label = `${devPrefix}${index + 1}`;

    const strokeColor = isProbed
      ? '#22D3EE'
      : isConducting
      ? '#FBBF24'
      : '#94A3B8';
    const fillColor = isConducting
      ? '#F59E0B'
      : isProbed
      ? '#0891B2'
      : '#1E293B';

    return (
      <g
        key={probeId}
        transform={`translate(${x}, ${y})`}
        onClick={() => onSelectProbe(probeId)}
        className="cursor-pointer group"
        role="button"
        tabIndex={0}
        aria-label={`Probe ${label} (${subLabel})`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectProbe(probeId);
          }
        }}
      >
        {/* Interactive Hit Box & Probe Highlight Frame */}
        <rect
          x="-32"
          y="-28"
          width="68"
          height="56"
          rx="6"
          fill={isProbed ? '#083344' : isConducting ? '#451A03' : '#0F172A'}
          fillOpacity={isProbed ? '0.75' : isConducting ? '0.45' : '0.6'}
          stroke={isProbed ? '#22D3EE' : isConducting ? '#F59E0B' : '#334155'}
          strokeWidth={isProbed ? '2' : '1'}
          className="transition-colors group-hover:stroke-cyan-400"
        />

        {/* Lead wires */}
        <line x1="0" y1="28" x2="0" y2="12" stroke={strokeColor} strokeWidth="2.2" />
        <line x1="0" y1="-12" x2="0" y2="-28" stroke={strokeColor} strokeWidth="2.2" />

        {/* Diode Triangle pointing UP (Anode at y=+12, Cathode at y=-12) */}
        <polygon
          points="-11,12 11,12 0,-10"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Cathode Bar at y=-10 */}
        <line x1="-12" y1="-10" x2="12" y2="-10" stroke={strokeColor} strokeWidth="2.5" />

        {/* Thyristor Gate Lead if SCR mode */}
        {isSCR && (
          <g>
            <polyline
              points="-5,-6 -16,2 -24,2"
              fill="none"
              stroke={isGated ? '#10B981' : '#64748B'}
              strokeWidth="1.8"
            />
            {isGated && (
              <circle cx="-24" cy="2" r="3" fill="#10B981" />
            )}
          </g>
        )}

        {/* Switch Label & Live Status */}
        <text
          x="15"
          y="-2"
          className={`text-[11px] font-mono font-bold ${
            isProbed ? 'fill-cyan-300' : isConducting ? 'fill-amber-300' : 'fill-slate-200'
          }`}
        >
          {label}
        </text>
        <text
          x="15"
          y="11"
          className="text-[9px] font-mono fill-slate-400"
        >
          {isConducting ? 'ON' : `${Math.round(vAk)}V`}
        </text>

        {/* Probe Pin Indicators when selected */}
        {isProbed && (
          <g>
            <rect x="-30" y="14" width="16" height="11" rx="2" fill="#22D3EE" />
            <text x="-22" y="22" textAnchor="middle" className="text-[8px] font-mono font-bold fill-slate-950">
              V+
            </text>
            <rect x="-30" y="-25" width="16" height="11" rx="2" fill="#0EA5E9" />
            <text x="-22" y="-17" textAnchor="middle" className="text-[8px] font-mono font-bold fill-slate-950">
              V-
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render Load Branch (R, L, E in series on right side of schematic)
  const renderLoadBranch = (loadX: number, topY: number, botY: number) => {
    const loadConducting = activePoint.iLoad > 1e-2;
    const wireStroke = loadConducting ? '#FBBF24' : '#475569';

    const isTotalProbed = selectedProbe === 'load_total';
    const isRProbed = selectedProbe === 'resistor_R';
    const isLProbed = selectedProbe === 'inductor_L';
    const isEProbed = selectedProbe === 'back_emf_E';

    return (
      <g>
        {/* Outer Total Load Probe Frame (clickable) */}
        <rect
          x={loadX - 48}
          y={topY + 8}
          width="112"
          height={botY - topY - 16}
          rx="8"
          fill={isTotalProbed ? '#083344' : '#0B0F17'}
          fillOpacity={isTotalProbed ? '0.45' : '0.35'}
          stroke={isTotalProbed ? '#22D3EE' : '#1E293B'}
          strokeWidth={isTotalProbed ? '2' : '1'}
          strokeDasharray={isTotalProbed ? undefined : '4 3'}
          onClick={() => onSelectProbe('load_total')}
          className="cursor-pointer hover:stroke-cyan-400/70 transition-colors"
        />

        {/* Top-to-Bottom Load Spine */}
        <line x1={loadX} y1={topY} x2={loadX} y2={topY + 34} stroke={wireStroke} strokeWidth="2.4" />
        <line x1={loadX} y1={topY + 94} x2={loadX} y2={topY + 116} stroke={wireStroke} strokeWidth="2.4" />
        <line x1={loadX} y1={topY + 178} x2={loadX} y2={topY + 202} stroke={wireStroke} strokeWidth="2.4" />
        <line x1={loadX} y1={topY + 256} x2={loadX} y2={botY} stroke={wireStroke} strokeWidth="2.4" />

        {/* Current Flow Arrow on Load */}
        {loadConducting && (
          <g transform={`translate(${loadX - 24}, ${topY + 24})`}>
            <line x1="0" y1="-8" x2="0" y2="14" stroke="#FBBF24" strokeWidth="2" />
            <polygon points="-4,10 4,10 0,18" fill="#FBBF24" />
            <text x="-6" y="6" textAnchor="end" className="fill-amber-400 text-[10px] font-mono font-bold">
              i_o
            </text>
          </g>
        )}

        {/* 1. RESISTOR R ELEMENT */}
        <g
          transform={`translate(${loadX}, ${topY + 64})`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectProbe('resistor_R');
          }}
          className="cursor-pointer group"
        >
          <rect
            x="-36"
            y="-28"
            width="88"
            height="56"
            rx="6"
            fill={isRProbed ? '#083344' : '#111827'}
            fillOpacity={isRProbed ? '0.85' : '0.85'}
            stroke={isRProbed ? '#22D3EE' : '#334155'}
            strokeWidth={isRProbed ? '2' : '1'}
            className="group-hover:stroke-cyan-400 transition-colors"
          />
          {/* Zigzag Resistor Symbol */}
          <polyline
            points="0,-28 0,-20 -9,-15 9,-9 -9,-3 9,3 -9,9 9,15 0,20 0,28"
            fill="none"
            stroke={isRProbed ? '#22D3EE' : loadConducting ? '#34D399' : '#94A3B8'}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <text x="16" y="-5" className="fill-slate-100 text-[11px] font-mono font-bold">
            R = {params.resistanceR}Ω
          </text>
          <text x="16" y="10" className="fill-emerald-400 text-[10px] font-mono">
            {activePoint.vResistorR.toFixed(0)}V
          </text>
        </g>

        {/* 2. INDUCTOR L ELEMENT */}
        <g
          transform={`translate(${loadX}, ${topY + 147})`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectProbe('inductor_L');
          }}
          className="cursor-pointer group"
        >
          <rect
            x="-36"
            y="-29"
            width="88"
            height="58"
            rx="6"
            fill={isLProbed ? '#083344' : '#111827'}
            fillOpacity="0.85"
            stroke={isLProbed ? '#22D3EE' : '#334155'}
            strokeWidth={isLProbed ? '2' : '1'}
            className="group-hover:stroke-cyan-400 transition-colors"
          />
          {/* Coil Loops Symbol */}
          <path
            d="M 0,-29 L 0,-22 C 12,-22 12,-11 0,-11 C 12,-11 12,0 0,0 C 12,0 12,11 0,11 C 12,11 12,22 0,22 L 0,29"
            fill="none"
            stroke={
              isLProbed
                ? '#22D3EE'
                : params.inductanceMH === 0
                ? '#475569'
                : '#C084FC'
            }
            strokeWidth="2.2"
          />
          <text x="16" y="-5" className="fill-slate-100 text-[11px] font-mono font-bold">
            L = {params.inductanceMH}mH
          </text>
          <text x="16" y="10" className="fill-purple-300 text-[10px] font-mono">
            {activePoint.vInductorL >= 0 ? '+' : ''}
            {activePoint.vInductorL.toFixed(0)}V
          </text>
        </g>

        {/* 3. BACK-EMF E DC SOURCE ELEMENT */}
        <g
          transform={`translate(${loadX}, ${topY + 229})`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectProbe('back_emf_E');
          }}
          className="cursor-pointer group"
        >
          <rect
            x="-36"
            y="-26"
            width="88"
            height="52"
            rx="6"
            fill={isEProbed ? '#083344' : '#111827'}
            fillOpacity="0.85"
            stroke={isEProbed ? '#22D3EE' : '#334155'}
            strokeWidth={isEProbed ? '2' : '1'}
            className="group-hover:stroke-cyan-400 transition-colors"
          />
          <line x1="0" y1="-26" x2="0" y2="-7" stroke={wireStroke} strokeWidth="2.2" />
          <line x1="0" y1="7" x2="0" y2="26" stroke={wireStroke} strokeWidth="2.2" />
          {/* DC Battery / Counter-EMF Plates */}
          <line
            x1="-14"
            y1="-7"
            x2="14"
            y2="-7"
            stroke={isEProbed ? '#22D3EE' : '#F43F5E'}
            strokeWidth="2.6"
          />
          <line
            x1="-8"
            y1="4"
            x2="8"
            y2="4"
            stroke={isEProbed ? '#22D3EE' : '#F43F5E'}
            strokeWidth="4"
          />
          <text x="-22" y="-8" className="fill-rose-400 text-[10px] font-mono font-bold">
            +
          </text>
          <text x="-22" y="12" className="fill-slate-400 text-[10px] font-mono font-bold">
            -
          </text>
          <text x="18" y="-3" className="fill-slate-100 text-[11px] font-mono font-bold">
            E = {params.backEmfE}V
          </text>
          <text x="18" y="11" className="fill-rose-300 text-[9px] font-mono">
            Back-EMF
          </text>
        </g>

        {/* Total Load V_out Select Button Label */}
        <g
          transform={`translate(${loadX + 8}, ${topY - 12})`}
          onClick={() => onSelectProbe('load_total')}
          className="cursor-pointer"
        >
          <rect
            x="-44"
            y="-12"
            width="98"
            height="19"
            rx="4"
            fill={isTotalProbed ? '#22D3EE' : '#1E293B'}
            stroke="#334155"
          />
          <text
            x="5"
            y="1"
            textAnchor="middle"
            className={`text-[10px] font-mono font-bold ${
              isTotalProbed ? 'fill-slate-950' : 'fill-cyan-300'
            }`}
          >
            V_out (R-L-E)
          </text>
        </g>
      </g>
    );
  };

  // Optional Freewheeling Diode Shunt Leg
  const renderFreewheelingLeg = (fwX: number, topY: number, botY: number) => {
    const isProbed = selectedProbe === 'freewheeling';
    const isConducting = activePoint.iFreewheeling > 1e-2;
    const midY = (topY + botY) / 2;
    const strokeCol = !params.freewheelingDiode
      ? '#334155'
      : isProbed
      ? '#22D3EE'
      : isConducting
      ? '#FBBF24'
      : '#64748B';

    return (
      <g opacity={params.freewheelingDiode ? 1 : 0.4}>
        <line
          x1={fwX}
          y1={topY}
          x2={fwX}
          y2={midY - 26}
          stroke={strokeCol}
          strokeWidth="1.8"
          strokeDasharray={params.freewheelingDiode ? undefined : '3 3'}
        />
        <line
          x1={fwX}
          y1={midY + 26}
          x2={fwX}
          y2={botY}
          stroke={strokeCol}
          strokeWidth="1.8"
          strokeDasharray={params.freewheelingDiode ? undefined : '3 3'}
        />
        <g
          transform={`translate(${fwX}, ${midY})`}
          onClick={() => onSelectProbe('freewheeling')}
          className="cursor-pointer group"
        >
          <rect
            x="-26"
            y="-26"
            width="56"
            height="52"
            rx="6"
            fill={isProbed ? '#083344' : '#0F172A'}
            stroke={isProbed ? '#22D3EE' : '#334155'}
            strokeWidth={isProbed ? '2' : '1'}
            className="group-hover:stroke-cyan-400"
          />
          <polygon
            points="-9,10 9,10 0,-10"
            fill={isConducting ? '#F59E0B' : '#1E293B'}
            stroke={strokeCol}
            strokeWidth="2"
          />
          <line x1="-10" y1="-10" x2="10" y2="-10" stroke={strokeCol} strokeWidth="2.4" />
          <text x="12" y="2" className="fill-slate-300 text-[10px] font-mono font-semibold">
            D_fw
          </text>
          <text x="12" y="13" className="fill-slate-400 text-[8px] font-mono">
            {params.freewheelingDiode ? (isConducting ? 'ON' : 'OFF') : 'Open'}
          </text>
        </g>
      </g>
    );
  };

  return (
    <section
      aria-label="Interactive Power Electronics Circuit Diagram"
      className="flex flex-col bg-[#111827] border border-slate-800 rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-[#0D131F] flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Interactive Circuit Schematic</span>
            <span aria-hidden="true">·</span>
            <span>Click any component to move oscilloscope probe</span>
          </div>
          <h2 className="text-base font-semibold text-slate-100 mt-0.5">
            {params.phaseMode === '1phase'
              ? `1-Phase ${isSCR ? 'Thyristor Controlled (SCR)' : 'Diode'} Full-Bridge`
              : `3-Phase 6-Pulse ${isSCR ? 'Thyristor Controlled (SCR)' : 'Diode'} Bridge`}
          </h2>
        </div>

        {/* Active Probe Badge */}
        <div className="flex items-center gap-2 text-xs font-mono bg-[#0B0F17] px-3 py-1.5 rounded border border-cyan-500/40">
          <span className="text-cyan-400 font-semibold">PROBE: {probeMeta.symbol}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-200 tabular-nums">
            {activeSig.voltage >= 0 ? '+' : ''}
            {activeSig.voltage.toFixed(1)}V / {activeSig.current.toFixed(2)}A
          </span>
        </div>
      </div>

      {/* SVG Circuit Canvas */}
      <div className="bg-[#080C14] p-2 select-none">
        {params.phaseMode === '1phase' ? (
          /* ===================== SINGLE-PHASE BRIDGE SCHEMATIC ===================== */
          <svg viewBox="0 0 600 350" className="w-full h-auto block">
            {(() => {
              const topBusY = 38;
              const botBusY = 312;
              const midA = 138;
              const midB = 228;
              const leg1X = 165;
              const leg2X = 275;
              const fwX = 375;
              const loadX = 485;

              const pair12On = activePoint.iSwitch[0] > 1e-2;
              const pair34On = activePoint.iSwitch[2] > 1e-2;
              const loadOn = activePoint.iLoad > 1e-2;
              const isSourceProbed = selectedProbe === 'ac_source';

              return (
                <g>
                  {/* DC Positive & Negative Rails */}
                  <line
                    x1={leg1X}
                    y1={topBusY}
                    x2={loadX}
                    y2={topBusY}
                    stroke={loadOn ? '#FBBF24' : '#475569'}
                    strokeWidth="2.5"
                  />
                  <line
                    x1={leg1X}
                    y1={botBusY}
                    x2={loadX}
                    y2={botBusY}
                    stroke={loadOn ? '#FBBF24' : '#475569'}
                    strokeWidth="2.5"
                  />

                  {/* Bridge Leg 1 (Left: T1 top, T4 bottom) */}
                  <line x1={leg1X} y1={topBusY} x2={leg1X} y2={68} stroke={pair12On ? '#FBBF24' : '#475569'} strokeWidth="2.2" />
                  <line x1={leg1X} y1={124} x2={leg1X} y2={226} stroke={pair12On || pair34On ? '#FBBF24' : '#475569'} strokeWidth="2.2" />
                  <line x1={leg1X} y1={282} x2={leg1X} y2={botBusY} stroke={pair34On ? '#FBBF24' : '#475569'} strokeWidth="2.2" />

                  {/* Bridge Leg 2 (Right: T3 top, T2 bottom) */}
                  <line x1={leg2X} y1={topBusY} x2={leg2X} y2={68} stroke={pair34On ? '#FBBF24' : '#475569'} strokeWidth="2.2" />
                  <line x1={leg2X} y1={124} x2={leg2X} y2={226} stroke={pair12On || pair34On ? '#FBBF24' : '#475569'} strokeWidth="2.2" />
                  <line x1={leg2X} y1={282} x2={leg2X} y2={botBusY} stroke={pair12On ? '#FBBF24' : '#475569'} strokeWidth="2.2" />

                  {/* AC Source Feed Lines */}
                  <polyline
                    points={`68,${midA} 68,145 ${leg1X},145`}
                    fill="none"
                    stroke={pair12On || pair34On ? '#818CF8' : '#475569'}
                    strokeWidth="2.2"
                  />
                  <polyline
                    points={`68,${midB} 68,205 ${leg2X},205`}
                    fill="none"
                    stroke={pair12On || pair34On ? '#818CF8' : '#475569'}
                    strokeWidth="2.2"
                  />
                  <circle cx={leg1X} cy={145} r="4" fill="#E2E8F0" />
                  <circle cx={leg2X} cy={205} r="4" fill="#E2E8F0" />

                  {/* Clickable AC Source Component */}
                  <g
                    transform="translate(68, 175)"
                    onClick={() => onSelectProbe('ac_source')}
                    className="cursor-pointer group"
                  >
                    <rect
                      x="-46"
                      y="-45"
                      width="92"
                      height="90"
                      rx="8"
                      fill={isSourceProbed ? '#083344' : '#0F172A'}
                      stroke={isSourceProbed ? '#22D3EE' : '#334155'}
                      strokeWidth={isSourceProbed ? '2' : '1'}
                      className="group-hover:stroke-cyan-400"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="24"
                      fill="#1E293B"
                      stroke={isSourceProbed ? '#22D3EE' : '#818CF8'}
                      strokeWidth="2.2"
                    />
                    {/* Sine Wave Glyph */}
                    <path
                      d="M -12,0 Q -6,-12 0,0 T 12,0"
                      fill="none"
                      stroke="#A5B4FC"
                      strokeWidth="2.2"
                    />
                    <text x="0" y="-29" textAnchor="middle" className="fill-indigo-300 text-[10px] font-mono font-bold">
                      v_s ({params.vRms}V)
                    </text>
                    <text x="0" y="38" textAnchor="middle" className="fill-slate-300 text-[10px] font-mono">
                      {activePoint.vSupplyA >= 0 ? '+' : ''}
                      {activePoint.vSupplyA.toFixed(0)}V
                    </text>
                  </g>

                  {/* 4 Bridge Switches:
                      T1: Leg 1 Top (Anode at AC+, Cathode at DC+) -> switch_1
                      T4: Leg 1 Bottom (Anode at DC-, Cathode at AC+) -> switch_4
                      T3: Leg 2 Top (Anode at AC-, Cathode at DC+) -> switch_3
                      T2: Leg 2 Bottom (Anode at DC-, Cathode at AC-) -> switch_2
                  */}
                  {renderSwitchSymbol(leg1X, 96, 0, 'switch_1', 'Leg A Upper')}
                  {renderSwitchSymbol(leg1X, 254, 3, 'switch_4', 'Leg A Lower')}
                  {renderSwitchSymbol(leg2X, 96, 2, 'switch_3', 'Leg B Upper')}
                  {renderSwitchSymbol(leg2X, 254, 1, 'switch_2', 'Leg B Lower')}

                  {/* Optional Freewheeling Diode */}
                  {renderFreewheelingLeg(fwX, topBusY, botBusY)}

                  {/* R-L-E Load Branch on Right */}
                  {renderLoadBranch(loadX, topBusY, botBusY)}
                </g>
              );
            })()}
          </svg>
        ) : (
          /* ===================== THREE-PHASE 6-PULSE BRIDGE SCHEMATIC ===================== */
          <svg viewBox="0 0 640 360" className="w-full h-auto block">
            {(() => {
              const topBusY = 38;
              const botBusY = 318;
              const legAX = 155;
              const legBX = 240;
              const legCX = 325;
              const fwX = 410;
              const loadX = 515;

              const nodeAY = 152;
              const nodeBY = 178;
              const nodeCY = 204;
              const isSourceProbed = selectedProbe === 'ac_source';
              const loadOn = activePoint.iLoad > 1e-2;

              return (
                <g>
                  {/* Positive & Negative DC Rails */}
                  <line
                    x1={legAX}
                    y1={topBusY}
                    x2={loadX}
                    y2={topBusY}
                    stroke={loadOn ? '#FBBF24' : '#475569'}
                    strokeWidth="2.5"
                  />
                  <line
                    x1={legAX}
                    y1={botBusY}
                    x2={loadX}
                    y2={botBusY}
                    stroke={loadOn ? '#FBBF24' : '#475569'}
                    strokeWidth="2.5"
                  />

                  {/* 3 Bridge Vertical Legs (Leg A, Leg B, Leg C) */}
                  {[legAX, legBX, legCX].map((lx, idx) => (
                    <g key={`leg-${idx}`}>
                      <line x1={lx} y1={topBusY} x2={lx} y2={68} stroke="#475569" strokeWidth="2" />
                      <line x1={lx} y1={124} x2={lx} y2={232} stroke="#475569" strokeWidth="2" />
                      <line x1={lx} y1={288} x2={lx} y2={botBusY} stroke="#475569" strokeWidth="2" />
                    </g>
                  ))}

                  {/* 3-Phase AC Supply Lines to Leg Midpoints */}
                  <line x1="95" y1={nodeAY} x2={legAX} y2={nodeAY} stroke="#6366F1" strokeWidth="2" />
                  <circle cx={legAX} cy={nodeAY} r="3.5" fill="#E2E8F0" />

                  <line x1="95" y1={nodeBY} x2={legBX} y2={nodeBY} stroke="#818CF8" strokeWidth="2" />
                  <circle cx={legBX} cy={nodeBY} r="3.5" fill="#E2E8F0" />

                  <line x1="95" y1={nodeCY} x2={legCX} y2={nodeCY} stroke="#A5B4FC" strokeWidth="2" />
                  <circle cx={legCX} cy={nodeCY} r="3.5" fill="#E2E8F0" />

                  {/* Clickable 3-Phase AC Source Block */}
                  <g
                    transform="translate(54, 178)"
                    onClick={() => onSelectProbe('ac_source')}
                    className="cursor-pointer group"
                  >
                    <rect
                      x="-44"
                      y="-58"
                      width="88"
                      height="116"
                      rx="8"
                      fill={isSourceProbed ? '#083344' : '#0F172A'}
                      stroke={isSourceProbed ? '#22D3EE' : '#334155'}
                      strokeWidth={isSourceProbed ? '2' : '1'}
                      className="group-hover:stroke-cyan-400"
                    />
                    <text x="0" y="-40" textAnchor="middle" className="fill-indigo-300 text-[10px] font-mono font-bold">
                      3Φ SUPPLY
                    </text>
                    {['A', 'B', 'C'].map((ph, i) => {
                      const py = -26 + i * 26;
                      return (
                        <g key={ph} transform={`translate(0, ${py})`}>
                          <circle cx="-8" cy="0" r="10" fill="#1E293B" stroke="#818CF8" strokeWidth="1.6" />
                          <path d="M -13,0 Q -10,-5 -8,0 T -3,0" fill="none" stroke="#C7D2FE" strokeWidth="1.4" />
                          <text x="12" y="4" className="fill-slate-200 text-[10px] font-mono font-bold">
                            {ph}
                          </text>
                        </g>
                      );
                    })}
                    <text x="0" y="48" textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
                      {Math.round(params.vRms * Math.sqrt(3))}V_LL
                    </text>
                  </g>

                  {/* 6 Bridge Switches in Standard Industrial Numbering:
                      Upper Group (Common Cathode): T1 (Leg A), T3 (Leg B), T5 (Leg C)
                      Lower Group (Common Anode):   T4 (Leg A), T6 (Leg B), T2 (Leg C)
                  */}
                  {renderSwitchSymbol(legAX, 96, 0, 'switch_1', 'Upper A')}
                  {renderSwitchSymbol(legBX, 96, 2, 'switch_3', 'Upper B')}
                  {renderSwitchSymbol(legCX, 96, 4, 'switch_5', 'Upper C')}

                  {renderSwitchSymbol(legAX, 260, 3, 'switch_4', 'Lower A')}
                  {renderSwitchSymbol(legBX, 260, 5, 'switch_6', 'Lower B')}
                  {renderSwitchSymbol(legCX, 260, 1, 'switch_2', 'Lower C')}

                  {/* Optional Freewheeling Diode */}
                  {renderFreewheelingLeg(fwX, topBusY, botBusY)}

                  {/* R-L-E Load Branch */}
                  {renderLoadBranch(loadX, topBusY, botBusY)}
                </g>
              );
            })()}
          </svg>
        )}
      </div>

      {/* Schematic Legend & Live Conduction Summary */}
      <div className="px-4 py-2.5 bg-[#0D131F] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-xs bg-cyan-400 inline-block" />
            <span>Selected Probe ({probeMeta.symbol})</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
            <span>Conducting Path ({activePoint.activeDevices})</span>
          </span>
          {isSCR && (
            <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 inline-block" />
              <span>Gate Pulse (α = {params.alphaDeg}°)</span>
            </span>
          )}
        </div>
        <div className="font-mono text-slate-400 tabular-nums">
          KVL @ {activePoint.thetaDeg.toFixed(0)}°: {activePoint.vLoadTotal.toFixed(0)}V ={' '}
          {activePoint.vResistorR.toFixed(0)}V(R) + {activePoint.vInductorL.toFixed(0)}V(L) +{' '}
          {activePoint.vBackEmfE.toFixed(0)}V(E)
        </div>
      </div>
    </section>
  );
};

import React, { useMemo, useRef, useState } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Crosshair,
  Layers,
  Eye,
} from 'lucide-react';
import {
  ProbeComponentId,
  ProbeMetadata,
  SimulationParams,
  TelemetryMetrics,
  WaveformPoint,
} from '../types/simulation';
import { extractProbeSignal } from '../engine/rectifierSolver';

interface OscilloscopePanelProps {
  params: SimulationParams;
  points: WaveformPoint[];
  metrics: TelemetryMetrics;
  selectedProbe: ProbeComponentId;
  probeMeta: ProbeMetadata;
  probeList: ProbeMetadata[];
  onSelectProbe: (id: ProbeComponentId) => void;
  liveAngleDeg: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepAngle: (deltaDeg: number) => void;
  onSetAngle: (deg: number) => void;
  sweepSpeed: number;
  onChangeSweepSpeed: (speed: number) => void;
}

export const OscilloscopePanel: React.FC<OscilloscopePanelProps> = ({
  params,
  points,
  metrics,
  selectedProbe,
  probeMeta,
  probeList,
  onSelectProbe,
  liveAngleDeg,
  isPlaying,
  onTogglePlay,
  onStepAngle,
  onSetAngle,
  sweepSpeed,
  onChangeSweepSpeed,
}) => {
  const [showSupplyEnvelope, setShowSupplyEnvelope] = useState<boolean>(true);
  const [showKvlOverlay, setShowKvlOverlay] = useState<boolean>(false);
  const [cycleWindow, setCycleWindow] = useState<360 | 720>(720);
  const [hoverAngleDeg, setHoverAngleDeg] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Active inspection angle: user hover overrides live sweep angle
  const inspectedAngle = hoverAngleDeg !== null ? hoverAngleDeg : liveAngleDeg;
  const inspectedIndex = Math.min(
    points.length - 1,
    Math.max(0, Math.round((inspectedAngle % cycleWindow) + (cycleWindow === 360 ? 0 : 0)))
  );
  const activePoint = points[inspectedIndex] || points[0];
  const activeProbeSignal = useMemo(
    () => extractProbeSignal(activePoint, selectedProbe),
    [activePoint, selectedProbe]
  );

  // Filter points to visible window (360° = 1 cycle, 720° = 2 cycles)
  const visiblePoints = useMemo(
    () => points.filter((p) => p.thetaDeg <= cycleWindow),
    [points, cycleWindow]
  );

  // Compute Voltage Y-axis scale
  const vMaxBound = useMemo(() => {
    const vSupplyPeak =
      params.phaseMode === '1phase'
        ? Math.SQRT2 * params.vRms
        : Math.SQRT2 * Math.sqrt(3) * params.vRms;
    let maxAbs = Math.max(vSupplyPeak * 1.15, params.backEmfE * 1.2, 50);
    for (const pt of visiblePoints) {
      const sig = extractProbeSignal(pt, selectedProbe);
      if (Math.abs(sig.voltage) * 1.12 > maxAbs) {
        maxAbs = Math.abs(sig.voltage) * 1.12;
      }
    }
    return Math.ceil(maxAbs / 25) * 25;
  }, [visiblePoints, selectedProbe, params.phaseMode, params.vRms, params.backEmfE]);

  // Compute Current Y-axis scale
  const iMaxBound = useMemo(() => {
    let maxI = 2;
    for (const pt of visiblePoints) {
      const sig = extractProbeSignal(pt, selectedProbe);
      if (Math.abs(sig.current) * 1.2 > maxI) maxI = Math.abs(sig.current) * 1.2;
      if (Math.abs(pt.iLoad) * 1.2 > maxI) maxI = Math.abs(pt.iLoad) * 1.2;
    }
    return Math.ceil(maxI * 2) / 2;
  }, [visiblePoints, selectedProbe]);

  // SVG Coordinate Geometry
  const W = 860;
  const H = 510;
  const PAD_L = 58;
  const PAD_R = 20;
  const PLOT_W = W - PAD_L - PAD_R;

  // Sub-chart 1: Voltage Channel (Top, largest)
  const V_TOP = 18;
  const V_H = 248;
  const V_MID = V_TOP + V_H / 2;

  // Sub-chart 2: Current Channel (Middle)
  const I_TOP = 294;
  const I_H = 132;
  const I_MID = selectedProbe === 'ac_source' ? I_TOP + I_H / 2 : I_TOP + I_H - 18;

  // Sub-chart 3: Gate Trigger Pulses & Conduction Bar (Bottom)
  const G_TOP = 446;
  const G_H = 42;

  const degToX = (deg: number) => PAD_L + (deg / cycleWindow) * PLOT_W;
  const vToY = (v: number) => V_MID - (v / vMaxBound) * (V_H / 2 - 10);
  const iToY = (i: number) => {
    if (selectedProbe === 'ac_source') {
      return I_MID - (i / iMaxBound) * (I_H / 2 - 10);
    }
    return I_MID - (i / iMaxBound) * (I_H - 28);
  };

  // Build SVG path strings
  const paths = useMemo(() => {
    if (visiblePoints.length === 0) {
      return {
        probeVPath: '',
        probeVArea: '',
        probeIPath: '',
        loadIPath: '',
        supplyPosPath: '',
        supplyNegPath: '',
        supplyBPath: '',
        supplyCPath: '',
        vRPath: '',
        vLPath: '',
        vEPath: '',
        gatePath: '',
      };
    }

    const pV: string[] = [];
    const pVArea: string[] = [`M ${degToX(0).toFixed(1)} ${V_MID.toFixed(1)}`];
    const pI: string[] = [];
    const pLoadI: string[] = [];
    const sPos: string[] = [];
    const sNeg: string[] = [];
    const sB: string[] = [];
    const sC: string[] = [];
    const pVR: string[] = [];
    const pVL: string[] = [];
    const pVE: string[] = [];
    const pGate: string[] = [];

    for (let idx = 0; idx < visiblePoints.length; idx++) {
      const pt = visiblePoints[idx];
      const x = degToX(pt.thetaDeg).toFixed(1);
      const cmd = idx === 0 ? 'M' : 'L';

      const sig = extractProbeSignal(pt, selectedProbe);
      const yV = vToY(sig.voltage).toFixed(1);
      const yI = iToY(sig.current).toFixed(1);
      const yLoadI = iToY(pt.iLoad).toFixed(1);

      pV.push(`${cmd} ${x} ${yV}`);
      pVArea.push(`L ${x} ${yV}`);
      pI.push(`${cmd} ${x} ${yI}`);
      pLoadI.push(`${cmd} ${x} ${yLoadI}`);

      if (params.phaseMode === '1phase') {
        sPos.push(`${cmd} ${x} ${vToY(pt.vSupplyA).toFixed(1)}`);
        sNeg.push(`${cmd} ${x} ${vToY(-pt.vSupplyA).toFixed(1)}`);
      } else {
        sPos.push(`${cmd} ${x} ${vToY(pt.vLineAB).toFixed(1)}`);
        sB.push(`${cmd} ${x} ${vToY(pt.vLineBC).toFixed(1)}`);
        sC.push(`${cmd} ${x} ${vToY(pt.vLineCA).toFixed(1)}`);
        sNeg.push(`${cmd} ${x} ${vToY(-pt.vLineAB).toFixed(1)}`);
      }

      if (showKvlOverlay) {
        pVR.push(`${cmd} ${x} ${vToY(pt.vResistorR).toFixed(1)}`);
        pVL.push(`${cmd} ${x} ${vToY(pt.vInductorL).toFixed(1)}`);
        pVE.push(`${cmd} ${x} ${vToY(pt.vBackEmfE).toFixed(1)}`);
      }

      // Gate pulse composite or specific switch gate pulse
      let gVal = 0;
      if (selectedProbe.startsWith('switch_')) {
        const swNum = parseInt(selectedProbe.replace('switch_', ''), 10) - 1;
        gVal = pt.gSwitch[swNum] || 0;
      } else {
        gVal = Math.max(...pt.gSwitch);
      }
      const yG = (G_TOP + G_H - 6 - gVal * (G_H - 14)).toFixed(1);
      pGate.push(`${cmd} ${x} ${yG}`);
    }

    const lastX = degToX(visiblePoints[visiblePoints.length - 1].thetaDeg).toFixed(1);
    pVArea.push(`L ${lastX} ${V_MID.toFixed(1)} Z`);

    return {
      probeVPath: pV.join(' '),
      probeVArea: pVArea.join(' '),
      probeIPath: pI.join(' '),
      loadIPath: pLoadI.join(' '),
      supplyPosPath: sPos.join(' '),
      supplyNegPath: sNeg.join(' '),
      supplyBPath: sB.join(' '),
      supplyCPath: sC.join(' '),
      vRPath: pVR.join(' '),
      vLPath: pVL.join(' '),
      vEPath: pVE.join(' '),
      gatePath: pGate.join(' '),
    };
  }, [visiblePoints, selectedProbe, params.phaseMode, showKvlOverlay, vMaxBound, iMaxBound, cycleWindow]);

  const handleSvgPointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const clampedX = Math.max(PAD_L, Math.min(W - PAD_R, relX));
    const deg = ((clampedX - PAD_L) / PLOT_W) * cycleWindow;
    setHoverAngleDeg(Math.round(deg));
    if (!isPlaying) {
      onSetAngle(Math.round(deg));
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const clampedX = Math.max(PAD_L, Math.min(W - PAD_R, relX));
    const deg = Math.round(((clampedX - PAD_L) / PLOT_W) * cycleWindow);
    onSetAngle(deg);
  };

  const angleGridSteps = cycleWindow === 720 ? [0, 90, 180, 270, 360, 450, 540, 630, 720] : [0, 45, 90, 135, 180, 225, 270, 315, 360];
  const cursorX = degToX(inspectedAngle % cycleWindow);
  const cursorVY = vToY(activeProbeSignal.voltage);
  const cursorIY = iToY(activeProbeSignal.current);

  return (
    <section
      aria-label="Real-Time Oscilloscope Waveform Analyzer"
      className="flex flex-col bg-[#111827] border border-slate-800 rounded-lg overflow-hidden"
    >
      {/* Top Oscilloscope Header & Component Probe Selector */}
      <div className="px-4 py-3 border-b border-slate-800 bg-[#0D131F] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Digital Storage Oscilloscope</span>
            <span aria-hidden="true">·</span>
            <span>{params.phaseMode === '1phase' ? 'Single-Phase Full Bridge' : 'Three-Phase 6-Pulse Bridge'}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                metrics.conductionMode === 'CCM'
                  ? 'text-emerald-400 font-medium'
                  : metrics.conductionMode === 'DCM'
                  ? 'text-amber-400 font-medium'
                  : 'text-rose-400 font-medium'
              }
            >
              {metrics.conductionMode === 'CCM'
                ? '● Continuous Conduction (CCM)'
                : metrics.conductionMode === 'DCM'
                ? '▲ Discontinuous Conduction (DCM)'
                : '✖ Cut-Off (Source < Back-EMF E)'}
            </span>
          </div>
          <h2 className="text-base font-semibold text-slate-100 mt-0.5 flex items-center gap-2">
            <span>Probing: {probeMeta.fullName}</span>
            <span className="text-xs font-mono text-cyan-400 font-normal">
              ({probeMeta.voltageSymbol}, {probeMeta.currentSymbol})
            </span>
          </h2>
        </div>

        {/* Time-Base & Playback Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0B0F17] p-0.5 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => setCycleWindow(360)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                cycleWindow === 360
                  ? 'bg-slate-800 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 Cycle (360°)
            </button>
            <button
              type="button"
              onClick={() => setCycleWindow(720)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                cycleWindow === 720
                  ? 'bg-slate-800 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2 Cycles (720°)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#0B0F17] p-0.5 rounded border border-slate-800">
            <button
              type="button"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause Live Sweep' : 'Start Live Sweep'}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                isPlaying
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Live Sweep' : 'Paused'}</span>
            </button>
            <button
              type="button"
              onClick={() => onStepAngle(15)}
              title="Step forward 15°"
              className="px-2 py-1 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>+15°</span>
            </button>
            <button
              type="button"
              onClick={() => onSetAngle(0)}
              title="Reset phase cursor to 0°"
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Component Probe Quick-Selector Bar */}
      <div className="px-4 py-2 bg-[#0B0F17]/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-mono text-slate-400 mr-1.5 whitespace-nowrap">
            Probe Target:
          </span>
          {probeList.map((item) => {
            const active = item.id === selectedProbe;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectProbe(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Trace Overlay Toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSupplyEnvelope((v) => !v)}
            className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              showSupplyEnvelope
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>AC Envelope</span>
          </button>
          <button
            type="button"
            onClick={() => setShowKvlOverlay((v) => !v)}
            className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              showKvlOverlay
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>KVL Overlay (v_R, v_L, E)</span>
          </button>
        </div>
      </div>

      {/* Main SVG Multi-Channel Oscilloscope Canvas */}
      <div className="relative bg-[#070B12] select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block cursor-crosshair"
          onMouseMove={handleSvgPointerMove}
          onMouseLeave={() => setHoverAngleDeg(null)}
          onClick={handleSvgClick}
        >
          <defs>
            <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.18" />
            </linearGradient>
            <clipPath id="voltagePlotClip">
              <rect x={PAD_L} y={V_TOP} width={PLOT_W} height={V_H} />
            </clipPath>
            <clipPath id="currentPlotClip">
              <rect x={PAD_L} y={I_TOP} width={PLOT_W} height={I_H} />
            </clipPath>
          </defs>

          {/* ================= CHANNEL 1: VOLTAGE STAGE ================= */}
          <rect
            x={PAD_L}
            y={V_TOP}
            width={PLOT_W}
            height={V_H}
            fill="#090D16"
            stroke="#1E293B"
            strokeWidth="1"
          />

          {/* Horizontal Voltage Grid Lines */}
          {[-1, -0.5, 0, 0.5, 1].map((frac) => {
            const val = frac * vMaxBound;
            const y = vToY(val);
            return (
              <g key={`vgrid-${frac}`}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={W - PAD_R}
                  y2={y}
                  stroke={frac === 0 ? '#334155' : '#1E293B'}
                  strokeDasharray={frac === 0 ? undefined : '3 3'}
                  strokeWidth={frac === 0 ? '1.2' : '1'}
                />
                <text
                  x={PAD_L - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {val > 0 ? `+${Math.round(val)}` : Math.round(val)}V
                </text>
              </g>
            );
          })}

          {/* Vertical Angle Grid Lines across all 3 channels */}
          {angleGridSteps.map((deg) => {
            const x = degToX(deg);
            return (
              <g key={`xgrid-${deg}`}>
                <line
                  x1={x}
                  y1={V_TOP}
                  x2={x}
                  y2={V_TOP + V_H}
                  stroke={deg % 360 === 0 ? '#334155' : '#162032'}
                  strokeWidth="1"
                />
                <line
                  x1={x}
                  y1={I_TOP}
                  x2={x}
                  y2={I_TOP + I_H}
                  stroke={deg % 360 === 0 ? '#334155' : '#162032'}
                  strokeWidth="1"
                />
                <line
                  x1={x}
                  y1={G_TOP}
                  x2={x}
                  y2={G_TOP + G_H}
                  stroke={deg % 360 === 0 ? '#334155' : '#162032'}
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={V_TOP + V_H + 14}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {deg}°
                </text>
              </g>
            );
          })}

          {/* Clipped Voltage Waveforms */}
          <g clipPath="url(#voltagePlotClip)">
            {/* Optional AC Supply Envelope Reference */}
            {showSupplyEnvelope && (
              <>
                <path
                  d={paths.supplyPosPath}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="1.25"
                  strokeDasharray="4 4"
                  opacity="0.65"
                />
                <path
                  d={paths.supplyNegPath}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="1.1"
                  strokeDasharray="2 4"
                  opacity="0.4"
                />
                {params.phaseMode === '3phase' && (
                  <>
                    <path
                      d={paths.supplyBPath}
                      fill="none"
                      stroke="#818CF8"
                      strokeWidth="1.15"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                    <path
                      d={paths.supplyCPath}
                      fill="none"
                      stroke="#A5B4FC"
                      strokeWidth="1.15"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  </>
                )}
              </>
            )}

            {/* Back-EMF E Reference Line when E > 0 */}
            {params.backEmfE > 0 && (
              <g>
                <line
                  x1={PAD_L}
                  y1={vToY(params.backEmfE)}
                  x2={W - PAD_R}
                  y2={vToY(params.backEmfE)}
                  stroke="#F43F5E"
                  strokeWidth="1.2"
                  strokeDasharray="6 3"
                  opacity="0.8"
                />
                <text
                  x={W - PAD_R - 6}
                  y={vToY(params.backEmfE) - 5}
                  textAnchor="end"
                  className="fill-rose-400 text-[10px] font-mono"
                >
                  E = {params.backEmfE}V
                </text>
              </g>
            )}

            {/* Optional KVL Component Overlay (v_R, v_L, E) */}
            {showKvlOverlay && (
              <>
                <path
                  d={paths.vRPath}
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="1.5"
                  opacity="0.85"
                />
                <path
                  d={paths.vLPath}
                  fill="none"
                  stroke="#C084FC"
                  strokeWidth="1.5"
                  opacity="0.85"
                />
              </>
            )}

            {/* Primary Selected Component Voltage Area & Trace */}
            <path d={paths.probeVArea} fill="url(#cyanAreaGrad)" />
            <path
              d={paths.probeVPath}
              fill="none"
              stroke="#22D3EE"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          </g>

          {/* Channel 1 Title Label */}
          <g transform={`translate(${PAD_L + 10}, ${V_TOP + 16})`}>
            <rect
              x="0"
              y="-12"
              width="290"
              height="18"
              rx="3"
              fill="#0B0F17"
              fillOpacity="0.85"
            />
            <text className="fill-cyan-400 text-[11px] font-mono font-semibold">
              CH1 VOLTAGE: {probeMeta.voltageSymbol} — {probeMeta.shortLabel}
            </text>
          </g>

          {/* ================= CHANNEL 2: CURRENT STAGE ================= */}
          <rect
            x={PAD_L}
            y={I_TOP}
            width={PLOT_W}
            height={I_H}
            fill="#090D16"
            stroke="#1E293B"
            strokeWidth="1"
          />

          {/* Current Zero & Reference Grid Lines */}
          <line
            x1={PAD_L}
            y1={iToY(0)}
            x2={W - PAD_R}
            y2={iToY(0)}
            stroke="#334155"
            strokeWidth="1.2"
          />
          <text
            x={PAD_L - 8}
            y={iToY(0) + 4}
            textAnchor="end"
            className="fill-slate-400 text-[10px] font-mono"
          >
            0.0A
          </text>
          <line
            x1={PAD_L}
            y1={iToY(iMaxBound * 0.75)}
            x2={W - PAD_R}
            y2={iToY(iMaxBound * 0.75)}
            stroke="#1E293B"
            strokeDasharray="3 3"
          />
          <text
            x={PAD_L - 8}
            y={iToY(iMaxBound * 0.75) + 4}
            textAnchor="end"
            className="fill-amber-400/80 text-[10px] font-mono"
          >
            +{(iMaxBound * 0.75).toFixed(1)}A
          </text>

          <g clipPath="url(#currentPlotClip)">
            {/* Total load current reference if probing a switch */}
            {selectedProbe !== 'load_total' && (
              <path
                d={paths.loadIPath}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.4"
              />
            )}
            {/* Selected Component Current Trace */}
            <path
              d={paths.probeIPath}
              fill="none"
              stroke="#FBBF24"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </g>

          <g transform={`translate(${PAD_L + 10}, ${I_TOP + 16})`}>
            <rect
              x="0"
              y="-12"
              width="275"
              height="18"
              rx="3"
              fill="#0B0F17"
              fillOpacity="0.85"
            />
            <text className="fill-amber-400 text-[11px] font-mono font-semibold">
              CH2 CURRENT: {probeMeta.currentSymbol} (Peak {metrics.probeIPeak.toFixed(2)} A)
            </text>
          </g>

          {/* ================= CHANNEL 3: GATE TRIGGER PULSES ================= */}
          <rect
            x={PAD_L}
            y={G_TOP}
            width={PLOT_W}
            height={G_H}
            fill="#090D16"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <path
            d={paths.gatePath}
            fill="none"
            stroke={params.topology === 'thyristor' ? '#10B981' : '#475569'}
            strokeWidth="1.8"
          />
          <text
            x={PAD_L - 8}
            y={G_TOP + G_H / 2 + 4}
            textAnchor="end"
            className="fill-emerald-400 text-[10px] font-mono"
          >
            GATE
          </text>
          <text
            x={PAD_L + 10}
            y={G_TOP + 14}
            className="fill-emerald-400/90 text-[10px] font-mono"
          >
            {params.topology === 'thyristor'
              ? `CH3 SCR GATE PULSES (Firing Delay α = ${params.alphaDeg}°)`
              : 'CH3 UNCONTROLLED DIODE BRIDGE (Natural Commutation α = 0°)'}
          </text>

          {/* ================= SYNCHRONIZED CROSSHAIR & CURSOR ================= */}
          <line
            x1={cursorX}
            y1={V_TOP}
            x2={cursorX}
            y2={G_TOP + G_H}
            stroke="#F8FAFC"
            strokeWidth="1.2"
            strokeDasharray="4 2"
            opacity="0.85"
          />
          <circle
            cx={cursorX}
            cy={Math.max(V_TOP + 4, Math.min(V_TOP + V_H - 4, cursorVY))}
            r="4.5"
            fill="#22D3EE"
            stroke="#0B0F17"
            strokeWidth="2"
          />
          <circle
            cx={cursorX}
            cy={Math.max(I_TOP + 4, Math.min(I_TOP + I_H - 4, cursorIY))}
            r="4.5"
            fill="#FBBF24"
            stroke="#0B0F17"
            strokeWidth="2"
          />

          {/* Bottom Axis Caption */}
          <text
            x={PAD_L + PLOT_W / 2}
            y={H - 4}
            textAnchor="middle"
            className="fill-slate-400 text-[11px] font-mono"
          >
            Electrical Angle ωt (Degrees) — Frequency f = {params.frequency} Hz (Period T ={' '}
            {(1000 / params.frequency).toFixed(2)} ms)
          </text>
        </svg>

        {/* Live Cursor Instantaneous Telemetry Bar */}
        <div className="px-4 py-2 bg-[#0D131F] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span>ωt = {activePoint.thetaDeg.toFixed(0)}°</span>
              <span className="text-slate-500">({activePoint.timeMs.toFixed(2)} ms)</span>
            </span>
            <span className="text-cyan-400 font-semibold">
              {probeMeta.voltageSymbol} = {activeProbeSignal.voltage >= 0 ? '+' : ''}
              {activeProbeSignal.voltage.toFixed(1)} V
            </span>
            <span className="text-amber-400 font-semibold">
              {probeMeta.currentSymbol} = {activeProbeSignal.current.toFixed(2)} A
            </span>
            <span className="text-slate-300">
              p(t) = {(activeProbeSignal.voltage * activeProbeSignal.current).toFixed(1)} W
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Conducting:{' '}
              <strong className="text-emerald-400 font-semibold">
                {activePoint.activeDevices}
              </strong>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">Sweep:</span>
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onChangeSweepSpeed(spd)}
                  className={`px-1.5 py-0.5 text-[11px] rounded ${
                    sweepSpeed === spd
                      ? 'bg-slate-800 text-cyan-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Component Formula & Quantitative Telemetry Readout Grid */}
      <div className="p-4 border-t border-slate-800 bg-[#0B0F17] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <div className="text-xs text-slate-300">
            <span className="text-slate-400 font-medium">Governing Relation: </span>
            <code className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {probeMeta.formula}
            </code>
          </div>
          <div className="text-xs text-slate-400">{probeMeta.description}</div>
        </div>

        {/* 4-Column Precision Metric Readout for Probed Component + Rectifier Output */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded bg-[#111827] border border-slate-800/90">
            <div className="text-[11px] text-slate-400">
              Probe Avg / DC Voltage
            </div>
            <div className="mt-1 flex items-baseline font-mono tabular-nums">
              <span className="text-xl font-bold text-cyan-400">
                {metrics.probeVAvg.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 ml-1">V</span>
            </div>
            <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-400">
              RMS: {metrics.probeVRms.toFixed(1)} V · Pk: {metrics.probeVPeakMax.toFixed(0)} V
            </div>
          </div>

          <div className="p-3 rounded bg-[#111827] border border-slate-800/90">
            <div className="text-[11px] text-slate-400">
              Probe Current (Avg / RMS)
            </div>
            <div className="mt-1 flex items-baseline font-mono tabular-nums">
              <span className="text-xl font-bold text-amber-400">
                {metrics.probeIAvg.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 ml-1">A avg</span>
            </div>
            <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-400">
              RMS: {metrics.probeIRms.toFixed(2)} A · Pk: {metrics.probeIPeak.toFixed(2)} A
            </div>
          </div>

          <div className="p-3 rounded bg-[#111827] border border-slate-800/90">
            <div className="text-[11px] text-slate-400">
              Load DC Bus (V_dc / I_dc)
            </div>
            <div className="mt-1 flex items-baseline font-mono tabular-nums">
              <span className="text-xl font-bold text-slate-100">
                {metrics.vDcAvg.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 ml-1">V</span>
              <span className="text-slate-500 mx-1.5">/</span>
              <span className="text-base font-semibold text-emerald-400">
                {metrics.iDcAvg.toFixed(2)} A
              </span>
            </div>
            <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-400">
              Ripple: {(metrics.rippleFactor * 100).toFixed(1)}% · FF: {metrics.formFactor.toFixed(2)}
            </div>
          </div>

          <div className="p-3 rounded bg-[#111827] border border-slate-800/90">
            <div className="text-[11px] text-slate-400">
              Power &amp; Commutation
            </div>
            <div className="mt-1 flex items-baseline font-mono tabular-nums">
              <span className="text-xl font-bold text-slate-100">
                {metrics.pLoadActive.toFixed(0)}
              </span>
              <span className="text-xs text-slate-400 ml-1">W</span>
              <span className="text-xs text-emerald-400 ml-2">
                PF {metrics.powerFactor.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-400">
              Cond: {metrics.conductionAngleDeg.toFixed(0)}° · PIV: {metrics.pivVolts.toFixed(0)} V
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

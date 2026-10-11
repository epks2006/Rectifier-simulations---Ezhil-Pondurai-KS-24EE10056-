import React from 'react';
import { SimulationParams, TelemetryMetrics } from '../types/simulation';

interface ParameterControlsProps {
  params: SimulationParams;
  metrics: TelemetryMetrics;
  onUpdateParams: (patch: Partial<SimulationParams>) => void;
  onApplyPreset: (preset: Partial<SimulationParams>) => void;
}

export const ParameterControls: React.FC<ParameterControlsProps> = ({
  params,
  metrics,
  onUpdateParams,
  onApplyPreset,
}) => {
  const maxAlpha = params.phaseMode === '3phase' ? 150 : 170;
  const vPeak =
    params.phaseMode === '1phase'
      ? Math.SQRT2 * params.vRms
      : Math.SQRT2 * Math.sqrt(3) * params.vRms;

  const loadPresets: {
    label: string;
    desc: string;
    patch: Partial<SimulationParams>;
  }[] = [
    {
      label: 'Pure R Load',
      desc: 'R=15Ω, L=0mH, E=0V',
      patch: { resistanceR: 15, inductanceMH: 0, backEmfE: 0 },
    },
    {
      label: 'R-L Inductive',
      desc: 'R=10Ω, L=65mH, E=0V',
      patch: { resistanceR: 10, inductanceMH: 65, backEmfE: 0 },
    },
    {
      label: 'R-E Battery Load',
      desc: 'R=12Ω, L=0mH, E=120V',
      patch: { resistanceR: 12, inductanceMH: 0, backEmfE: 120 },
    },
    {
      label: 'R-L-E DC Motor (CCM)',
      desc: 'R=8Ω, L=90mH, E=90V',
      patch: { resistanceR: 8, inductanceMH: 90, backEmfE: 90 },
    },
    {
      label: 'R-L-E Discontinuous (DCM)',
      desc: 'R=20Ω, L=18mH, E=140V',
      patch: { resistanceR: 20, inductanceMH: 18, backEmfE: 140 },
    },
  ];

  return (
    <section
      aria-label="Converter Topology and R-L-E Load Controls"
      className="flex flex-col bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-4"
    >
      {/* Top Row: Converter Topology & AC Phase Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Rectifier Bridge Type */}
        <div className="bg-[#0B0F17] p-2.5 rounded border border-slate-800">
          <div className="text-xs font-medium text-slate-400 mb-2">
            Bridge Semiconductor Topology
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-[#111827] p-1 rounded border border-slate-800/80">
            <button
              type="button"
              onClick={() => onUpdateParams({ topology: 'diode' })}
              className={`py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                params.topology === 'diode'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Diode Bridge (α=0°)
            </button>
            <button
              type="button"
              onClick={() => onUpdateParams({ topology: 'thyristor' })}
              className={`py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                params.topology === 'thyristor'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Thyristor Controlled
            </button>
          </div>
        </div>

        {/* AC Supply Input Phase Mode */}
        <div className="bg-[#0B0F17] p-2.5 rounded border border-slate-800">
          <div className="text-xs font-medium text-slate-400 mb-2">
            AC Supply Input Configuration
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-[#111827] p-1 rounded border border-slate-800/80">
            <button
              type="button"
              onClick={() => onUpdateParams({ phaseMode: '1phase' })}
              className={`py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                params.phaseMode === '1phase'
                  ? 'bg-indigo-500 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Single-Phase (1Φ)
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateParams({
                  phaseMode: '3phase',
                  alphaDeg: Math.min(150, params.alphaDeg),
                })
              }
              className={`py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                params.phaseMode === '3phase'
                  ? 'bg-indigo-500 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Three-Phase (3Φ)
            </button>
          </div>
        </div>
      </div>

      {/* Thyristor Firing Angle Alpha Control */}
      <div
        className={`p-3 rounded border transition-opacity ${
          params.topology === 'thyristor'
            ? 'bg-[#0B0F17] border-emerald-500/40'
            : 'bg-[#0B0F17]/60 border-slate-800/70 opacity-65'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div>
            <label
              htmlFor="slider-alpha"
              className="text-xs font-semibold text-slate-200"
            >
              SCR Firing Delay Angle (α)
            </label>
            <span className="text-[11px] text-slate-400 ml-2">
              {params.topology === 'diode'
                ? '(Fixed at 0° in Diode Mode — switch to Thyristor to adjust)'
                : `(Min conduction angle θ₁ = ${metrics.minFiringAngleDeg.toFixed(1)}°)`}
            </span>
          </div>
          <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
            α = {params.topology === 'diode' ? 0 : params.alphaDeg}°
          </span>
        </div>

        <input
          id="slider-alpha"
          type="range"
          min={0}
          max={maxAlpha}
          step={1}
          disabled={params.topology === 'diode'}
          value={params.topology === 'diode' ? 0 : params.alphaDeg}
          onChange={(e) =>
            onUpdateParams({
              topology: 'thyristor',
              alphaDeg: Number(e.target.value),
            })
          }
          className="w-full"
        />

        <div className="flex items-center justify-between gap-1 mt-2">
          <span className="text-[11px] text-slate-400">Quick Firing Angles:</span>
          <div className="flex flex-wrap items-center gap-1">
            {[0, 30, 45, 60, 90, 120].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() =>
                  onUpdateParams({
                    topology: 'thyristor',
                    alphaDeg: deg,
                  })
                }
                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
                  params.topology === 'thyristor' && params.alphaDeg === deg
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* R, L, E Load Parameter Sliders */}
      <div className="space-y-3 bg-[#0B0F17] p-3 rounded border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <span className="text-xs font-semibold text-slate-200">
            R-L-E Series Load Parameters
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {loadPresets.map((pr) => (
              <button
                key={pr.label}
                type="button"
                title={pr.desc}
                onClick={() => onApplyPreset(pr.patch)}
                className="px-2 py-0.5 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
              >
                {pr.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Resistance R */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <label htmlFor="slider-R" className="text-slate-300 font-medium">
              Load Resistance (R)
            </label>
            <span className="font-mono font-semibold text-emerald-400 tabular-nums">
              {params.resistanceR} Ω
            </span>
          </div>
          <input
            id="slider-R"
            type="range"
            min={1}
            max={100}
            step={1}
            value={params.resistanceR}
            onChange={(e) => onUpdateParams({ resistanceR: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* 2. Inductance L */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-2">
              <label htmlFor="slider-L" className="text-slate-300 font-medium">
                Load Inductance (L)
              </label>
              <button
                type="button"
                onClick={() => onUpdateParams({ inductanceMH: 0 })}
                className="px-1.5 py-0.2 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800"
              >
                Set 0 mH (Pure R)
              </button>
            </div>
            <span className="font-mono font-semibold text-purple-400 tabular-nums">
              {params.inductanceMH} mH{' '}
              <span className="text-slate-500 text-[11px]">
                (X_L = {(2 * Math.PI * params.frequency * params.inductanceMH * 1e-3).toFixed(1)} Ω)
              </span>
            </span>
          </div>
          <input
            id="slider-L"
            type="range"
            min={0}
            max={250}
            step={1}
            value={params.inductanceMH}
            onChange={(e) => onUpdateParams({ inductanceMH: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* 3. Back-EMF E */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-2">
              <label htmlFor="slider-E" className="text-slate-300 font-medium">
                DC Counter-EMF / Battery (E)
              </label>
              <button
                type="button"
                onClick={() => onUpdateParams({ backEmfE: 0 })}
                className="px-1.5 py-0.2 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800"
              >
                Set 0 V
              </button>
            </div>
            <span className="font-mono font-semibold text-rose-400 tabular-nums">
              {params.backEmfE} V{' '}
              <span className="text-slate-500 text-[11px]">
                ({((params.backEmfE / vPeak) * 100).toFixed(0)}% of V_pk)
              </span>
            </span>
          </div>
          <input
            id="slider-E"
            type="range"
            min={0}
            max={350}
            step={5}
            value={params.backEmfE}
            onChange={(e) => onUpdateParams({ backEmfE: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>

      {/* AC Supply Input Voltage, Frequency & Freewheeling Diode Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0B0F17] p-3 rounded border border-slate-800">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <label htmlFor="slider-Vrms" className="text-slate-300 font-medium">
              {params.phaseMode === '1phase' ? 'AC Supply V_rms' : 'Phase L-N V_rms'}
            </label>
            <span className="font-mono font-semibold text-indigo-300 tabular-nums">
              {params.vRms} V{' '}
              <span className="text-slate-500 text-[10px]">
                (Pk {vPeak.toFixed(0)}V)
              </span>
            </span>
          </div>
          <input
            id="slider-Vrms"
            type="range"
            min={50}
            max={300}
            step={5}
            value={params.vRms}
            onChange={(e) => onUpdateParams({ vRms: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <div className="flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-300 font-medium">Grid Frequency:</span>
            <div className="flex items-center gap-1 bg-[#111827] p-0.5 rounded border border-slate-800">
              {[50, 60].map((hz) => (
                <button
                  key={hz}
                  type="button"
                  onClick={() => onUpdateParams({ frequency: hz })}
                  className={`px-2.5 py-0.5 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                    params.frequency === hz
                      ? 'bg-slate-800 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {hz} Hz
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-300 font-medium">
              Freewheeling Diode (D_fw):
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateParams({ freewheelingDiode: !params.freewheelingDiode })
              }
              className={`px-3 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
                params.freewheelingDiode
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {params.freewheelingDiode ? 'Connected (Clamped ≥ 0V)' : 'Disconnected'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

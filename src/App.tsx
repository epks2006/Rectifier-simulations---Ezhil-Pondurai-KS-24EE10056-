/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ProbeComponentId,
  SimulationParams,
} from './types/simulation';
import {
  extractProbeSignal,
  getProbeMetadataList,
  runRectifierSimulation,
} from './engine/rectifierSolver';
import { OscilloscopePanel } from './components/OscilloscopePanel';
import { CircuitDiagramPanel } from './components/CircuitDiagramPanel';
import { ParameterControls } from './components/ParameterControls';

const DEFAULT_PARAMS: SimulationParams = {
  topology: 'thyristor',
  phaseMode: '1phase',
  vRms: 230,
  frequency: 50,
  alphaDeg: 45,
  resistanceR: 12,
  inductanceMH: 45,
  backEmfE: 80,
  freewheelingDiode: false,
};

export default function App() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [selectedProbe, setSelectedProbe] = useState<ProbeComponentId>('load_total');
  const [liveAngleDeg, setLiveAngleDeg] = useState<number>(65);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [sweepSpeed, setSweepSpeed] = useState<number>(1);

  // Ensure selectedProbe stays valid when switching from 3-phase to 1-phase
  useEffect(() => {
    if (
      params.phaseMode === '1phase' &&
      (selectedProbe === 'switch_5' || selectedProbe === 'switch_6')
    ) {
      setSelectedProbe('switch_1');
    }
  }, [params.phaseMode, selectedProbe]);

  // Real-time phase sweep animation
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dtSec = (now - lastTime) / 1000;
      lastTime = now;
      // Advance ~110 degrees per second at 1x speed for clear visual inspection
      setLiveAngleDeg((prev) => (prev + dtSec * 110 * sweepSpeed) % 720);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, sweepSpeed]);

  const probeList = useMemo(
    () => getProbeMetadataList(params.phaseMode, params.topology),
    [params.phaseMode, params.topology]
  );

  const probeMeta = useMemo(
    () => probeList.find((p) => p.id === selectedProbe) || probeList[0],
    [probeList, selectedProbe]
  );

  // Execute high-resolution steady-state ODE rectifier simulation
  const { points, metrics } = useMemo(
    () => runRectifierSimulation(params, selectedProbe),
    [params, selectedProbe]
  );

  const activePointIndex = Math.min(
    points.length - 1,
    Math.max(0, Math.round(liveAngleDeg % 720))
  );
  const activePoint = points[activePointIndex] || points[0];

  const handleUpdateParams = (patch: Partial<SimulationParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  // Compute summary rows across ALL components for the bottom comparison matrix
  const allComponentSummaries = useMemo(() => {
    const cyclePts = points.slice(0, 360);
    const n = cyclePts.length || 1;

    return probeList.map((item) => {
      let sumV = 0,
        sumVSq = 0,
        maxV = -Infinity,
        minV = Infinity;
      let sumI = 0,
        sumISq = 0,
        maxI = 0,
        sumP = 0;

      for (const pt of cyclePts) {
        const sig = extractProbeSignal(pt, item.id);
        sumV += sig.voltage;
        sumVSq += sig.voltage * sig.voltage;
        if (sig.voltage > maxV) maxV = sig.voltage;
        if (sig.voltage < minV) minV = sig.voltage;
        sumI += sig.current;
        sumISq += sig.current * sig.current;
        if (Math.abs(sig.current) > maxI) maxI = Math.abs(sig.current);
        sumP += sig.voltage * sig.current;
      }

      return {
        meta: item,
        vAvg: sumV / n,
        vRms: Math.sqrt(sumVSq / n),
        vMax: maxV,
        vMin: minV,
        iAvg: sumI / n,
        iRms: Math.sqrt(sumISq / n),
        iPeak: maxI,
        pAvg: sumP / n,
      };
    });
  }, [points, probeList]);

  // Export simulated waveform dataset as CSV
  const handleExportCsv = () => {
    const headers = [
      'Angle_deg',
      'Time_ms',
      'V_Supply_A',
      'V_Line_AB',
      'I_Supply_A',
      'V_Load_Total',
      'I_Load',
      'V_Resistor_R',
      'V_Inductor_L',
      'V_BackEMF_E',
      'V_Switch1',
      'I_Switch1',
      'V_Switch2',
      'I_Switch2',
      'V_Switch3',
      'I_Switch3',
      'V_Switch4',
      'I_Switch4',
      'Active_Devices',
    ];
    const rows = points.map((p) =>
      [
        p.thetaDeg.toFixed(1),
        p.timeMs.toFixed(3),
        p.vSupplyA.toFixed(2),
        p.vLineAB.toFixed(2),
        p.iSupplyA.toFixed(3),
        p.vLoadTotal.toFixed(2),
        p.iLoad.toFixed(3),
        p.vResistorR.toFixed(2),
        p.vInductorL.toFixed(2),
        p.vBackEmfE.toFixed(2),
        p.vSwitch[0].toFixed(2),
        p.iSwitch[0].toFixed(3),
        p.vSwitch[1].toFixed(2),
        p.iSwitch[1].toFixed(3),
        p.vSwitch[2].toFixed(2),
        p.iSwitch[2].toFixed(3),
        p.vSwitch[3].toFixed(2),
        p.iSwitch[3].toFixed(3),
        `"${p.activeDevices}"`,
      ].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `powerscope_${params.phaseMode}_${params.topology}_R${params.resistanceR}_L${params.inductanceMH}_E${params.backEmfE}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-[#0D131F]">
        {/* Zone 1: Brand Title */}
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          PowerScope Lab
        </a>

        {/* Zone 2: 5 Concise Single-Line Mode & Section Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() =>
              handleUpdateParams({ phaseMode: '1phase', topology: 'diode' })
            }
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              params.phaseMode === '1phase' && params.topology === 'diode'
                ? 'text-cyan-400 underline underline-offset-4'
                : ''
            }`}
          >
            1-Phase Diode
          </button>
          <button
            type="button"
            onClick={() =>
              handleUpdateParams({
                phaseMode: '1phase',
                topology: 'thyristor',
                alphaDeg: params.alphaDeg === 0 ? 45 : params.alphaDeg,
              })
            }
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              params.phaseMode === '1phase' && params.topology === 'thyristor'
                ? 'text-cyan-400 underline underline-offset-4'
                : ''
            }`}
          >
            1-Phase Thyristor
          </button>
          <button
            type="button"
            onClick={() =>
              handleUpdateParams({ phaseMode: '3phase', topology: 'diode' })
            }
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              params.phaseMode === '3phase' && params.topology === 'diode'
                ? 'text-cyan-400 underline underline-offset-4'
                : ''
            }`}
          >
            3-Phase Diode
          </button>
          <button
            type="button"
            onClick={() =>
              handleUpdateParams({
                phaseMode: '3phase',
                topology: 'thyristor',
                alphaDeg: params.alphaDeg === 0 ? 35 : Math.min(140, params.alphaDeg),
              })
            }
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              params.phaseMode === '3phase' && params.topology === 'thyristor'
                ? 'text-cyan-400 underline underline-offset-4'
                : ''
            }`}
          >
            3-Phase Thyristor
          </button>
          <a
            href="#component-matrix"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Component Matrix
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0"
          >
            Export Waveform CSV
          </button>
        </div>
      </header>

      {/* Main Split Workbench: Waveforms on LEFT, Circuit Diagram & Controls on RIGHT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT PANEL: Real-Time Oscilloscope Waveform Visualizer (7 of 12 cols) */}
          <div className="lg:col-span-7">
            <OscilloscopePanel
              params={params}
              points={points}
              metrics={metrics}
              selectedProbe={selectedProbe}
              probeMeta={probeMeta}
              probeList={probeList}
              onSelectProbe={setSelectedProbe}
              liveAngleDeg={liveAngleDeg}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onStepAngle={(delta) => {
                setIsPlaying(false);
                setLiveAngleDeg((prev) => (prev + delta + 720) % 720);
              }}
              onSetAngle={(deg) => {
                setLiveAngleDeg(deg);
              }}
              sweepSpeed={sweepSpeed}
              onChangeSweepSpeed={setSweepSpeed}
            />
          </div>

          {/* RIGHT PANEL: Interactive Circuit Diagram + R-L-E Parameter Controls (5 of 12 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <CircuitDiagramPanel
              params={params}
              activePoint={activePoint}
              selectedProbe={selectedProbe}
              probeMeta={probeMeta}
              onSelectProbe={setSelectedProbe}
            />

            <ParameterControls
              params={params}
              metrics={metrics}
              onUpdateParams={handleUpdateParams}
              onApplyPreset={(preset) => handleUpdateParams(preset)}
            />
          </div>
        </div>

        {/* Bottom Section: All-Component Telemetry Comparison Matrix */}
        <section
          id="component-matrix"
          aria-label="All Circuit Components Voltage and Current Matrix"
          className="bg-[#111827] border border-slate-800 rounded-lg overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-slate-800 bg-[#0D131F] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Complete Circuit Component Probe Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Click any component row below or on the right-hand schematic to inspect its live voltage and current waveforms on the left oscilloscope.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400 tabular-nums">
              Power Balance: P_out ({metrics.pLoadActive.toFixed(1)} W) = P_R ({metrics.pResistor.toFixed(1)} W) + P_E ({metrics.pBackEmf.toFixed(1)} W)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0B0F17] text-slate-400 font-mono">
                  <th className="py-2.5 px-4 font-medium">Component</th>
                  <th className="py-2.5 px-4 font-medium">Signals</th>
                  <th className="py-2.5 px-4 font-medium text-right">DC / Avg Voltage</th>
                  <th className="py-2.5 px-4 font-medium text-right">RMS Voltage</th>
                  <th className="py-2.5 px-4 font-medium text-right">V_max / V_min</th>
                  <th className="py-2.5 px-4 font-medium text-right">Avg Current</th>
                  <th className="py-2.5 px-4 font-medium text-right">RMS Current</th>
                  <th className="py-2.5 px-4 font-medium text-right">Avg Power</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                {allComponentSummaries.map((row) => {
                  const isSelected = row.meta.id === selectedProbe;
                  return (
                    <tr
                      key={row.meta.id}
                      onClick={() => setSelectedProbe(row.meta.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-500/10 text-slate-100'
                          : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-100">
                        {row.meta.shortLabel}
                      </td>
                      <td className="py-2.5 px-4 text-cyan-400">
                        {row.meta.voltageSymbol}, {row.meta.currentSymbol}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-cyan-300">
                        {row.vAvg.toFixed(1)} V
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-200">
                        {row.vRms.toFixed(1)} V
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">
                        +{row.vMax.toFixed(0)}V / {row.vMin.toFixed(0)}V
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-amber-400">
                        {row.iAvg.toFixed(2)} A
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-200">
                        {row.iRms.toFixed(2)} A
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-400">
                        {row.pAvg.toFixed(1)} W
                      </td>
                      <td className="py-2.5 px-4 text-right font-sans">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProbe(row.meta.id);
                          }}
                          className={`px-2.5 py-1 text-xs rounded font-medium transition-colors whitespace-nowrap shrink-0 ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950 font-semibold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {isSelected ? 'Probing' : 'Probe Waveform'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#0D131F] px-6 py-3.5 text-xs text-slate-400">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-200 font-medium">Ezhil Pondurai KS</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">24EE10056</span>
            <span aria-hidden="true">·</span>
            <span>Power Electronics R-L-E Rectifier Simulation Workbench</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/epks2006/Rectifier-simulations---Ezhil-Pondurai-KS-24EE10056-"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
            >
              GitHub Repository (epks2006)
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://ais-pre-w6u77kllmhbm6aogubdegv-914879302727.asia-southeast1.run.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white underline underline-offset-4 transition-colors"
            >
              Live Web App Link
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

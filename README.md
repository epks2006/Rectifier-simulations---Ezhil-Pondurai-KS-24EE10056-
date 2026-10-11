# PowerScope Lab — Rectifier & R-L-E Load Simulation Workbench

**Author:** Ezhil Pondurai KS (Roll No: `24EE10056`)  
**Repository:** [epks2006/Rectifier-simulations---Ezhil-Pondurai-KS-24EE10056-](https://github.com/epks2006/Rectifier-simulations---Ezhil-Pondurai-KS-24EE10056-)

---

## Live Interactive Simulation Link

- **Primary Hosted Web App:** [https://ais-pre-w6u77kllmhbm6aogubdegv-914879302727.asia-southeast1.run.app](https://ais-pre-w6u77kllmhbm6aogubdegv-914879302727.asia-southeast1.run.app)
- **GitHub Pages Deployment (once enabled):** [https://epks2006.github.io/Rectifier-simulations---Ezhil-Pondurai-KS-24EE10056-/](https://epks2006.github.io/Rectifier-simulations---Ezhil-Pondurai-KS-24EE10056-/)

---

## Features

1. **Converter Topologies**:
   - **Uncontrolled Diode Bridge Rectifier** ($\alpha = 0^\circ$)
   - **Thyristor Controlled Bridge Rectifier (SCR)** (adjustable firing delay angle $\alpha$)
2. **Supply Configurations**:
   - **Single-Phase ($1\Phi$) Full-Bridge** (4 switches: $D_1..D_4$ or $T_1..T_4$)
   - **Three-Phase ($3\Phi$) 6-Pulse Full-Bridge** (6 switches: $D_1..D_6$ or $T_1..T_6$)
3. **Series $R, L, E$ Load & Freewheeling Diode ($D_{fw}$)**:
   - Supports Pure $R$, $R\text{-}L$, $R\text{-}E$, and general $R\text{-}L\text{-}E$ motor/battery loads in both **Continuous Conduction Mode (CCM)** and **Discontinuous Conduction Mode (DCM)**.
4. **Interactive Component Oscilloscope Probing**:
   - Click any component on the right-hand schematic ($V_{out}$, Resistor $R$, Inductor $L$, Back-EMF $E$, AC Supply, individual switches $T_1..T_6$, or Freewheeling Diode $D_{fw}$) to view its real-time voltage and current waveforms on the left-hand digital storage oscilloscope.

---

## Running Locally

```bash
npm install
npm run dev
```

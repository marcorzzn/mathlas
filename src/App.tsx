/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VisualConceptAtlasLab } from './components/VisualConceptAtlasLab';
import { AtlasGraph3D } from './components/AtlasGraph3D';
import { UnifiedDimensionalLab } from './components/UnifiedDimensionalLab';
import { TensorEllipsoidLab } from './components/TensorEllipsoidLab';
import { OperatorCalculusLab } from './components/OperatorCalculusLab';
import { RotationsAndProjectiveLab } from './components/RotationsAndProjectiveLab';
import { OntologyAndCompendiumView } from './components/OntologyAndCompendiumView';
import { GraphicalMethodsView } from './components/GraphicalMethodsView';
import { PantheonModule } from './components/PantheonModule';
import { BookOpen, Sparkles, Eye, Compass, Network, Layers } from 'lucide-react';

type ActiveModule =
  | 'visual_atlas'
  | 'graph3d'
  | 'dimensional'
  | 'tensor'
  | 'operator'
  | 'rotations'
  | 'graphical_methods'
  | 'ontology'
  | 'pantheon';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('visual_atlas');
  const [ontologySubSection, setOntologySubSection] = useState<
    'taxonomy40' | 'bridges9' | 'book24' | 'cnl_lean' | 'graphical_methods'
  >('taxonomy40');

  const handleOpenLabFromGraph = (
    lab: 'dimensional' | 'tensor' | 'operator' | 'rotations' | 'cnl'
  ) => {
    if (lab === 'cnl') {
      setOntologySubSection('cnl_lean');
      setActiveModule('ontology');
    } else {
      setActiveModule(lab);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e8ecf4] flex flex-col font-sans">
      {/* Top Bar: Navigazione Primaria con Pantheon posizionato come ultimo elemento (Meta-Visione) */}
      <header className="sticky top-0 z-40 bg-[#07090e]/95 backdrop-blur-md border-b border-slate-800/90 px-6 py-3">
        <div className="max-w-[1750px] mx-auto flex items-center justify-between gap-6">
          {/* Zone 1: Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveModule('visual_atlas');
            }}
            className="flex items-center gap-2.5 text-lg font-serif-editorial font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>MATHLAS</span>
          </a>

          {/* Zone 2: Navigation Links (I 6 Moduli Primari + Enciclopedia) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-medium">
            {[
              { id: 'visual_atlas', label: 'Atlante Visuale' },
              { id: 'graph3d', label: 'Grafo 3D' },
              { id: 'dimensional', label: 'Dimensioni & ℂ' },
              { id: 'rotations', label: 'Rotazioni & Proiettiva' },
              { id: 'tensor', label: 'Tensori & Operatori' },
              { id: 'graphical_methods', label: '✨ Metodi Grafici' },
              { id: 'ontology', label: '📚 Enciclopedia 40 Cat.' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'ontology') {
                    setOntologySubSection('taxonomy40');
                  }
                  setActiveModule(item.id as ActiveModule);
                }}
                className={`whitespace-nowrap shrink-0 py-1 transition-all cursor-pointer border-b-2 ${
                  activeModule === item.id ||
                  (item.id === 'tensor' && activeModule === 'operator')
                    ? 'border-amber-400 text-amber-300 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile/Compact Horizontal Navigation Bar (for small screens) */}
          <nav className="flex lg:hidden items-center gap-1.5 overflow-x-auto text-xs py-1">
            {[
              { id: 'visual_atlas', label: 'Atlante' },
              { id: 'graph3d', label: 'Grafo' },
              { id: 'tensor', label: 'Laboratori' },
              { id: 'graphical_methods', label: '✨ Metodi' },
              { id: 'ontology', label: '📚 Enciclopedia' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id as ActiveModule)}
                className={`px-2.5 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
                  activeModule === item.id || (item.id === 'tensor' && activeModule === 'operator')
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: L'ULTIMO ELEMENTO DELLA BARRA SUPERIORE -> PANTHEON 3D (Meta-Visione del Sistema) */}
          <button
            onClick={() => setActiveModule('pantheon')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-lg ${
              activeModule === 'pantheon'
                ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-amber-500/25'
                : 'bg-[#0f172a] hover:bg-[#1e293b] text-amber-300 border border-amber-500/40 hover:border-amber-400 shadow-slate-950'
            }`}
            title="Pantheon 3D: La prospettiva con cui l'intero sito osserva e naviga se stesso"
          >
            <Eye className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>🏛️ Pantheon (Meta-Visione 3D)</span>
          </button>
        </div>
      </header>

      {/* Secondary Sub-Bar when in Tensor/Operator mode */}
      {(activeModule === 'tensor' || activeModule === 'operator') && (
        <div className="bg-[#0b0f19] border-b border-slate-800/80 px-6 py-2.5">
          <div className="max-w-[1750px] mx-auto flex items-center gap-3 text-xs">
            <span className="text-slate-400 font-mono-tech">Seleziona Laboratorio:</span>
            <button
              onClick={() => setActiveModule('tensor')}
              className={`px-3 py-1 rounded font-mono-tech cursor-pointer whitespace-nowrap transition-colors ${
                activeModule === 'tensor'
                  ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Lab Tensori 3D (Inerzia, Sforzo, Ricci)
            </button>
            <button
              onClick={() => setActiveModule('operator')}
              className={`px-3 py-1 rounded font-mono-tech cursor-pointer whitespace-nowrap transition-colors ${
                activeModule === 'operator'
                  ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Lab Operatori, Spazio Duale & Politopo di Birkhoff (mHC)
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 lg:px-6 py-6">
        {activeModule === 'visual_atlas' && <VisualConceptAtlasLab />}
        {activeModule === 'graph3d' && (
          <AtlasGraph3D onOpenLab={handleOpenLabFromGraph} />
        )}
        {activeModule === 'dimensional' && <UnifiedDimensionalLab />}
        {activeModule === 'tensor' && <TensorEllipsoidLab />}
        {activeModule === 'operator' && <OperatorCalculusLab />}
        {activeModule === 'rotations' && <RotationsAndProjectiveLab />}
        {activeModule === 'graphical_methods' && <GraphicalMethodsView />}
        {activeModule === 'ontology' && (
          <OntologyAndCompendiumView
            key={ontologySubSection}
            initialSection={ontologySubSection}
          />
        )}
        {activeModule === 'pantheon' && (
          <PantheonModule
            onNavigateAtlasModule={(target) => setActiveModule(target as ActiveModule)}
          />
        )}
      </main>

      {/* Subtle Academic Footer */}
      <footer className="border-t border-slate-800/80 bg-[#05070a] px-6 py-4 text-xs text-slate-400 font-mono-tech">
        <div className="max-w-[1750px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">ATHLAS</span>
            <span>·</span>
            <span>Sistema Enciclopedico-Esplorativo della Matematica (Algebra Lineare · Geometria Proiettiva · Categorie · Metodi Grafici)</span>
          </div>
          <div>
            Dal 2-Simplesso alla Cattedrale di Calcolo Quantistico, dai Diagrammi di Hasse alle Equazioni di Maxwell e HoTT
          </div>
        </div>
      </footer>
    </div>
  );
}

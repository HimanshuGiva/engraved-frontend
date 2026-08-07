import { useState, useEffect } from 'react';
import { JewelryItem, CanvasElement, SavedDesignBundle, AiOption, ValidationIssue } from './types';
import { JEWELRY_CATALOG } from './data/jewelryCatalog';
import { Navbar } from './components/Navbar';
import { JewelrySelector } from './components/JewelrySelector';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { Toolbar, ToolMode } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { AiCreateModal } from './components/AiCreateModal';
import { AiEnhanceModal } from './components/AiEnhanceModal';
import { ImageUploadModal } from './components/ImageUploadModal';
import { TextModal } from './components/TextModal';
import { JewelryPreview } from './components/JewelryPreview';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { StoreAssociateDrawer } from './components/StoreAssociateDrawer';
import { ValidationBanner } from './components/ValidationBanner';
import { validateEngravingDesign, autoFixEngravingDesign } from './utils/validationEngine';
import { generateCompositeSvg, SHAPE_PRESETS, SHAPE_LABELS } from './utils/svgUtils';
import { ArrowRight } from 'lucide-react';

export default function App() {
  const [currentStep, setCurrentStep] = useState<'select' | 'studio' | 'preview' | 'confirm'>('select');
  const [selectedJewelry, setSelectedJewelry] = useState<JewelryItem | null>(null);

  // Canvas elements state + History
  const [elementsHistory, setElementsHistory] = useState<CanvasElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const currentElements = elementsHistory[historyIndex] || [];

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [eraserSize, setEraserSize] = useState<number>(6);

  // Modals & Drawers
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isEnhanceModalOpen, setIsEnhanceModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isStoreAssociateOpen, setIsStoreAssociateOpen] = useState(false);
  const [refiningElement, setRefiningElement] = useState<CanvasElement | null>(null);
  const [enhancingElement, setEnhancingElement] = useState<CanvasElement | null>(null);

  // Validation
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [fixedMessage, setFixedMessage] = useState<string | null>(null);

  // Saved Design
  const [savedBundle, setSavedBundle] = useState<SavedDesignBundle | null>(null);

  // Run validation whenever elements or jewelry changes
  useEffect(() => {
    if (selectedJewelry) {
      const issues = validateEngravingDesign(currentElements, selectedJewelry);
      setValidationIssues(issues);
    }
  }, [currentElements, selectedJewelry]);

  // History updater helper
  const updateElementsWithHistory = (newElements: CanvasElement[]) => {
    const nextHistory = elementsHistory.slice(0, historyIndex + 1);
    nextHistory.push(newElements);
    setElementsHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setFixedMessage(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < elementsHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setFixedMessage(null);
    }
  };

  // Select Jewelry from Catalog
  const handleSelectJewelry = (jewelry: JewelryItem) => {
    setSelectedJewelry(jewelry);
    setCurrentStep('studio');
  };

  // Add Element to Canvas
  const handleAddElement = (newEl: CanvasElement) => {
    const updated = [...currentElements, newEl];
    updateElementsWithHistory(updated);
    setSelectedElementId(newEl.id);
    setFixedMessage(null);
  };

  // Update existing element
  const handleUpdateElement = (updatedEl: CanvasElement) => {
    const updated = currentElements.map((el) => (el.id === updatedEl.id ? updatedEl : el));
    updateElementsWithHistory(updated);
    setSelectedElementId(updatedEl.id);
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    const updated = currentElements.filter((el) => el.id !== id);
    updateElementsWithHistory(updated);
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Duplicate element
  const handleDuplicateElement = (id: string) => {
    const target = currentElements.find((el) => el.id === id);
    if (!target) return;

    const dup: CanvasElement = {
      ...target,
      id: `${target.type}-${Date.now()}`,
      name: `${target.name} (Copy)`,
      x: Math.min(85, target.x + 5),
      y: Math.min(85, target.y + 5),
      zIndex: currentElements.length + 1,
    };

    handleAddElement(dup);
  };

  // Reorder element (front/back)
  const handleReorderElement = (id: string, direction: 'front' | 'back') => {
    const targetIndex = currentElements.findIndex((el) => el.id === id);
    if (targetIndex < 0) return;

    const copy = [...currentElements];
    const item = copy.splice(targetIndex, 1)[0];

    if (direction === 'front') {
      copy.push(item);
    } else {
      copy.unshift(item);
    }

    // Re-index zIndices
    const reindexed = copy.map((el, i) => ({ ...el, zIndex: i + 1 }));
    updateElementsWithHistory(reindexed);
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (currentElements.length === 0) return;
    if (window.confirm('Are you sure you want to clear your entire canvas?')) {
      updateElementsWithHistory([]);
      setSelectedElementId(null);
      setFixedMessage(null);
    }
  };

  // Handle AI Option Selection (Option A or Option B)
  const handleSelectAiOption = (option: AiOption) => {
    // Always drop into the Select tool so the inserted/refined element is
    // immediately movable without an extra click on the toolbar.
    setActiveTool('select');

    if (refiningElement) {
      // Replace existing element with refined SVG
      const updated = {
        ...refiningElement,
        content: option.svgCode,
        name: `Refined: ${option.title}`,
      };
      handleUpdateElement(updated);
      setRefiningElement(null);
    } else {
      // Insert as new AI SVG element
      const newEl: CanvasElement = {
        id: `ai-${Date.now()}`,
        type: 'svg_ai',
        name: option.title,
        x: 50,
        y: 50,
        width: 50,
        height: 50,
        rotation: 0,
        zIndex: currentElements.length + 1,
        content: option.svgCode,
        isAiGenerated: true,
      };
      handleAddElement(newEl);
    }
  };

  const handleApplyEnhance = (svgCode: string) => {
    if (!enhancingElement) return;
    setActiveTool('select');
    handleUpdateElement({
      ...enhancingElement,
      type: 'svg_ai',
      content: svgCode,
      name: `Enhanced: ${enhancingElement.name}`,
      isAiGenerated: true,
    });
    setEnhancingElement(null);
  };

  // Handle Text Addition
  const handleAddText = () => {
    setIsTextModalOpen(true);
  };

  // Add a preset Shape (rectangle, circle, triangle, diamond, star, heart)
  const handleAddShape = (shapeKind: string) => {
    const pathD = SHAPE_PRESETS[shapeKind];
    if (!pathD) return;

    const newEl: CanvasElement = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      name: SHAPE_LABELS[shapeKind] || 'Shape',
      x: 50,
      y: 50,
      width: 40,
      height: 40,
      rotation: 0,
      zIndex: currentElements.length + 1,
      content: pathD,
      strokeWidth: 2,
    };

    // Switch to Select tool so the new shape can be dragged into place right away.
    setActiveTool('select');
    handleAddElement(newEl);
  };

  const handleAddTextFromModal = (text: string, fontStyle: string) => {
    const newEl: CanvasElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      name: `Text "${text}"`,
      x: 50,
      y: 50,
      width: 50,
      height: 20,
      rotation: 0,
      zIndex: currentElements.length + 1,
      content: text,
      color: fontStyle,
    };
    // Switch to Select tool so the new text box can be dragged into place right away.
    setActiveTool('select');
    handleAddElement(newEl);
  };

  // Automatic Fix
  const handleAutoFix = () => {
    if (!selectedJewelry) return;
    const { fixedElements, summaryMessage } = autoFixEngravingDesign(currentElements, selectedJewelry);
    updateElementsWithHistory(fixedElements);
    setFixedMessage(summaryMessage);
  };

  // Confirm Final Design & Save to Server
  const handleConfirmDesign = async () => {
    if (!selectedJewelry) return;

    const composite = generateCompositeSvg(currentElements, selectedJewelry);

    const payload = {
      jewelry: selectedJewelry,
      elements: currentElements,
      compositeSvg: composite,
      validationPassed: validationIssues.length === 0,
      totalPriceInr: selectedJewelry.priceInr + selectedJewelry.engravingFeeInr,
    };

    try {
      const res = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      const bundle: SavedDesignBundle = {
        designId: data.designId || `GV-LIVE-${Math.floor(10000 + Math.random() * 90000)}`,
        createdAt: new Date().toISOString(),
        jewelry: selectedJewelry,
        elements: currentElements,
        compositeSvg: composite,
        validationPassed: validationIssues.length === 0,
        totalPriceInr: selectedJewelry.priceInr + selectedJewelry.engravingFeeInr,
      };

      setSavedBundle(bundle);
      setCurrentStep('confirm');
    } catch (e) {
      // Fallback local bundle
      const bundle: SavedDesignBundle = {
        designId: `GV-LIVE-${Math.floor(10000 + Math.random() * 90000)}`,
        createdAt: new Date().toISOString(),
        jewelry: selectedJewelry,
        elements: currentElements,
        compositeSvg: composite,
        validationPassed: true,
        totalPriceInr: selectedJewelry.priceInr + selectedJewelry.engravingFeeInr,
      };
      setSavedBundle(bundle);
      setCurrentStep('confirm');
    }
  };

  const selectedElement = currentElements.find((el) => el.id === selectedElementId) || null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col font-sans selection:bg-[#E11D48] selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        currentStep={currentStep}
        selectedJewelry={selectedJewelry}
        onStepChange={(step) => setCurrentStep(step)}
        onOpenAssociateMode={() => setIsStoreAssociateOpen(true)}
        designId={savedBundle?.designId}
      />

      {/* Main Content Router */}
      <main className="flex-1 flex flex-col">
        {currentStep === 'select' && (
          <JewelrySelector
            onSelectJewelry={handleSelectJewelry}
            selectedItem={selectedJewelry}
          />
        )}

        {currentStep === 'studio' && selectedJewelry && (
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col space-y-4">
            
            {/* Studio Toolbar */}
            <Toolbar
              activeTool={activeTool}
              onSelectTool={(tool) => setActiveTool(tool)}
              onOpenAiModal={() => {
                setRefiningElement(null);
                setIsAiModalOpen(true);
              }}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onAddText={handleAddText}
              onAddShape={handleAddShape}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < elementsHistory.length - 1}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClearCanvas}
              eraserSize={eraserSize}
              onEraserSizeChange={setEraserSize}
            />

            {/* Live Validation & Auto-Fix Alerts */}
            <ValidationBanner
              issues={validationIssues}
              onAutoFix={handleAutoFix}
              fixedMessage={fixedMessage}
              onUndoFix={handleUndo}
            />

            {/* Studio Main Workspace Layout (Center Canvas + Right Panel) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
              
              {/* Center Interactive Canvas (8 cols) */}
              <div className="lg:col-span-8 flex flex-col items-center justify-center min-h-[500px]">
                <CanvasWorkspace
                  jewelry={selectedJewelry || JEWELRY_CATALOG[0]}
                  elements={currentElements}
                  selectedElementId={selectedElementId}
                  activeTool={activeTool}
                  onSelectElement={(id) => setSelectedElementId(id)}
                  onUpdateElement={handleUpdateElement}
                  onAddElement={handleAddElement}
                  onSelectTool={(tool) => setActiveTool(tool)}
                  onOpenAiModal={() => {
                    setRefiningElement(null);
                    setIsAiModalOpen(true);
                  }}
                  onOpenUploadModal={() => setIsUploadModalOpen(true)}
                  eraserSize={eraserSize}
                />
              </div>

              {/* Right Properties & Layers Panel (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <PropertiesPanel
                  selectedElement={selectedElement}
                  elements={currentElements}
                  onSelectElement={setSelectedElementId}
                  onUpdateElement={handleUpdateElement}
                  onDeleteElement={handleDeleteElement}
                  onDuplicateElement={handleDuplicateElement}
                  onReorderElement={handleReorderElement}
                  onOpenAiRefine={(el) => {
                    setRefiningElement(el);
                    setIsAiModalOpen(true);
                  }}
                  onOpenAiEnhance={(el) => {
                    setEnhancingElement(el);
                    setIsEnhanceModalOpen(true);
                  }}
                />

                {/* Primary CTA - Preview on Jewelry (Moved to right column below Properties/Layers) */}
                <button
                  onClick={() => setCurrentStep('preview')}
                  disabled={currentElements.length === 0}
                  className="w-full py-4 rounded-full bg-[#121214] text-white hover:bg-[#C5A059] transition-all font-bold uppercase tracking-[0.2em] text-xs shadow-md disabled:opacity-40 flex items-center justify-center space-x-2 border border-[#121214] group"
                >
                  <span>Preview on Jewelry</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A059] group-hover:text-white transition-colors" />
                </button>
              </div>

            </div>

          </div>
        )}

        {currentStep === 'preview' && selectedJewelry && (
          <JewelryPreview
            jewelry={selectedJewelry}
            elements={currentElements}
            onBackToEdit={() => setCurrentStep('studio')}
            onConfirmDesign={handleConfirmDesign}
          />
        )}

        {currentStep === 'confirm' && savedBundle && (
          <ConfirmationScreen
            bundle={savedBundle}
            onOpenStoreAssociate={() => setIsStoreAssociateOpen(true)}
            onNewDesign={() => {
              updateElementsWithHistory([]);
              setCurrentStep('select');
            }}
          />
        )}
      </main>

      {/* AI Creation Modal (Strictly 2 options) */}
      {selectedJewelry && (
        <AiCreateModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          jewelry={selectedJewelry}
          onSelectOption={handleSelectAiOption}
          refiningSvg={refiningElement?.content}
        />
      )}

      {enhancingElement && (
        <AiEnhanceModal
          isOpen={isEnhanceModalOpen}
          onClose={() => {
            setIsEnhanceModalOpen(false);
            setEnhancingElement(null);
          }}
          element={enhancingElement}
          eraserLayers={currentElements.filter(
            (el) => el.type === 'eraser' && el.targetElementId === enhancingElement.id
          )}
          onApply={handleApplyEnhance}
        />
      )}

      {/* Image Upload Vectorizer Modal */}
      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAddImageVector={(svgContent, name) => {
          // Switch to Select tool so the uploaded vector can be repositioned immediately.
          setActiveTool('select');
          handleAddElement({
            id: `upload-${Date.now()}`,
            type: 'svg_ai',
            name: name || 'Uploaded Vector Motif',
            x: 50,
            y: 50,
            width: 45,
            height: 45,
            rotation: 0,
            zIndex: currentElements.length + 1,
            content: svgContent,
          });
        }}
      />

      {/* Text Engraving Modal */}
      <TextModal
        isOpen={isTextModalOpen}
        onClose={() => setIsTextModalOpen(false)}
        onAddText={handleAddTextFromModal}
      />

      {/* Store Associate Handoff Station */}
      <StoreAssociateDrawer
        isOpen={isStoreAssociateOpen}
        onClose={() => setIsStoreAssociateOpen(false)}
        activeBundle={savedBundle}
      />

    </div>
  );
}

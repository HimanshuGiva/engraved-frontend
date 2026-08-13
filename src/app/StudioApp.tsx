import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { JewelrySelector } from '../components/jewelry/JewelrySelector';
import { JewelryPreview } from '../components/jewelry/JewelryPreview';
import { CanvasWorkspace } from '../components/studio/CanvasWorkspace';
import { Toolbar } from '../components/studio/Toolbar';
import { PropertiesPanel } from '../components/studio/PropertiesPanel';
import { AiCreateModal } from '../components/modals/AiCreateModal';
import { AiEnhanceModal } from '../components/modals/AiEnhanceModal';
import { ImageUploadModal } from '../components/modals/ImageUploadModal';
import { GiftQrModal } from '../components/modals/GiftQrModal';
import { TextModal } from '../components/modals/TextModal';
import { ConfirmationScreen } from '../components/associate/ConfirmationScreen';
import { SHAPE_PRESETS } from '../constants/shapes';
import { getEngravingSurfaceAspect } from '../constants/engravingSurface';
import { ToolMode } from '../constants/tools';
import { useCanvasHistory, useClearInvalidSelection } from '../hooks/useCanvasHistory';
import { useStudioModals } from '../hooks/useStudioModals';
import { fetchCatalog } from '../services/catalogService';
import { createAppOrder } from '../services/orderService';
import {
  AiOption,
  CanvasElement,
  CanvasRegion,
  JewelryItem,
  SavedDesignBundle,
} from '../types';
import { buildRegionReplacementUpdates, buildRegionVectorSvg, regionCenter } from '../utils/canvasCapture';
import { buildSavedDesignBundle } from '../utils/designBundle';
import { generateCompositeSvg, svgToFillElementBox } from '../utils/svgUtils';

type StudioStep = 'select' | 'studio' | 'preview' | 'confirm';

export default function StudioApp() {
  const [currentStep, setCurrentStep] = useState<StudioStep>('select');
  const [selectedJewelry, setSelectedJewelry] = useState<JewelryItem | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<CanvasRegion | null>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [placingShapeKind, setPlacingShapeKind] = useState<string | null>(null);
  const [eraserSize, setEraserSize] = useState(20);
  const [drawSize, setDrawSize] = useState(2);
  const [linkedMessageId, setLinkedMessageId] = useState<string | null>(null);
  const [savedBundle, setSavedBundle] = useState<SavedDesignBundle | null>(null);
  const propertiesPanelRef = useRef<HTMLDivElement>(null);

  const {
    currentElements,
    canUndo,
    canRedo,
    updateElementsWithHistory,
    resetHistory,
    undo,
    redo,
    beginElementEdit,
    commitElementEdit,
    updateElementLive,
  } = useCanvasHistory();

  const modals = useStudioModals();

  const clearSelection = useCallback(() => setSelectedElementId(null), []);
  useClearInvalidSelection(selectedElementId, currentElements, clearSelection);

  useEffect(() => {
    if (currentStep !== 'studio') return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (propertiesPanelRef.current?.contains(target)) return;
      if (target.closest('[data-canvas-element]')) return;
      if (target.closest('[data-canvas-surface]')) return;
      if (target.closest('[data-no-deselect]')) return;
      setSelectedElementId(null);
      setSelectedRegion(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [currentStep]);

  useEffect(() => {
    fetchCatalog().catch(() => {});
  }, []);

  const handleSelectJewelry = (jewelry: JewelryItem) => {
    setSelectedJewelry(jewelry);
    setActiveTool('draw');
    setCurrentStep('studio');
  };

  const handleAddElement = (newEl: CanvasElement, select = true) => {
    handleAddElements([newEl], select);
  };

  const handleAddElements = (newEls: CanvasElement[], select = false) => {
    if (!newEls.length) return;
    updateElementsWithHistory([...currentElements, ...newEls]);
    if (select) {
      setSelectedElementId(newEls[newEls.length - 1].id);
      setSelectedRegion(null);
    }
  };

  const handleUpdateElement = (
    updatedEl: CanvasElement,
    select = true,
    recordHistory = true
  ) => {
    if (recordHistory) {
      updateElementsWithHistory(
        currentElements.map((el) => (el.id === updatedEl.id ? updatedEl : el))
      );
    } else {
      updateElementLive(updatedEl);
    }
    if (select) {
      setSelectedElementId(updatedEl.id);
      setSelectedRegion(null);
    }
  };

  const handleMoveElement = (id: string, x: number, y: number) => {
    const target = currentElements.find((el) => el.id === id);
    if (!target || (target.x === x && target.y === y)) return;
    updateElementsWithHistory(
      currentElements.map((el) => (el.id === id ? { ...el, x, y } : el))
    );
  };

  const handleDeleteElement = (id: string) => {
    updateElementsWithHistory(currentElements.filter((el) => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleDuplicateElement = (id: string) => {
    const target = currentElements.find((el) => el.id === id);
    if (!target) return;
    handleAddElement({
      ...target,
      id: `${target.type}-${Date.now()}`,
      name: `${target.name} (Copy)`,
      x: Math.min(85, target.x + 5),
      y: Math.min(85, target.y + 5),
      zIndex: currentElements.length + 1,
    });
  };

  const handleReorderElement = (id: string, direction: 'front' | 'back') => {
    const targetIndex = currentElements.findIndex((el) => el.id === id);
    if (targetIndex < 0) return;
    const copy = [...currentElements];
    const item = copy.splice(targetIndex, 1)[0];
    if (direction === 'front') copy.push(item);
    else copy.unshift(item);
    updateElementsWithHistory(copy.map((el, i) => ({ ...el, zIndex: i + 1 })));
  };

  const handleClearCanvas = () => {
    if (currentElements.length === 0) return;
    if (window.confirm('Are you sure you want to clear your entire canvas?')) {
      updateElementsWithHistory([]);
      setSelectedElementId(null);
    }
  };

  const handleSelectAiOption = (option: AiOption) => {
    setActiveTool('select');
    if (modals.refiningElement) {
      handleUpdateElement({
        ...modals.refiningElement,
        content: option.svgCode,
        name: `Refined: ${option.title}`,
      });
      modals.setRefiningElement(null);
      return;
    }
    handleAddElement({
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
    });
  };

  const handleApplyEnhance = (svgCode: string) => {
    setActiveTool('select');
    if (modals.enhancingRegion) {
      const region = modals.enhancingRegion;
      const center = regionCenter(region);
      const stamp = Date.now();
      const { remaining, erasers } = buildRegionReplacementUpdates(currentElements, region, stamp);
      const maxZ = Math.max(0, ...remaining.map((el) => el.zIndex), ...erasers.map((el) => el.zIndex));
      const enhancedLayer: CanvasElement = {
        id: `region-enhanced-${stamp}`,
        type: 'svg_ai',
        name: 'Enhanced Region',
        x: center.x,
        y: center.y,
        width: region.width,
        height: region.height,
        rotation: 0,
        zIndex: maxZ + 1,
        content: svgToFillElementBox(svgCode),
        isAiGenerated: true,
      };

      updateElementsWithHistory([...remaining, ...erasers, enhancedLayer]);
      setSelectedElementId(enhancedLayer.id);
      setSelectedRegion(null);
      modals.closeEnhanceModal();
      return;
    }
    if (!modals.enhancingElement) return;
    handleUpdateElement({
      ...modals.enhancingElement,
      type: 'svg_ai',
      content: svgToFillElementBox(svgCode),
      name: `Enhanced: ${modals.enhancingElement.name}`,
      isAiGenerated: true,
    });
    modals.closeEnhanceModal();
  };

  const handleExtractRegion = (region: CanvasRegion) => {
    const center = regionCenter(region);
    setActiveTool('select');
    setSelectedRegion(null);
    handleAddElement({
      id: `region-${Date.now()}`,
      type: 'svg_ai',
      name: 'Canvas Selection',
      x: center.x,
      y: center.y,
      width: region.width,
      height: region.height,
      rotation: 0,
      zIndex: currentElements.length + 1,
      content: buildRegionVectorSvg(currentElements, region),
    });
  };

  const handleAddGiftQrToCanvas = (svgContent: string, messageId: string, label: string) => {
    setActiveTool('select');
    setLinkedMessageId(messageId);
    handleAddElement({
      id: `qr-${Date.now()}`,
      type: 'svg_ai',
      name: label,
      x: 50,
      y: 50,
      width: 28,
      height: 28,
      rotation: 0,
      zIndex: currentElements.length + 1,
      content: svgContent,
    });
  };

  const handleAddShape = (shapeKind: string) => {
    // Enter "placing" mode: user will click-drag on canvas to size the shape
    const pathD = SHAPE_PRESETS[shapeKind];
    if (!pathD) return;
    setActiveTool('shape');
    setPlacingShapeKind(shapeKind);
  };

  useEffect(() => {
    if (activeTool !== 'shape') {
      setPlacingShapeKind(null);
    }
  }, [activeTool]);

  const handleAddTextFromModal = (text: string, fontStyle: string) => {
    setActiveTool('select');
    handleAddElement({
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
    });
  };

  const handleConfirmDesign = async () => {
    if (!selectedJewelry) return;
    const composite = generateCompositeSvg(currentElements, selectedJewelry);
    const order = await createAppOrder({
      channel: 'pos',
      sku_code: selectedJewelry.backendSkuCode,
      material_code: selectedJewelry.material,
      final_svg: composite,
      ...(linkedMessageId ? { message_id: linkedMessageId } : {}),
    });
    setSavedBundle(
      buildSavedDesignBundle({
        orderId: order.id,
        createdAt: order.created_at,
        channel: order.channel,
        jewelry: selectedJewelry,
        elements: currentElements,
        compositeSvg: composite,
        messageId: linkedMessageId ?? undefined,
        fulfillmentStatus: order.fulfillment_status,
      })
    );
    setCurrentStep('confirm');
  };

  const selectedElement = currentElements.find((el) => el.id === selectedElementId) ?? null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col font-sans selection:bg-[#E11D48] selection:text-white">
      <Navbar
        currentStep={currentStep}
        selectedJewelry={selectedJewelry}
        onStepChange={setCurrentStep}
        designId={savedBundle?.designId}
      />

      <main className="flex-1 flex flex-col">
        {currentStep === 'select' && (
          <JewelrySelector onSelectJewelry={handleSelectJewelry} />
        )}

        {currentStep === 'studio' && selectedJewelry && (
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep('select')}
                className="px-5 py-2.5 rounded-full bg-white border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] text-xs font-semibold flex items-center space-x-2 transition-colors uppercase tracking-wider shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-[#C5A059]" />
                <span>Back to Jewelry</span>
              </button>
              <div className="text-right min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A857C]">Engraving studio</p>
                <p className="font-serif font-bold text-[#121214] truncate">{selectedJewelry.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
              <div className="lg:col-span-2">
                <Toolbar
                  activeTool={activeTool}
                  onSelectTool={setActiveTool}
                  onOpenAiModal={modals.openAiCreate}
                  onOpenUploadModal={() => modals.setIsUploadModalOpen(true)}
                  onOpenGiftQrModal={() => modals.setIsGiftQrModalOpen(true)}
                  onAddText={() => modals.setIsTextModalOpen(true)}
                  onAddShape={handleAddShape}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={undo}
                  onRedo={redo}
                  onClear={handleClearCanvas}
                  eraserSize={eraserSize}
                  onEraserSizeChange={setEraserSize}
                  drawSize={drawSize}
                  onDrawSizeChange={setDrawSize}
                />
              </div>

              <div className="lg:col-span-6 flex flex-col items-center justify-center min-h-[500px]">
                <CanvasWorkspace
                  jewelry={selectedJewelry}
                  elements={currentElements}
                  selectedElementId={selectedElementId}
                  selectedRegion={selectedRegion}
                  activeTool={activeTool}
                  placingShapeKind={placingShapeKind}
                  onSelectElement={(id) => {
                    setSelectedElementId(id);
                    if (id) setSelectedRegion(null);
                  }}
                  onRegionSelect={(region) => {
                    setSelectedRegion(region);
                    if (region) setSelectedElementId(null);
                  }}
                  onUpdateElement={handleUpdateElement}
                  onMoveElement={handleMoveElement}
                  onAddElement={handleAddElement}
                  onAddElements={handleAddElements}
                  onSelectTool={setActiveTool}
                  onOpenAiModal={modals.openAiCreate}
                  onOpenUploadModal={() => modals.setIsUploadModalOpen(true)}
                  eraserSize={eraserSize}
                  drawSize={drawSize}
                />
              </div>

              <div ref={propertiesPanelRef} data-properties-panel className="lg:col-span-4 space-y-4">
                <PropertiesPanel
                  selectedElement={selectedElement}
                  selectedRegion={selectedRegion}
                  elements={currentElements}
                  onSelectElement={(id) => {
                    setSelectedElementId(id);
                    if (id) setSelectedRegion(null);
                  }}
                  onClearRegion={() => setSelectedRegion(null)}
                  onUpdateElement={handleUpdateElement}
                  onBeginElementEdit={beginElementEdit}
                  onCommitElementEdit={commitElementEdit}
                  onDeleteElement={handleDeleteElement}
                  onDuplicateElement={handleDuplicateElement}
                  onReorderElement={handleReorderElement}
                  onOpenAiEnhance={modals.openAiEnhance}
                  onEnhanceRegion={modals.openRegionEnhance}
                  onExtractRegion={handleExtractRegion}
                />

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
            onNewDesign={() => {
              resetHistory([]);
              setCurrentStep('select');
            }}
          />
        )}
      </main>

      {selectedJewelry && (
        <AiCreateModal
          isOpen={modals.isAiModalOpen}
          onClose={() => modals.setIsAiModalOpen(false)}
          jewelry={selectedJewelry}
          onSelectOption={handleSelectAiOption}
          refiningSvg={modals.refiningElement?.content}
        />
      )}

      {(modals.enhancingElement || modals.enhancingRegion) && (
        <AiEnhanceModal
          isOpen={modals.isEnhanceModalOpen}
          onClose={modals.closeEnhanceModal}
          label={
            modals.enhancingRegion
              ? 'selected canvas region'
              : modals.enhancingElement?.name ?? 'layer'
          }
          element={modals.enhancingElement ?? undefined}
          eraserLayers={
            modals.enhancingElement
              ? currentElements.filter(
                  (el) =>
                    el.type === 'eraser' &&
                    el.targetElementId === modals.enhancingElement!.id
                )
              : []
          }
          region={modals.enhancingRegion ?? undefined}
          canvasElements={currentElements}
          surfaceAspect={
            selectedJewelry
              ? getEngravingSurfaceAspect(selectedJewelry.constraints.shape)
              : 1
          }
          onApply={handleApplyEnhance}
        />
      )}

      <GiftQrModal
        isOpen={modals.isGiftQrModalOpen}
        onClose={() => modals.setIsGiftQrModalOpen(false)}
        onAddQrToCanvas={handleAddGiftQrToCanvas}
      />

      <ImageUploadModal
        isOpen={modals.isUploadModalOpen}
        onClose={() => modals.setIsUploadModalOpen(false)}
        onAddImageVector={(svgContent, name) => {
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

      <TextModal
        isOpen={modals.isTextModalOpen}
        onClose={() => modals.setIsTextModalOpen(false)}
        onAddText={handleAddTextFromModal}
      />
    </div>
  );
}

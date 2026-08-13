import { useState } from 'react';
import { CanvasElement, CanvasRegion } from '../types';

export function useStudioModals() {
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isEnhanceModalOpen, setIsEnhanceModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isGiftQrModalOpen, setIsGiftQrModalOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);

  const [refiningElement, setRefiningElement] = useState<CanvasElement | null>(null);
  const [enhancingElement, setEnhancingElement] = useState<CanvasElement | null>(null);
  const [enhancingRegion, setEnhancingRegion] = useState<CanvasRegion | null>(null);

  const openAiCreate = () => {
    setRefiningElement(null);
    setIsAiModalOpen(true);
  };

  const openAiRefine = (el: CanvasElement) => {
    setRefiningElement(el);
    setIsAiModalOpen(true);
  };

  const openAiEnhance = (el: CanvasElement) => {
    setEnhancingRegion(null);
    setEnhancingElement(el);
    setIsEnhanceModalOpen(true);
  };

  const openRegionEnhance = (region: CanvasRegion) => {
    setEnhancingElement(null);
    setEnhancingRegion(region);
    setIsEnhanceModalOpen(true);
  };

  const closeEnhanceModal = () => {
    setIsEnhanceModalOpen(false);
    setEnhancingElement(null);
    setEnhancingRegion(null);
  };

  return {
    isAiModalOpen,
    setIsAiModalOpen,
    isEnhanceModalOpen,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isGiftQrModalOpen,
    setIsGiftQrModalOpen,
    isTextModalOpen,
    setIsTextModalOpen,
    refiningElement,
    setRefiningElement,
    enhancingElement,
    enhancingRegion,
    openAiCreate,
    openAiRefine,
    openAiEnhance,
    openRegionEnhance,
    closeEnhanceModal,
  };
}

'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Settings,
  Factory,
  ArrowRight,
  Network,
  LayoutList,
  Layers,
  PackageSearch,
  Tag,
  AlignJustify,
  Pencil,
  Home,
  ShoppingBag,
  Box,
  Menu,
  MoreVertical,
  Plus,
  ChevronDown,
  FlaskConical,
  Pill,
  Shirt,
  Gem,
  Sparkles,
  Package,
  Sprout,
  Wrench,
  Type,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowTemplateModal } from './WorkflowTemplateModal';

type NavChild = { id: string; label: string; enabled: boolean };
type NavPrimary = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  expanded: boolean;
  children: NavChild[];
};
type StepTrigger = {
  type: 'unlocks' | 'unlocked_by';
  completion: string;
  targets: string[];
};
type ProductionStep = {
  id: string;
  label: string;
  enabled: boolean;
  triggers: StepTrigger[];
};

const STEP_COLORS = ['#0EA5E9', '#6366F1', '#22C55E', '#8B5CF6', '#F59E0B', '#EC4899'];

const INITIAL_WORKFLOW_NAME = 'Bottling';
const INITIAL_WORKFLOW_DESC = 'Liquid fill & seal operations';
const INITIAL_WORKFLOW_ACCENT = '#3B82F6';

const INITIAL_NAV_ITEMS: NavPrimary[] = [
  { id: 'home', label: 'Home', icon: Home, enabled: true, expanded: false, children: [] },
  {
    id: 'products', label: 'Products', icon: ShoppingBag, enabled: true, expanded: true,
    children: [
      { id: 'my-products', label: 'My Products', enabled: true },
      { id: 'new-prod-dev', label: 'New Prod. Development', enabled: true },
      { id: 'vine', label: 'Vine', enabled: true },
    ],
  },
  {
    id: 'supply-chain', label: 'Supply Chain', icon: Box, enabled: true, expanded: true,
    children: [
      { id: 'bottles', label: 'Bottles', enabled: true },
      { id: 'closures', label: 'Closures', enabled: true },
      { id: 'boxes', label: 'Boxes', enabled: true },
      { id: 'labels', label: 'Labels', enabled: true },
    ],
  },
  {
    id: 'production', label: 'Production', icon: Factory, enabled: true, expanded: false,
    children: [
      { id: 'shipments', label: 'Shipments', enabled: true },
      { id: 'manufacturing', label: 'Manufacturing', enabled: true },
      { id: 'forecast', label: 'Forecast', enabled: true },
    ],
  },
  { id: 'action-items', label: 'Action Items', icon: Box, enabled: true, expanded: false, children: [] },
];

const INITIAL_STEPS: ProductionStep[] = [
  {
    id: 'add-products', label: 'Add Products', enabled: true,
    triggers: [{ type: 'unlocks', completion: 'full completion', targets: ['Label Check', 'Formula Check'] }],
  },
  { id: 'label-check', label: 'Label Check', enabled: true, triggers: [] },
  { id: 'formula-check', label: 'Formula Check', enabled: true, triggers: [] },
  {
    id: 'book-shipment', label: 'Book Shipment', enabled: true,
    triggers: [
      { type: 'unlocked_by', completion: 'full completion', targets: ['Label Check', 'Formula Check'] },
      { type: 'unlocks', completion: 'full completion', targets: ['Sort Products', 'Sort Formulas'] },
    ],
  },
  { id: 'sort-products', label: 'Sort Products', enabled: true, triggers: [] },
  { id: 'sort-formulas', label: 'Sort Formulas', enabled: true, triggers: [] },
];

const INITIAL_SUPPLY_ITEMS: NavPrimary[] = [
  {
    id: 'sc-bottles', label: 'Bottles', icon: PackageSearch, enabled: true, expanded: true,
    children: [
      { id: 'sc-bottles-8oz', label: '8oz Glass Bottle', enabled: true },
      { id: 'sc-bottles-12oz', label: '12oz Glass Bottle', enabled: true },
      { id: 'sc-bottles-16oz', label: '16oz Plastic Bottle', enabled: true },
    ],
  },
  {
    id: 'sc-closures', label: 'Closures', icon: PackageSearch, enabled: true, expanded: false,
    children: [
      { id: 'sc-closures-cap', label: 'Screw Cap', enabled: true },
      { id: 'sc-closures-pump', label: 'Pump Dispenser', enabled: true },
    ],
  },
  {
    id: 'sc-boxes', label: 'Boxes', icon: Box, enabled: true, expanded: false,
    children: [
      { id: 'sc-boxes-small', label: 'Small Shipping Box', enabled: true },
      { id: 'sc-boxes-large', label: 'Large Shipping Box', enabled: true },
    ],
  },
  {
    id: 'sc-labels', label: 'Labels', icon: Tag, enabled: true, expanded: false,
    children: [
      { id: 'sc-labels-front', label: 'Front Label', enabled: true },
      { id: 'sc-labels-back', label: 'Back Label', enabled: true },
    ],
  },
];

const COMPLETION_OPTIONS = ['full completion', 'partial completion', 'any step'];

function SortableStepCard({
  step,
  index,
  onToggle,
  onAddTrigger,
  onRemoveTrigger,
  allStepLabels,
}: {
  step: ProductionStep;
  index: number;
  onToggle: (id: string) => void;
  onAddTrigger: (stepId: string, trigger: StepTrigger) => void;
  onRemoveTrigger: (stepId: string, triggerIndex: number) => void;
  allStepLabels: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'unlocks' | 'unlocked_by'>('unlocks');
  const [formCompletion, setFormCompletion] = useState('full completion');
  const [formTargets, setFormTargets] = useState<string[]>([]);
  const [showTargets, setShowTargets] = useState(false);

  const otherSteps = allStepLabels.filter(l => l !== step.label);

  const toggleTarget = (label: string) =>
    setFormTargets(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    );

  const handleAdd = () => {
    if (formTargets.length === 0) return;
    onAddTrigger(step.id, { type: formType, completion: formCompletion, targets: formTargets });
    setFormType('unlocks');
    setFormCompletion('full completion');
    setFormTargets([]);
    setShowTargets(false);
    setShowForm(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col rounded-xl border border-[#334155] bg-[#1A2235] px-4 py-3 gap-2"
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <Menu className="w-4 h-4 text-slate-500" />
        </button>
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
          style={{ backgroundColor: STEP_COLORS[index % STEP_COLORS.length] }}
        >
          {index + 1}
        </div>
        <span className="flex-1 font-semibold text-slate-100 text-sm">{step.label}</span>
        <button
          onClick={() => onToggle(step.id)}
          className={cn(
            'relative w-10 h-6 rounded-full transition-colors flex-shrink-0',
            step.enabled ? 'bg-[#3B82F6]' : 'bg-slate-600'
          )}
        >
          <span className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
            step.enabled ? 'left-5' : 'left-1'
          )} />
        </button>
        <MoreVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />
      </div>

      {/* Trigger pills + Add Trigger */}
      <div className="flex flex-col gap-2">
        {step.triggers.map((trigger, tIdx) => {
          const isUnlocks = trigger.type === 'unlocks';
          const targetsLabel = trigger.targets.join(', ');

          return (
            <div
              key={tIdx}
              className="inline-flex self-start items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#22C55E] bg-[#22C55E]/5 text-xs font-medium"
            >
              {/* Type label */}
              <span className="text-[#22C55E] font-semibold">
                {isUnlocks ? 'Unlocks' : 'Unlocked by'}
              </span>

              {/* Layout:
                  Unlocks:  Type • (completion) → Targets
                  Unlocked by: Type → Targets • (completion) */}
              {isUnlocks ? (
                <>
                  <span className="text-[#22C55E]">•</span>
                  <span className="text-[#22C55E]">({trigger.completion})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="font-medium text-slate-50">
                    {targetsLabel}
                  </span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="font-medium text-slate-50">
                    {targetsLabel}
                  </span>
                  <span className="text-[#22C55E]">•</span>
                  <span className="text-[#22C55E]">({trigger.completion})</span>
                </>
              )}

              <button
                onClick={() => onRemoveTrigger(step.id, tIdx)}
                className="ml-2 w-5 h-5 rounded-full bg-[#020617] flex items-center justify-center text-[11px] text-slate-100 hover:bg-slate-900 transition-colors"
              >
                ×
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setShowForm(v => !v)}
          className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Trigger
        </button>
      </div>

      {/* Inline Add Trigger form */}
      {showForm && (
        <div className="mt-1 flex flex-col gap-3">
          {/* Top row with dropdown chips + actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              {/* Type dropdown (always first) */}
              <div className="relative">
                <select
                  value={formType}
                  onChange={(e) =>
                    setFormType(e.target.value === 'unlocks' ? 'unlocks' : 'unlocked_by')
                  }
                  className="h-8 pl-4 pr-7 rounded-md bg-[#4B5563] border border-[#334155] text-sm text-[#C7C7CC] focus:outline-none focus:ring-0 appearance-none"
                >
                  <option value="unlocks">Unlocks</option>
                  <option value="unlocked_by">Unlocked by</option>
                </select>
                <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Order changes based on type:
                  - Unlocks:  Type • Targets • "upon" • Completion
                  - Unlocked by: Type • Completion • "of" • Targets */}
              {formType === 'unlocks' ? (
                <>
                  {/* Targets dropdown-style container */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTargets((v) => !v)}
                      className="h-8 min-w-0 px-4 rounded-md bg-[#4B5563] border border-[#334155] text-sm text-[#C7C7CC] flex items-center justify-between gap-2 hover:border-[#475569] transition-colors w-auto"
                    >
                      <span className="whitespace-nowrap">
                        {formTargets.length === 0 && 'Multiple Selected'}
                        {formTargets.length === 1 && formTargets[0]}
                        {formTargets.length > 1 && 'Multiple Selected'}
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 text-slate-400 transition-transform',
                          showTargets ? 'rotate-180' : ''
                        )}
                      />
                    </button>

                    {/* Target steps list as dropdown menu */}
                    {showTargets && (
                      <div className="absolute left-0 right-0 mt-1 rounded-lg bg-[#020617] border border-[#1F2937] shadow-lg z-20 max-h-48 overflow-y-auto">
                        {otherSteps.map((label) => (
                          <button
                            type="button"
                            key={label}
                            onClick={() => toggleTarget(label)}
                            className={cn(
                              'w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-[#111827] flex items-center gap-2',
                              formTargets.includes(label) && 'bg-[#111827]'
                            )}
                          >
                            <input
                              type="checkbox"
                              readOnly
                              checked={formTargets.includes(label)}
                              className="w-3.5 h-3.5 rounded accent-[#3B82F6]"
                            />
                            <span className="truncate">{label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-xs text-slate-400 whitespace-nowrap">upon</span>

                  {/* Completion dropdown */}
                  <div className="relative">
                    <select
                      value={formCompletion}
                      onChange={(e) => setFormCompletion(e.target.value)}
                      className="h-8 pl-4 pr-7 rounded-md bg-[#4B5563] border border-[#334155] text-sm text-[#C7C7CC] focus:outline-none focus:ring-0 appearance-none"
                    >
                      {COMPLETION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2" />
                  </div>
                </>
              ) : (
                <>
                  {/* Completion dropdown */}
                  <div className="relative">
                    <select
                      value={formCompletion}
                      onChange={(e) => setFormCompletion(e.target.value)}
                      className="h-8 pl-4 pr-7 rounded-md bg-[#4B5563] border border-[#334155] text-sm text-[#C7C7CC] focus:outline-none focus:ring-0 appearance-none"
                    >
                      {COMPLETION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <span className="text-xs text-slate-400 whitespace-nowrap">of</span>

                  {/* Targets dropdown-style container */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTargets((v) => !v)}
                      className="h-8 min-w-0 px-4 rounded-md bg-[#4B5563] border border-[#334155] text-sm text-[#C7C7CC] flex items-center justify-between gap-2 hover:border-[#475569] transition-colors w-auto"
                    >
                      <span className="whitespace-nowrap">
                        {formTargets.length === 0 && 'Multiple Selected'}
                        {formTargets.length === 1 && formTargets[0]}
                        {formTargets.length > 1 && 'Multiple Selected'}
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 text-slate-400 transition-transform',
                          showTargets ? 'rotate-180' : ''
                        )}
                      />
                    </button>

                    {/* Target steps list as dropdown menu */}
                    {showTargets && (
                      <div className="absolute left-0 right-0 mt-1 rounded-lg bg-[#020617] border border-[#1F2937] shadow-lg z-20 max-h-48 overflow-y-auto">
                        {otherSteps.map((label) => (
                          <button
                            type="button"
                            key={label}
                            onClick={() => toggleTarget(label)}
                            className={cn(
                              'w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-[#111827] flex items-center gap-2',
                              formTargets.includes(label) && 'bg-[#111827]'
                            )}
                          >
                            <input
                              type="checkbox"
                              readOnly
                              checked={formTargets.includes(label)}
                              className="w-3.5 h-3.5 rounded accent-[#3B82F6]"
                            />
                            <span className="truncate">{label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Cancel / Save */}
            <div className="flex items-center gap-1 ml-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setShowTargets(false);
                  setFormTargets([]);
                  setFormType('unlocks');
                  setFormCompletion('full completion');
                }}
                className="w-[64px] h-6 rounded-md text-xs font-medium text-slate-200 bg-[#252F42] border border-[#334155] flex items-center justify-center hover:bg-[#111827] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={formTargets.length === 0}
                className={cn(
                  'w-[52px] h-6 rounded-md text-xs font-semibold flex items-center justify-center transition-colors',
                  formTargets.length > 0
                    ? 'bg-[#007AFF] text-white hover:bg-[#1D4ED8]'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                )}
              >
                Save
              </button>
            </div>
          </div>

          {/* (Targets dropdown list now lives inside the targets container above) */}
        </div>
      )}
    </div>
  );
}

export type UnsavedInfo = {
  sections: { label: string; count: number }[];
  total: number;
  onSave: () => void;
  onCancel: () => void;
};

export function WorkflowOverview({
  onUnsavedChangesChange,
  searchQuery,
}: {
  onUnsavedChangesChange?: (info: UnsavedInfo | null) => void;
  searchQuery?: string;
}) {
  const [templateModalOpen, setTemplateModalOpen] = useState(true);

  const [sidebarNavItems, setSidebarNavItems] = useState<NavPrimary[]>(INITIAL_NAV_ITEMS);

  const toggleNavItem = (id: string) =>
    setSidebarNavItems(prev =>
      prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item)
    );
  const toggleNavExpand = (id: string) =>
    setSidebarNavItems(prev =>
      prev.map(item => item.id === id ? { ...item, expanded: !item.expanded } : item)
    );
  const toggleNavChild = (parentId: string, childId: string) =>
    setSidebarNavItems(prev =>
      prev.map(item =>
        item.id === parentId
          ? {
              ...item,
              children: item.children.map(c =>
                c.id === childId ? { ...c, enabled: !c.enabled } : c
              ),
            }
          : item
      )
    );
  const addNavSecondaryItem = (parentId: string) =>
    setSidebarNavItems(prev =>
      prev.map(item =>
        item.id === parentId
          ? {
              ...item,
              expanded: true,
              children: [
                ...item.children,
                {
                  id: `${parentId}-secondary-${item.children.length + 1}`,
                  label: `Secondary ${item.children.length + 1}`,
                  enabled: true,
                },
              ],
            }
          : item
      )
    );

  const [productionSteps, setProductionSteps] = useState<ProductionStep[]>(INITIAL_STEPS);

  const toggleProductionStep = (id: string) =>
    setProductionSteps(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));

  const addTrigger = (stepId: string, trigger: StepTrigger) =>
    setProductionSteps(prev =>
      prev.map(s => s.id === stepId ? { ...s, triggers: [...s.triggers, trigger] } : s)
    );

  const removeTrigger = (stepId: string, triggerIndex: number) =>
    setProductionSteps(prev =>
      prev.map(s =>
        s.id === stepId
          ? { ...s, triggers: s.triggers.filter((_, i) => i !== triggerIndex) }
          : s
      )
    );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleStepDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProductionSteps(prev => {
        const oldIndex = prev.findIndex(s => s.id === active.id);
        const newIndex = prev.findIndex(s => s.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const [supplyChainItems, setSupplyChainItems] = useState<NavPrimary[]>(INITIAL_SUPPLY_ITEMS);

  const toggleSupplyItem = (id: string) =>
    setSupplyChainItems(prev =>
      prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item)
    );
  const toggleSupplyExpand = (id: string) =>
    setSupplyChainItems(prev =>
      prev.map(item => item.id === id ? { ...item, expanded: !item.expanded } : item)
    );
  const toggleSupplyChild = (parentId: string, childId: string) =>
    setSupplyChainItems(prev =>
      prev.map(item =>
        item.id === parentId
          ? {
              ...item,
              children: item.children.map(c =>
                c.id === childId ? { ...c, enabled: !c.enabled } : c
              ),
            }
          : item
      )
    );
  const addSupplySecondaryItem = (parentId: string) =>
    setSupplyChainItems(prev =>
      prev.map(item =>
        item.id === parentId
          ? {
              ...item,
              expanded: true,
              children: [
                ...item.children,
                {
                  id: `${parentId}-secondary-${item.children.length + 1}`,
                  label: `Secondary ${item.children.length + 1}`,
                  enabled: true,
                },
              ],
            }
          : item
      )
    );

  const [workflowConfigTab, setWorkflowConfigTab] = useState<string | null>(null);
  const [workflowActiveTab, setWorkflowActiveTab] = useState('identity');
  const [workflowName, setWorkflowName] = useState(INITIAL_WORKFLOW_NAME);
  const [workflowDesc, setWorkflowDesc] = useState(INITIAL_WORKFLOW_DESC);
  const [workflowAccentColor, setWorkflowAccentColor] = useState(INITIAL_WORKFLOW_ACCENT);
  const [workflowIcon, setWorkflowIcon] = useState('flask');

  // Saved state snapshot for unsaved-changes tracking
  const savedStateRef = useRef({
    workflowName: INITIAL_WORKFLOW_NAME,
    workflowDesc: INITIAL_WORKFLOW_DESC,
    workflowAccentColor: INITIAL_WORKFLOW_ACCENT,
    workflowIcon: 'flask' as string,
    // Track both enabled state and triggers so changes to triggers count as unsaved
    productionSteps: INITIAL_STEPS.map(s => ({
      id: s.id,
      enabled: s.enabled,
      triggers: s.triggers,
    })),
    sidebarNavItems: INITIAL_NAV_ITEMS.map(i => ({
      id: i.id, enabled: i.enabled,
      children: i.children.map(c => ({ id: c.id, enabled: c.enabled })),
    })),
    supplyChainItems: INITIAL_SUPPLY_ITEMS.map(i => ({
      id: i.id, enabled: i.enabled,
      children: i.children.map(c => ({ id: c.id, enabled: c.enabled })),
    })),
    stepOrder: INITIAL_STEPS.map(s => s.id),
  });

  const unsavedChanges = useMemo(() => {
    const saved = savedStateRef.current;

    let identity = 0;
    if (workflowName !== saved.workflowName) identity++;
    if (workflowDesc !== saved.workflowDesc) identity++;
    if (workflowAccentColor !== saved.workflowAccentColor) identity++;
    if (workflowIcon !== saved.workflowIcon) identity++;

    let steps = 0;
    const currentOrder = productionSteps.map(s => s.id);
    currentOrder.forEach((id, i) => { if (saved.stepOrder[i] !== id) steps++; });
    productionSteps.forEach(step => {
      const savedStep = saved.productionSteps.find(s => s.id === step.id);
      if (!savedStep) {
        steps++;
        return;
      }
      if (savedStep.enabled !== step.enabled) steps++;
      // Count trigger changes (added, removed, or edited)
      const currentTriggers = step.triggers ?? [];
      const savedTriggers = savedStep.triggers ?? [];
      if (currentTriggers.length !== savedTriggers.length) {
        steps++;
      } else {
        currentTriggers.forEach((t, idx) => {
          const savedT = savedTriggers[idx];
          if (
            !savedT ||
            savedT.type !== t.type ||
            savedT.completion !== t.completion ||
            savedT.targets.join('|') !== t.targets.join('|')
          ) {
            steps++;
          }
        });
      }
    });

    let navigation = 0;
    sidebarNavItems.forEach(item => {
      const savedItem = saved.sidebarNavItems.find(i => i.id === item.id);
      if (!savedItem) {
        navigation++;
        return;
      }
      if (savedItem.enabled !== item.enabled) navigation++;

      // child diffs: toggled, added, or removed
      item.children.forEach(child => {
        const savedChild = savedItem.children.find(c => c.id === child.id);
        if (!savedChild || savedChild.enabled !== child.enabled) navigation++;
      });
      savedItem.children.forEach(savedChild => {
        const exists = item.children.some(c => c.id === savedChild.id);
        if (!exists) navigation++;
      });
    });

    let supply = 0;
    supplyChainItems.forEach(item => {
      const savedItem = saved.supplyChainItems.find(i => i.id === item.id);
      if (!savedItem) {
        supply++;
        return;
      }
      if (savedItem.enabled !== item.enabled) supply++;

      item.children.forEach(child => {
        const savedChild = savedItem.children.find(c => c.id === child.id);
        if (!savedChild || savedChild.enabled !== child.enabled) supply++;
      });
      savedItem.children.forEach(savedChild => {
        const exists = item.children.some(c => c.id === savedChild.id);
        if (!exists) supply++;
      });
    });

    const sections = [
      ...(identity > 0 ? [{ label: 'Workflow Identity', count: identity }] : []),
      ...(navigation > 0 ? [{ label: 'Sidebar Navigation', count: navigation }] : []),
      ...(steps > 0 ? [{ label: 'Production Steps', count: steps }] : []),
      ...(supply > 0 ? [{ label: 'Supply Chain', count: supply }] : []),
    ];
    const total = identity + steps + navigation + supply;
    return { sections, total };
  }, [workflowName, workflowDesc, workflowAccentColor, workflowIcon, productionSteps, sidebarNavItems, supplyChainItems]);

  const handleSaveChanges = () => {
    savedStateRef.current = {
      workflowName,
      workflowDesc,
      workflowAccentColor,
      workflowIcon,
      productionSteps: productionSteps.map(s => ({
        id: s.id,
        enabled: s.enabled,
        triggers: s.triggers,
      })),
      sidebarNavItems: sidebarNavItems.map(i => ({
        id: i.id, enabled: i.enabled,
        children: i.children.map(c => ({ id: c.id, enabled: c.enabled })),
      })),
      supplyChainItems: supplyChainItems.map(i => ({
        id: i.id, enabled: i.enabled,
        children: i.children.map(c => ({ id: c.id, enabled: c.enabled })),
      })),
      stepOrder: productionSteps.map(s => s.id),
    };
    // force re-render by triggering a benign state update
    setWorkflowName(w => w);
  };

  const handleCancelChanges = () => {
    const saved = savedStateRef.current;
    setWorkflowName(saved.workflowName);
    setWorkflowDesc(saved.workflowDesc);
    setWorkflowAccentColor(saved.workflowAccentColor);
    setWorkflowIcon(saved.workflowIcon);
    setProductionSteps(prev => {
      const reordered = saved.stepOrder
        .map(id => prev.find(s => s.id === id))
        .filter(Boolean) as ProductionStep[];
      return reordered.map(step => {
        const savedStep = saved.productionSteps.find(s => s.id === step.id);
        return savedStep
          ? { ...step, enabled: savedStep.enabled, triggers: savedStep.triggers ?? [] }
          : step;
      });
    });
    setSidebarNavItems(prev => prev.map(item => {
      const savedItem = saved.sidebarNavItems.find(i => i.id === item.id);
      if (!savedItem) return item;
      return {
        ...item,
        enabled: savedItem.enabled,
        children: item.children.map(child => {
          const savedChild = savedItem.children.find(c => c.id === child.id);
          return savedChild ? { ...child, enabled: savedChild.enabled } : child;
        }),
      };
    }));
    setSupplyChainItems(prev => prev.map(item => {
      const savedItem = saved.supplyChainItems.find(i => i.id === item.id);
      if (!savedItem) return item;
      return {
        ...item,
        enabled: savedItem.enabled,
        children: item.children.map(child => {
          const savedChild = savedItem.children.find(c => c.id === child.id);
          return savedChild ? { ...child, enabled: savedChild.enabled } : child;
        }),
      };
    }));
  };

  // Notify parent whenever unsaved changes state changes
  useEffect(() => {
    if (!onUnsavedChangesChange) return;
    if (unsavedChanges.total === 0) {
      onUnsavedChangesChange(null);
    } else {
      onUnsavedChangesChange({
        sections: unsavedChanges.sections,
        total: unsavedChanges.total,
        onSave: handleSaveChanges,
        onCancel: handleCancelChanges,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unsavedChanges.total, unsavedChanges.sections]);

  const handleTemplateSelect = (
    _templateId: string,
    template: { name: string; description: string },
  ) => {
    setWorkflowName(template.name);
    setWorkflowDesc(template.description);
    // Collapse all primary navigation rows so the view starts in a compact state
    setSidebarNavItems(prev =>
      prev.map(item => ({
        ...item,
        expanded: false,
      }))
    );
    // Also collapse supply chain groups for consistency
    setSupplyChainItems(prev =>
      prev.map(item => ({
        ...item,
        expanded: false,
      }))
    );
    setTemplateModalOpen(false);
    // Jump straight into Sidebar Navigation configuration after choosing a template
    setWorkflowConfigTab('navigation');
    setWorkflowActiveTab('navigation');
  };

  const WORKFLOW_ROWS = [
    { id: 'identity',   icon: Type,          label: 'Workflow Identity',   sub: 'Name, icon, color' },
    { id: 'navigation', icon: LayoutList,     label: 'Sidebar Navigation',  sub: '5 primary  •  7 secondary' },
    { id: 'steps',      icon: Box,            label: 'Production Steps',    sub: '6 steps  •  3 active triggers' },
    { id: 'supply',     icon: PackageSearch,  label: 'Supply Chain',        sub: '4 materials tracked' },
  ];

  const CONFIG_TABS = [
    { id: 'identity',   icon: Type,          label: 'Workflow Identity' },
    { id: 'navigation', icon: AlignJustify,  label: 'Sidebar Navigation' },
    { id: 'steps',      icon: Box,            label: 'Production Steps' },
    { id: 'supply',     icon: PackageSearch, label: 'Supply Chain' },
  ];

  const ACCENT_COLORS = [
    '#3B82F6', '#22C55E', '#F59E0B', '#EF4444',
    '#8B5CF6', '#F472B6', '#38BDF8', '#D946EF',
    '#F97316', '#14B8A6',
  ];

  const WORKFLOW_ICONS = [
    { id: 'flask', Icon: FlaskConical },
    { id: 'capsule', Icon: Pill },
    { id: 'shirt', Icon: Shirt },
    { id: 'ring', Icon: Gem },
    { id: 'lipstick', Icon: Sparkles },
    { id: 'can', Icon: Package },
    { id: 'sprout', Icon: Sprout },
    { id: 'tools', Icon: Wrench },
    { id: 'factory', Icon: Factory },
  ] as const;

  // ── Configure detail view ──────────────────────────────────────────
  if (workflowConfigTab !== null) {
    return (
      <div className="flex flex-col h-full min-h-0 relative">
        <WorkflowTemplateModal
          isOpen={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          onSelectTemplate={handleTemplateSelect}
        />
        {/* Sticky header + tabs */}
        <div className="sticky top-0 z-10 pb-3 bg-[#0B111E]">
          <div>
            <h2 className="text-xl font-semibold text-foreground-primary">
              Workflow Configuration –{' '}
              <span className="font-bold text-slate-50">Bottling</span>
            </h2>
            <p className="text-sm text-foreground-secondary mt-0.5">
              Configure navigation, production steps, raw materials, and behavior per workflow.
            </p>
          </div>

          {/* Tab bar */}
          <div className="mt-4 flex border-b border-[#334155]">
            {CONFIG_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setWorkflowActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  workflowActiveTab === tab.id
                    ? 'border-[#3B82F6] text-[#60A5FA]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content below sticky header */}
        <div
          className="flex-1 min-h-0 mt-4 space-y-5 overflow-y-auto pr-2"
          style={{ scrollbarGutter: 'stable' }}
        >
          {/* Workflow Identity content */}
          {workflowActiveTab === 'identity' && (
            <div className="space-y-4">
            {/* Selected workflow card */}
            <div
              className="flex items-center justify-between rounded-lg border border-[#007AFF] bg-[#0F172A] px-4 py-3"
              style={{ minHeight: 60 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#1D4ED8]/30 border border-[#007AFF]/40 flex items-center justify-center">
                  {(() => {
                    const { Icon } = WORKFLOW_ICONS.find(w => w.id === workflowIcon) ?? WORKFLOW_ICONS[0];
                    return <Icon className="w-4 h-4 text-[#60A5FA]" />;
                  })()}
                </div>
                <div>
                  <p className="font-semibold text-slate-50">{workflowName}</p>
                  <p className="text-xs text-slate-400">{workflowDesc}</p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-[#3B82F6] flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
              </div>
            </div>

            {/* Name & Description */}
            <div className="rounded-xl bg-[#1A2235] border border-[#334155] p-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name &amp; Description</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Workflow Name<span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#4B5563] border border-[#334155] text-slate-100 text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Description<span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={workflowDesc}
                    onChange={(e) => setWorkflowDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#4B5563] border border-[#334155] text-slate-100 text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Workflow Icon */}
            <div className="rounded-xl bg-[#1A2235] border border-[#334155] p-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workflow Icon</p>
              <div className="flex flex-wrap gap-3">
                {WORKFLOW_ICONS.map(({ id, Icon }) => {
                  const isSelected = workflowIcon === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setWorkflowIcon(id)}
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                        isSelected
                          ? 'border-2 border-[#60A5FA] bg-[#1E3A5F]/40 text-[#60A5FA]'
                          : 'border border-[#334155] bg-[#0F172A] text-slate-400 hover:border-[#475569] hover:text-slate-300'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Color */}
            <div className="rounded-xl bg-[#1A2235] border border-[#334155] p-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accent Color</p>
              <div className="flex items-center gap-4">
                {ACCENT_COLORS.map((color) => {
                  const isActive = workflowAccentColor === color;
                  return (
                    <button
                      key={color}
                      onClick={() => setWorkflowAccentColor(color)}
                      className="transition-all"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: color,
                        border: isActive ? '2.5px solid #FFFFFF' : '2.5px solid transparent',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          )}

          {/* Sidebar Navigation tab */}
          {workflowActiveTab === 'navigation' && (
            <div className="space-y-3">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children.length > 0;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#334155] bg-[#1A2235] overflow-hidden"
                >
                  {/* Primary row (entire row clickable to expand/collapse) */}
                  <button
                    type="button"
                    onClick={() => hasChildren && toggleNavExpand(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 min-h-[52px] border-b border-[#334155] text-left"
                  >
                    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="flex-1 font-semibold text-slate-100 text-sm">{item.label}</span>
                    <MoreVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addNavSecondaryItem(item.id);
                        }}
                        className="flex items-center gap-1 text-xs text-[#3B82F6] hover:text-blue-300 transition-colors ml-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Secondary Item
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNavItem(item.id);
                      }}
                      className={cn(
                        'relative w-10 h-6 rounded-full transition-colors flex-shrink-0',
                        item.enabled ? 'bg-[#3B82F6]' : 'bg-slate-600'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
                          item.enabled ? 'left-5' : 'left-1'
                        )}
                      />
                    </button>
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNavExpand(item.id);
                        }}
                      >
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 text-slate-400 transition-transform',
                            item.expanded ? '' : '-rotate-90'
                          )}
                        />
                      </button>
                    )}
                  </button>

                  {/* Children */}
                  {hasChildren && item.expanded && (
                    <div className="px-3 py-3 space-y-2 bg-[#0F172A]">
                      {item.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-3 px-4 h-9 rounded-xl bg-[#1A2235] border border-[#334155]"
                        >
                          <span className="text-slate-500 text-sm">•</span>
                          <input
                            value={child.label}
                            onChange={(e) => {
                              const next = e.target.value;
                              setSidebarNavItems(prev =>
                                prev.map(navItem =>
                                  navItem.id === item.id
                                    ? {
                                        ...navItem,
                                        children: navItem.children.map(c =>
                                          c.id === child.id ? { ...c, label: next } : c
                                        ),
                                      }
                                    : navItem
                                )
                              );
                            }}
                            className="flex-1 bg-transparent border-none text-sm text-slate-300 focus:outline-none focus:ring-0"
                          />
                          <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                          <button className="text-slate-400 hover:text-slate-200 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleNavChild(item.id, child.id)}
                            className={cn(
                              'relative w-10 h-6 rounded-full transition-colors flex-shrink-0',
                              child.enabled ? 'bg-[#3B82F6]' : 'bg-slate-600'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
                                child.enabled ? 'left-5' : 'left-1'
                              )}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}

          {/* Production Steps tab */}
          {workflowActiveTab === 'steps' && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleStepDragEnd}
            >
              <SortableContext
                items={productionSteps.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {productionSteps
                    .filter(step =>
                      searchQuery && searchQuery.trim()
                        ? step.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
                        : true
                    )
                    .map((step, index) => (
                      <SortableStepCard
                        key={step.id}
                        step={step}
                        index={index}
                        onToggle={toggleProductionStep}
                        onAddTrigger={addTrigger}
                        onRemoveTrigger={removeTrigger}
                        allStepLabels={productionSteps.map(s => s.label)}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Supply Chain tab */}
          {workflowActiveTab === 'supply' && (
            <div className="space-y-3">
            {supplyChainItems.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children.length > 0;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#334155] bg-[#1A2235] overflow-hidden"
                >
                  {/* Primary row (entire row clickable to expand/collapse) */}
                  <button
                    type="button"
                    onClick={() => hasChildren && toggleSupplyExpand(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 min-h-[52px] border-b border-[#334155] text-left"
                  >
                    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="flex-1 font-semibold text-slate-100 text-sm">{item.label}</span>
                    <MoreVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addSupplySecondaryItem(item.id);
                        }}
                        className="flex items-center gap-1 text-xs text-[#3B82F6] hover:text-blue-300 transition-colors ml-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Secondary Item
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSupplyItem(item.id);
                      }}
                      className={cn(
                        'relative w-10 h-6 rounded-full transition-colors flex-shrink-0',
                        item.enabled ? 'bg-[#3B82F6]' : 'bg-slate-600'
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
                        item.enabled ? 'left-5' : 'left-1'
                      )} />
                    </button>
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSupplyExpand(item.id);
                        }}
                      >
                        <ChevronDown className={cn(
                          'w-4 h-4 text-slate-400 transition-transform',
                          item.expanded ? '' : '-rotate-90'
                        )} />
                      </button>
                    )}
                  </button>

                  {/* Children */}
                  {hasChildren && item.expanded && (
                    <div className="px-3 py-3 space-y-2 bg-[#0F172A]">
                      {item.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-3 px-4 h-9 rounded-xl bg-[#1A2235] border border-[#334155]"
                        >
                          <span className="text-slate-500 text-sm">•</span>
                          <input
                            value={child.label}
                            onChange={(e) => {
                              const next = e.target.value;
                              setSupplyChainItems(prev =>
                                prev.map(scItem =>
                                  scItem.id === item.id
                                    ? {
                                        ...scItem,
                                        children: scItem.children.map(c =>
                                          c.id === child.id ? { ...c, label: next } : c
                                        ),
                                      }
                                    : scItem
                                )
                              );
                            }}
                            className="flex-1 bg-transparent border-none text-sm text-slate-300 focus:outline-none focus:ring-0"
                          />
                          <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                          <button className="text-slate-400 hover:text-slate-200 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleSupplyChild(item.id, child.id)}
                            className={cn(
                              'relative w-10 h-6 rounded-full transition-colors flex-shrink-0',
                              child.enabled ? 'bg-[#3B82F6]' : 'bg-slate-600'
                            )}
                          >
                            <span className={cn(
                              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
                              child.enabled ? 'left-5' : 'left-1'
                            )} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}

          {/* Other tabs placeholder */}
          {workflowActiveTab !== 'identity' &&
            workflowActiveTab !== 'navigation' &&
            workflowActiveTab !== 'steps' &&
            workflowActiveTab !== 'supply' && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Settings className="w-12 h-12 text-foreground-muted mb-4" />
                <h3 className="text-lg font-medium text-foreground-primary">Coming Soon</h3>
                <p className="text-foreground-secondary mt-1">This section is under development</p>
              </div>
            )}
        </div>
      </div>
    );
  }

  // ── Overview ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4 relative">
      <WorkflowTemplateModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSelectTemplate={handleTemplateSelect}
      />
      <div>
        <h2 className="text-xl font-semibold text-foreground-primary">Workflow Overview</h2>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Configure navigation, production steps, raw materials, and behavior per workflow.
        </p>
      </div>

      <div
        className="rounded-xl bg-[#1A2235] overflow-hidden flex flex-col gap-4 p-4"
        style={{ borderLeft: '4px solid #007AFF' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-50">{workflowName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{workflowDesc}</p>
          </div>
          <span className="px-2.5 py-1 text-xs font-bold tracking-widest rounded bg-[#1D4ED8] text-white uppercase">
            Current
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {WORKFLOW_ROWS.map((row) => (
            <button
              key={row.label}
              onClick={() => {
                setWorkflowConfigTab(row.id);
                setWorkflowActiveTab(row.id);
              }}
              className="w-full flex items-center justify-between text-left rounded-lg bg-[#0F172A] border border-[#334155] px-4 py-3 hover:brightness-110 transition-all"
              style={{ minHeight: 58 }}
            >
              <div className="flex items-center gap-3">
                <row.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-100">{row.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{row.sub}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                Configure
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

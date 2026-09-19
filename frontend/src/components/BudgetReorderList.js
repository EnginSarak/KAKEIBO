import React, { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { BudgetCard } from "./BudgetCard";

const LONG_PRESS_MS = 280;
const MOVE_CANCEL_PX = 8;

function BudgetReorderItem({ budget, isEditMode, onOpen, onRedistribute, onDragActivate, onDragCommit }) {
  const controls = useDragControls();
  const timerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const justDraggedRef = useRef(false);
  const itemRef = useRef(null);
  const [active, setActive] = useState(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  useEffect(() => {
    const el = itemRef.current;
    if (!el) return undefined;
    const onTouchMove = (e) => {
      if (draggingRef.current) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const handlePointerDown = (e) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      draggingRef.current = true;
      setActive(true);
      onDragActivate?.();
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
      controls.start(e);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e) => {
    if (draggingRef.current) return;
    if (Math.abs(e.clientX - startRef.current.x) > MOVE_CANCEL_PX ||
        Math.abs(e.clientY - startRef.current.y) > MOVE_CANCEL_PX) {
      clearTimer();
    }
  };

  const handlePointerUp = () => clearTimer();

  const handleDragEnd = () => {
    draggingRef.current = false;
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 300);
    setActive(false);
    onDragCommit?.();
  };

  const handleOpen = () => {
    if (justDraggedRef.current || active) return;
    onOpen?.(budget);
  };

  return (
    <Reorder.Item
      ref={itemRef}
      value={budget}
      dragListener={false}
      dragControls={controls}
      onDragEnd={handleDragEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      whileDrag={{ scale: 1.04, zIndex: 30, boxShadow: "0 14px 34px rgba(6,40,29,0.22)" }}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        touchAction: active ? "none" : "pan-y",
        borderRadius: 12,
      }}
      className="select-none"
    >
      <BudgetCard budget={budget} onClick={handleOpen} onRedistribute={onRedistribute} isEditMode={isEditMode} />
    </Reorder.Item>
  );
}

export function BudgetReorderList({ budgets, isEditMode, onOpen, onRedistribute, onReorderCommit }) {
  const [items, setItems] = useState(budgets);
  const draggingRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!draggingRef.current) setItems(budgets);
  }, [budgets]);

  const commit = () => {
    draggingRef.current = false;
    onReorderCommit?.(itemsRef.current.map((b) => b.id));
  };

  return (
    <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
      {items.map((budget) => (
        <BudgetReorderItem
          key={budget.id}
          budget={budget}
          isEditMode={isEditMode}
          onOpen={onOpen}
          onRedistribute={onRedistribute}
          onDragActivate={() => { draggingRef.current = true; }}
          onDragCommit={commit}
        />
      ))}
    </Reorder.Group>
  );
}

export default BudgetReorderList;

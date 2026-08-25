"use client"

import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
} from "@xyflow/react";
import { Trash2 } from "lucide-react";

interface DeletableEdgeProps extends EdgeProps {
  /** 删除该连线时回调（传边 id） */
  onDelete?: (id: string) => void;
}

/**
 * 可选中删除的连线：选中后在中点下方显示红色删除按钮，点击即可删除。
 * label（是/否）渲染交给 BaseEdge，与内置边外观完全一致。
 */
export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  selected,
  onDelete,
}: DeletableEdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // 有标签时，删除按钮下移到标签下方，避免重叠
  const deleteBtnY = label ? labelY + 26 : labelY;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        labelX={labelX}
        labelY={labelY}
        label={label}
        labelStyle={labelStyle}
        labelBgStyle={labelBgStyle}
        labelBgPadding={labelBgPadding}
        labelBgBorderRadius={labelBgBorderRadius}
        style={style}
        markerEnd={markerEnd}
      />
      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            title="删除这条连线"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${deleteBtnY}px)`,
            }}
            className="nodrag nopan pointer-events-auto absolute z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110 hover:bg-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

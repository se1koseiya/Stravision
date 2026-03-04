
import { Node } from '@xyflow/react';

export type AutomationNodeType = 'trigger' | 'logic' | 'action';

export interface AutomationNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: Record<string, any>;
  status?: 'idle' | 'running' | 'completed' | 'error';
}

export type AutomationNode = Node<AutomationNodeData>;

export const NODE_TYPES = {
  TRIGGER: 'triggerNode',
  LOGIC: 'logicNode',
  ACTION: 'actionNode',
  AI: 'aiNode',
} as const;

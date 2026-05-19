'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface FlowNode {
  id: string;
  name: string;
  type: 'start' | 'agent' | 'decision' | 'end';
  status: 'pending' | 'active' | 'completed' | 'failed';
  x: number;
  y: number;
  connections: string[];
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  active: boolean;
}

export function AgentFlowDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: 'start', name: '开始', type: 'start', status: 'completed', x: 100, y: 50, connections: ['agent1'] },
    { id: 'agent1', name: '任务分析', type: 'agent', status: 'completed', x: 100, y: 150, connections: ['decision1'] },
    { id: 'decision1', name: '需要执行?', type: 'decision', status: 'active', x: 100, y: 250, connections: ['agent2', 'agent3'] },
    { id: 'agent2', name: '执行操作', type: 'agent', status: 'pending', x: 50, y: 350, connections: ['agent4'] },
    { id: 'agent3', name: '跳过执行', type: 'agent', status: 'pending', x: 150, y: 350, connections: ['agent4'] },
    { id: 'agent4', name: '结果验证', type: 'agent', status: 'pending', x: 100, y: 450, connections: ['end'] },
    { id: 'end', name: '结束', type: 'end', status: 'pending', x: 100, y: 550, connections: [] },
  ]);

  const [edges, setEdges] = useState<FlowEdge[]>([]);

  useEffect(() => {
    // 生成边
    const newEdges: FlowEdge[] = [];
    nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = nodes.find(n => n.id === targetId);
        if (target) {
          newEdges.push({
            from: node.id,
            to: targetId,
            active: node.status === 'completed' || node.status === 'active',
          });
        }
      });
    });
    setEdges(newEdges);
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制边
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      if (!fromNode || !toNode) return;

      ctx.beginPath();
      ctx.moveTo(fromNode.x + 60, fromNode.y + 40);
      ctx.lineTo(toNode.x + 60, toNode.y);
      
      if (edge.active) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
      }
      
      ctx.stroke();

      // 绘制箭头
      const angle = Math.atan2(toNode.y - fromNode.y - 40, toNode.x - fromNode.x);
      const arrowSize = 8;
      
      ctx.beginPath();
      ctx.moveTo(toNode.x + 60, toNode.y);
      ctx.lineTo(
        toNode.x + 60 - arrowSize * Math.cos(angle - Math.PI / 6),
        toNode.y - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        toNode.x + 60 - arrowSize * Math.cos(angle + Math.PI / 6),
        toNode.y - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = edge.active ? '#3b82f6' : '#e5e7eb';
      ctx.fill();
    });
  }, [nodes, edges]);

  const getNodeColor = (status: FlowNode['status']) => {
    switch (status) {
      case 'pending': return 'bg-muted border-border';
      case 'active': return 'bg-blue-100 border-blue-500 ring-2 ring-blue-200';
      case 'completed': return 'bg-green-100 border-green-500';
      case 'failed': return 'bg-red-100 border-red-500';
    }
  };

  const getNodeShape = (type: FlowNode['type']) => {
    switch (type) {
      case 'start':
      case 'end':
        return 'rounded-full';
      case 'decision':
        return 'rotate-45';
      case 'agent':
      default:
        return 'rounded-lg';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">执行流程图</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height: '600px' }}>
          {/* Canvas for edges */}
          <canvas
            ref={canvasRef}
            width={300}
            height={600}
            className="absolute inset-0"
          />
          
          {/* Nodes */}
          {nodes.map(node => (
            <motion.div
              key={node.id}
              className={`absolute ${getNodeColor(node.status)} border-2 p-3 ${getNodeShape(node.type)} ${
                node.type === 'decision' ? 'w-24 h-24 flex items-center justify-center' : 'w-32'
              }`}
              style={{
                left: node.x,
                top: node.y,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className={node.type === 'decision' ? '-rotate-45' : ''}>
                <p className="text-xs font-medium text-center">{node.name}</p>
                {node.status === 'active' && (
                  <div className="flex justify-center mt-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

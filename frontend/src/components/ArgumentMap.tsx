import React, { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { AnalysisItem } from '../types/analysis';

// 解析时间字符串为秒数
function parseTime(fs: string): number {
  const parts = fs.replace('[', '').replace(']', '').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

interface ArgumentMapProps {
  analysis: AnalysisItem[];
  currentTime: number;
  onNodeSelect?: (analysisId: string) => void;
  selectedId?: string;
}

interface ArgumentNode extends d3.SimulationNodeDatum {
  id: string;
  content: string;
  speaker: string;
  technique: string;
  summary: string;
  side: 'left' | 'right';
  pros_gain: number;
  cons_gain: number;
  global_fs: string;
  strength: number;
  value: number;
  children: string[];
  parents: string[];
  level: number;
  parent: any;
  isAnchor?: boolean;
  target?: string;
}

const ArgumentMap: React.FC<ArgumentMapProps> = ({ 
  analysis, 
  currentTime, 
  onNodeSelect,
  selectedId 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // 过滤当前时间可见的分析
  const visibleAnalysis = useMemo(() => {
    return analysis.filter(item => parseTime(item.global_fs) <= currentTime);
  }, [analysis, currentTime]);

  // 检查数据是否真正改变
  const prevVisibleAnalysisRef = useRef<AnalysisItem[]>([]);
  const hasDataChanged = useMemo(() => {
    const prev = prevVisibleAnalysisRef.current;
    const current = visibleAnalysis;
    
    if (prev.length !== current.length) {
      prevVisibleAnalysisRef.current = current;
      return true;
    }
    
    // 检查每个节点的关键属性是否改变
    for (let i = 0; i < current.length; i++) {
      const prevItem = prev[i];
      const currentItem = current[i];
      
      if (!prevItem || 
          prevItem.analysis_id !== currentItem.analysis_id ||
          prevItem.summary !== currentItem.summary ||
          prevItem.target !== currentItem.target ||
          prevItem.base !== currentItem.base) {
        prevVisibleAnalysisRef.current = current;
        return true;
      }
    }
    
    return false;
  }, [visibleAnalysis]);

  // 构建论证地图数据
  const argumentData = useMemo(() => {
    if (!visibleAnalysis.length) return { nodes: [], links: [] };

    const nodes: ArgumentNode[] = [];
    const links: { source: string; target: string; type: 'attack' | 'support' | 'anchor-connection' }[] = [];
    const nodeMap = new Map<string, ArgumentNode>();

    // 获取阵营
    const getSide = (speaker: string) => {
      return speaker.includes('正方') ? 'left' : 'right';
    };

    // 递归加分函数
    const addScore = (node: any, delta: number) => {
      node.value = Math.max(0, Math.min(100, node.value + delta));
      if (node.parent) addScore(node.parent, delta*0.8);
    };

          // 添加锚点节点
    const leftAnchor: ArgumentNode = {
      id: 'anchor-left',
      content: '正方',
      speaker: '正方',
      technique: '锚点',
      summary: '正方',
      side: 'left',
      pros_gain: 0,
      cons_gain: 0,
      global_fs: '[00:00:00]',
      strength: 50,
      value: 50,
      children: [],
      parents: [],
      level: 0,
      parent: null,
      isAnchor: true
    };
    const rightAnchor: ArgumentNode = {
      id: 'anchor-right',
      content: '反方',
      speaker: '反方',
      technique: '锚点',
      summary: '反方',
      side: 'right',
      pros_gain: 0,
      cons_gain: 0,
      global_fs: '[00:00:00]',
      strength: 50,
      value: 50,
      children: [],
      parents: [],
      level: 0,
      parent: null,
      isAnchor: true
    };

    nodes.push(leftAnchor, rightAnchor);
    nodeMap.set('anchor-left', leftAnchor);
    nodeMap.set('anchor-right', rightAnchor);

    // 创建节点
    visibleAnalysis.forEach(item => {
      const node: ArgumentNode = {
        id: String(item.analysis_id),
        content: item.content,
        speaker: item.speaker,
        technique: item.technique || '论证',
        summary: item.summary || '论证',
        side: getSide(item.speaker),
        pros_gain: Number(item.pros_gain) || 0,
        cons_gain: Number(item.cons_gain) || 0,
        global_fs: item.global_fs,
        strength: 50, // 初始分数
        value: 50, // 初始分数
        children: [],
        parents: [],
        level: 0,
        parent: null,
        isAnchor: false,
        target: item.target ? String(item.target) : undefined
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // 建立父子关系 - 基于target和base中与当前节点同持方的节点
    visibleAnalysis.forEach(item => {
      const node = nodeMap.get(String(item.analysis_id));
      if (!node) return;
      
      let parent = null;
      
      // 检查target是否与当前节点同持方
      if (item.target && nodeMap.has(String(item.target))) {
        const targetNode = nodeMap.get(String(item.target));
        if (targetNode && targetNode.side === node.side) {
          parent = targetNode;
        }
      }
      
      // 检查base是否与当前节点同持方（如果target不是parent）
      if (!parent && item.base && nodeMap.has(String(item.base))) {
        const baseNode = nodeMap.get(String(item.base));
        if (baseNode && baseNode.side === node.side) {
          parent = baseNode;
        }
      }
      
      // 建立父子关系
      if (parent) {
        node.parent = parent;
        parent.children.push(String(item.analysis_id));
        node.parents.push(parent.id);
      }
    });

    // 应用评分逻辑
    visibleAnalysis.forEach(item => {
      const pros = Number(item.pros_gain) || 0;
      const cons = Number(item.cons_gain) || 0;
      const isLeft = item.speaker && item.speaker.includes('正方');
      const isRight = item.speaker && item.speaker.includes('反方');
      let addPros = true;
      let addCons = true;

      // 首先给节点自身加分
      if (isLeft) {
        const node = nodeMap.get(String(item.analysis_id));
        if (node) {
          node.value = Math.max(0, Math.min(100, node.value + pros));
        }
      } else if (isRight) {
        const node = nodeMap.get(String(item.analysis_id));
        if (node) {
          node.value = Math.max(0, Math.min(100, node.value + cons));
        }
      }

      if (item.target && nodeMap.has(String(item.target))){
        if (nodeMap.get(String(item.target))?.side === 'right'){
          addScore(nodeMap.get(String(item.target)), cons);
          addCons = false;
        }else{
          addScore(nodeMap.get(String(item.target)), pros);
          addPros = false;
        }
      }

      if (item.base && nodeMap.has(String(item.base))){ 
        if (nodeMap.get(String(item.base))?.side === 'right'){
          addScore(nodeMap.get(String(item.base)), cons);
          addCons = false;
        }else{
          addScore(nodeMap.get(String(item.base)), pros);
          addPros = false;
        }
      }

      if (addPros){
        Array.from(nodeMap.values()).forEach(n => {
          // 只对当前节点之前的节点加分（按analysis_id排序）
          if (n.side === 'left' && !n.isAnchor && n.id !== String(item.analysis_id) && Number(n.id) < Number(item.analysis_id)) {
            n.value = Math.max(0, Math.min(100, n.value + pros * 0.6));
          }
        });
      }

      if (addCons){
        Array.from(nodeMap.values()).forEach(n => {
          // 只对当前节点之前的节点加分（按analysis_id排序）
          if (n.side === 'right' && !n.isAnchor && n.id !== String(item.analysis_id) && Number(n.id) < Number(item.analysis_id)) {
            n.value = Math.max(0, Math.min(100, n.value + cons * 0.6));
          }
        });
      }
    });

    // 计算锚点分数 - 为己方可见节点的平均值
    const leftNodes = Array.from(nodeMap.values()).filter(n => n.side === 'left' && !n.isAnchor);
    const rightNodes = Array.from(nodeMap.values()).filter(n => n.side === 'right' && !n.isAnchor);
    
    if (leftNodes.length > 0) {
      const leftAvg = leftNodes.reduce((sum, n) => sum + n.value, 0) / leftNodes.length;
      leftAnchor.value = Math.round(leftAvg);
      leftAnchor.strength = Math.round(leftAvg);
    }
    
    if (rightNodes.length > 0) {
      const rightAvg = rightNodes.reduce((sum, n) => sum + n.value, 0) / rightNodes.length;
      rightAnchor.value = Math.round(rightAvg);
      rightAnchor.strength = Math.round(rightAvg);
    }

    // 建立连接关系
    nodes.forEach(node => {
      if (node.isAnchor) return; // 跳过锚点
      
      // 检查target关系
      if (node.target && nodeMap.has(node.target) && node.target !== node.id) {
        const targetNode = nodeMap.get(node.target);
        if (targetNode) {
          if (targetNode.side === node.side) {
            // 己方节点：从target指向当前节点，绿色
            links.push({
              source: node.target,
              target: node.id,
              type: 'support'
            });
          } else {
            // 对方节点：从当前节点指向target，红色
            links.push({
              source: node.id,
              target: node.target,
              type: 'attack'
            });
          }
        }
      }
      
      // 检查base关系
      if (node.parent) {
        if (node.parent.side === node.side) {
          // 己方节点：从parent指向当前节点，绿色
          links.push({
            source: node.parent.id,
            target: node.id,
            type: 'support'
          });
        } else {
          // 对方节点：从当前节点指向parent，红色
          links.push({
            source: node.id,
            target: node.parent.id,
            type: 'attack'
          });
        }
      }
      
      // 如果既没有target也没有parent，连接到己方锚点
      if (!node.target && !node.parent) {
        const anchorId = node.side === 'left' ? 'anchor-left' : 'anchor-right';
        links.push({
          source: anchorId,
          target: node.id,
          type: 'support'
        });
      }
    });

    // 添加锚点之间的紫色连接线
    links.push({
      source: 'anchor-left',
      target: 'anchor-right',
      type: 'anchor-connection'
    });

    // 计算层级
    const calculateLevels = () => {
      const visited = new Set<string>();
      const queue: { id: string; level: number }[] = [];

      // 找到根节点（没有父节点的节点）
      nodes.forEach(node => {
        if (node.parents.length === 0) {
          queue.push({ id: node.id, level: 0 });
        }
      });

      while (queue.length > 0) {
        const { id, level } = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);

        const node = nodeMap.get(id);
        if (node) {
          node.level = level;
          node.children.forEach(childId => {
            queue.push({ id: childId, level: level + 1 });
          });
        }
      }
    };

    calculateLevels();

    return { nodes, links };
  }, [visibleAnalysis]);

  // 渲染论证地图
  useEffect(() => {
    if (!svgRef.current || !argumentData.nodes.length) return;
    
    // 如果数据没有真正改变，不重新渲染
    if (!hasDataChanged) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    

    // 创建主容器组，所有元素都在这个组中
    const g = svg.append("g");

    // 添加缩放功能
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);
    zoomRef.current = zoom as any;

    // 创建力导向布局
    const simulation = d3.forceSimulation(argumentData.nodes)
      .force("link", d3.forceLink(argumentData.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => Math.max(20, d.strength / 2)));

    // 创建连接线 - 在g组中
    const link = g.append("g")
      .selectAll("line")
      .data(argumentData.links)
      .enter().append("line")
      .attr("stroke", (d: any) => {
        if (d.type === 'anchor-connection') {
          return "#9c27b0"; // 紫色
        }
        return d.type === 'attack' ? "#ff4444" : "#44aa44";
      })
      .attr("stroke-width", (d: any) => {
        if (d.type === 'anchor-connection') {
          return 4; // 锚点连接线更粗
        }
        return 2;
      })
      .attr("stroke-dasharray", (d: any) => {
        if (d.type === 'anchor-connection') {
          return "none"; // 锚点连接线是实线
        }
        return d.type === 'attack' ? "5,5" : "none";
      });

    // 创建在线中间的箭头
    const arrow = g.append("g")
      .selectAll("path")
      .data(argumentData.links.filter((d: any) => d.type !== 'anchor-connection')) // 过滤掉锚点连接线
      .enter().append("path")
      .attr("d", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const midX = d.source.x + dx * 0.5;
        const midY = d.source.y + dy * 0.5;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 8;
        const arrowAngle = Math.PI / 6;
        
        const x1 = midX - arrowLength * Math.cos(angle - arrowAngle);
        const y1 = midY - arrowLength * Math.sin(angle - arrowAngle);
        const x2 = midX;
        const y2 = midY;
        const x3 = midX - arrowLength * Math.cos(angle + arrowAngle);
        const y3 = midY - arrowLength * Math.sin(angle + arrowAngle);
        
        return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`;
      })
      .attr("stroke", (d: any) => d.type === 'attack' ? "#ff4444" : "#44aa44")
      .attr("stroke-width", 2)
      .attr("fill", "none");

    // 创建节点组 - 在g组中
    const node = g.append("g")
      .selectAll("g")
      .data(argumentData.nodes)
      .enter().append("g")
      .attr("cursor", "pointer")
      .on("click", (_, d: any) => {
        onNodeSelect?.(d.id);
      });

    // 添加节点圆圈 - 正方蓝色，反方红色
    node.append("circle")
      .attr("r", (d: any) => {
        if (d.isAnchor) {
          return Math.max(25, Math.min(40, d.value / 2.5)); // 锚点根据分数动态变化
        }
        return Math.max(20, Math.min(50, d.value / 3));
      })
      .attr("fill", (d: any) => {
        if (d.isAnchor) {
          return d.side === 'left' ? "#1976d2" : "#d32f2f"; // 锚点使用深色
        }
        return d.side === 'left' ? "#e3f2fd" : "#ffebee";
      })
      .attr("stroke", (d: any) => {
        if (selectedId === d.id) return "#FFD700";
        if (d.isAnchor) {
          return d.side === 'left' ? "#0d47a1" : "#b71c1c"; // 锚点使用更深的边框
        }
        return d.side === 'left' ? "#1976d2" : "#d32f2f";
      })
      .attr("stroke-width", (d: any) => {
        if (selectedId === d.id) return 3;
        if (d.isAnchor) return 4; // 锚点边框更粗
        return 2;
      })
      .attr("opacity", (d: any) => d.isAnchor ? 1.0 : 0.9);

    // 添加节点文本 - 使用summary，支持换行
    node.append("text")
      .text((d: any) => d.summary || "论证")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.5em")
      .attr("font-size", (d: any) => d.isAnchor ? "12px" : "9px")
      .attr("font-weight", (d: any) => d.isAnchor ? "bold" : "normal")
      .attr("fill", (d: any) => d.isAnchor ? "white" : "black")
      .style("pointer-events", "none")
      .each(function(d: any) {
        const text = d3.select(this);
        const words = (d.summary || "论证").split(/(?<=[\u4e00-\u9fa5])|(?<=[a-zA-Z])/);
        
        const maxWidth = Math.max(25, Math.min(60, d.value / 3)) * 1.8;
        
        text.text(null);
        
        let line = '';
        let lineNumber = 0;
        const maxLines = 4;
        
        for (let i = 0; i < words.length && lineNumber < maxLines; i++) {
          const testLine = line + words[i];
          const testWidth = text.node()?.getComputedTextLength() || 0;
          
          if (testWidth > maxWidth && line !== '') {
            text.append("tspan")
              .attr("x", 0)
              .attr("dy", lineNumber === 0 ? "0em" : "1.1em")
              .text(line);
            line = words[i];
            lineNumber++;
          } else {
            line = testLine;
          }
        }
        
        if (line && lineNumber < maxLines) {
          text.append("tspan")
            .attr("x", 0)
            .attr("dy", lineNumber === 0 ? "0em" : "1.1em")
            .text(line);
        }
      });

    // 添加强度标签
    node.append("text")
      .text((d: any) => d.isAnchor ? Math.round(d.value) : Math.round(d.value))
      .attr("text-anchor", "middle")
      .attr("dy", "1.5em")
      .attr("font-size", (d: any) => d.isAnchor ? "11px" : "9px")
      .attr("font-weight", (d: any) => d.isAnchor ? "bold" : "normal")
      .attr("fill", (d: any) => d.isAnchor ? "white" : "black")
      .style("pointer-events", "none");

    // 更新位置
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      arrow.attr("d", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const midX = d.source.x + dx * 0.5;
        const midY = d.source.y + dy * 0.5;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 8;
        const arrowAngle = Math.PI / 6;
        
        const x1 = midX - arrowLength * Math.cos(angle - arrowAngle);
        const y1 = midY - arrowLength * Math.sin(angle - arrowAngle);
        const x2 = midX;
        const y2 = midY;
        const x3 = midX - arrowLength * Math.cos(angle + arrowAngle);
        const y3 = midY - arrowLength * Math.sin(angle + arrowAngle);
        
        return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`;
      });

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // 添加拖拽功能
    node.call(d3.drag<any, any>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }));

    return () => {
      simulation.stop();
    };
  }, [argumentData, selectedId, onNodeSelect]);

  if (!visibleAnalysis.length) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#666',
        fontSize: '14px',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div>暂无论证数据</div>
        <div style={{ fontSize: '12px', color: '#999' }}>
          分析数据: {analysis.length} 条, 当前时间: {currentTime}s
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ background: '#f8f9fa' }}
      />
      {/* 缩放控制 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        zIndex: 10
      }}>
        <button
          onClick={() => {
            if (zoomRef.current) {
              const svg = d3.select(svgRef.current);
              const currentTransform = d3.zoomTransform(svg.node() as any);
              svg.transition().duration(300).call(
                zoomRef.current.transform as any,
                currentTransform.scale(currentTransform.k * 1.2)
              );
            }
          }}
          style={{
            width: '30px',
            height: '30px',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          +
        </button>
        <button
          onClick={() => {
            if (zoomRef.current) {
              const svg = d3.select(svgRef.current);
              const currentTransform = d3.zoomTransform(svg.node() as any);
              svg.transition().duration(300).call(
                zoomRef.current.transform as any,
                currentTransform.scale(currentTransform.k * 0.8)
              );
            }
          }}
          style={{
            width: '30px',
            height: '30px',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          -
        </button>
        <button
          onClick={() => {
            if (zoomRef.current) {
              const svg = d3.select(svgRef.current);
              svg.transition().duration(300).call(
                zoomRef.current.transform as any,
                d3.zoomIdentity
              );
            }
          }}
          style={{
            width: '30px',
            height: '30px',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ⌂
        </button>
      </div>
      {/* 图例 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(255,255,255,0.9)',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 10
      }}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>图例</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#1976d2' }}></div>
          <span>正方</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#d32f2f' }}></div>
          <span>反方</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
          <div style={{ width: '20px', height: '2px', background: '#44aa44' }}></div>
          <span>支持关系</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '20px', height: '2px', background: '#ff4444', borderTop: '2px dashed #ff4444' }}></div>
          <span>攻击关系</span>
        </div>
      </div>
    </div>
  );
};

export default ArgumentMap; 